import fs from 'node:fs';
import * as k8s from '@kubernetes/client-node';
import { env } from '../../config/env';
import { redisService } from '../redis/redis.service';
import { prisma } from '../../db/prisma';

export interface PodClaimResult {
  podName: string;
  pvcName: string;
  status: 'claimed_from_pool' | 'created_on_demand' | 'fallback_mode';
  codeServerUrl: string;
}

export class K8sPodManagerService {
  private k8sApi: k8s.CoreV1Api | null = null;
  private isK8sAvailable = false;
  private readonly namespace = 'default';

  private getK8sApiClient(): k8s.CoreV1Api | null {
    if (
      env.NODE_ENV === 'test' ||
      process.env.NODE_ENV === 'test' ||
      process.env.VITEST === 'true'
    ) {
      this.isK8sAvailable = false;
      return null;
    }

    try {
      const kc = new k8s.KubeConfig();
      kc.loadFromDefault();

      const cluster = kc.getCurrentCluster();
      const inContainer = fs.existsSync('/.dockerenv') || process.env.DOCKER_CONTAINER === 'true';
      if (cluster && inContainer) {
        // Quando executando no container Docker, conecta diretamente ao control-plane na rede docker 'kind'
        (cluster as any).server = 'https://sci-latex-kind-control-plane:6443';
        (cluster as any).skipTLSVerify = true;
      }

      this.k8sApi = kc.makeApiClient(k8s.CoreV1Api);
      this.isK8sAvailable = true;
      return this.k8sApi;
    } catch {
      this.isK8sAvailable = false;
      this.k8sApi = null;
      return null;
    }
  }

  // 1. Garante o Warm Standby Pool (Mantém exatamente targetWarmPods = 1 Pod de reserva)
  async ensureWarmPool(targetWarmPods = 1): Promise<void> {
    const k8sApi = this.getK8sApiClient();
    if (!k8sApi) return;

    try {
      const podsRes = await k8sApi.listNamespacedPod(
        this.namespace,
        undefined,
        undefined,
        undefined,
        undefined,
        'app.kubernetes.io/part-of=sci-latex-vscode,role=warm-standby'
      );

      const currentWarmPods = (podsRes.body.items || []).filter(
        (pod) => pod.status?.phase === 'Running' || pod.status?.phase === 'Pending'
      );

      if (currentWarmPods.length < targetWarmPods) {
        const needed = targetWarmPods - currentWarmPods.length;
        for (let i = 0; i < needed; i++) {
          await this.createWarmStandbyPod();
        }
      } else if (currentWarmPods.length > targetWarmPods) {
        // Se houver Pods reservas em excesso, remove os excedentes para manter exatamente 1 Warm Pod
        const excess = currentWarmPods.slice(targetWarmPods);
        for (const pod of excess) {
          if (pod.metadata?.name) {
            await k8sApi.deleteNamespacedPod(pod.metadata.name, this.namespace).catch(() => {});
            console.log(
              `🧹 Pod reserva excedente ${pod.metadata.name} removido para manter Warm Pool = ${targetWarmPods}`
            );
          }
        }
      }
    } catch (err: any) {
      console.warn('⚠️ K8s Warm Pool check warning:', err.message || err);
    }
  }

  private async createWarmStandbyPod(): Promise<string> {
    const k8sApi = this.getK8sApiClient();
    if (!k8sApi) throw new Error('K8S_CLIENT_NOT_INITIALIZED');

    const podName = `workspace-warm-${Date.now().toString(36)}`;
    const podManifest: k8s.V1Pod = {
      apiVersion: 'v1',
      kind: 'Pod',
      metadata: {
        name: podName,
        namespace: this.namespace,
        labels: {
          'app.kubernetes.io/part-of': 'sci-latex-vscode',
          component: 'code-server-warm',
          role: 'warm-standby',
        },
      },
      spec: {
        containers: [
          {
            name: 'code-server',
            image: 'sci-latex-vscode-code-server:latest',
            imagePullPolicy: 'IfNotPresent',
            args: [
              '--auth',
              'none',
              '--disable-telemetry',
              '--disable-workspace-trust',
              '/home/coder/project',
            ],
            ports: [{ containerPort: 8080, name: 'http' }],
            volumeMounts: [
              {
                name: 'host-storage',
                mountPath: '/home/coder/project',
                subPath: 'projects/default-warm-standby',
              },
            ],
            resources: {
              requests: { cpu: '100m', memory: '256Mi' },
              limits: { cpu: '1', memory: '1Gi' },
            },
          },
        ],
        volumes: [
          {
            name: 'host-storage',
            hostPath: { path: '/home/coder/storage' },
          },
        ],
      },
    };

    await k8sApi.createNamespacedPod(this.namespace, podManifest);

    return podName;
  }

  // 2. Garante a existência do PVC dedicado do Projeto (`pvc-project-<projectId>`)
  async ensureProjectPVC(projectId: string): Promise<string> {
    const pvcName = `pvc-project-${projectId.slice(0, 18)}`;

    const k8sApi = this.getK8sApiClient();
    if (!k8sApi) {
      return pvcName;
    }

    try {
      await k8sApi.readNamespacedPersistentVolumeClaim(pvcName, this.namespace);
      return pvcName;
    } catch {
      // PVC não existe, cria o PVC dedicado do projeto
      const pvcManifest: k8s.V1PersistentVolumeClaim = {
        apiVersion: 'v1',
        kind: 'PersistentVolumeClaim',
        metadata: {
          name: pvcName,
          namespace: this.namespace,
          labels: {
            'app.kubernetes.io/part-of': 'sci-latex-vscode',
            component: 'project-storage',
            projectId,
          },
        },
        spec: {
          accessModes: ['ReadWriteOnce'],
          resources: {
            requests: { storage: '1Gi' },
          },
        },
      };

      try {
        await k8sApi.createNamespacedPersistentVolumeClaim(this.namespace, pvcManifest);
      } catch (err: any) {
        console.warn(`⚠️ Warning creating PVC ${pvcName}:`, err.message || err);
      }
      return pvcName;
    }
  }

  // Atualiza dinamicamente o selector do Service code-server-service no K8s para o Pod exclusivo (projectId, userId, taskId)
  async updateServiceSelector(projectId: string, userId?: string, taskId?: string): Promise<void> {
    const k8sApi = this.getK8sApiClient();
    if (!k8sApi) return;

    try {
      const svcRes = await k8sApi.readNamespacedService('code-server-service', this.namespace);
      const svc = svcRes.body;
      if (svc.spec) {
        const selector: Record<string, string> = {
          'app.kubernetes.io/part-of': 'sci-latex-vscode',
          component: 'code-server',
          projectId,
        };
        if (userId) selector.claimedBy = userId;
        if (taskId) selector.taskId = taskId;

        svc.spec.selector = selector;
        await k8sApi.replaceNamespacedService('code-server-service', this.namespace, svc);
        console.log(
          `🎯 Service code-server-service atualizado para apontar exclusivamente para projectId=${projectId}, userId=${userId}, taskId=${taskId}`
        );
      }
    } catch (err: any) {
      console.warn(`⚠️ Warning updating code-server-service selector:`, err.message || err);
    }
  }

  // Aguarda o Pod atingir o estado Running e Container Ready
  async waitForPodReady(podName: string, timeoutMs = 15000): Promise<boolean> {
    const k8sApi = this.getK8sApiClient();
    if (!k8sApi) return true;

    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      try {
        const res = await k8sApi.readNamespacedPod(podName, this.namespace);
        const pod = res.body;
        const isRunning = pod.status?.phase === 'Running';
        const containerReady = pod.status?.containerStatuses?.some((cs) => cs.ready);
        if (isRunning && containerReady) {
          return true;
        }
      } catch {
        // ignora falhas de leitura temporárias e re-tenta
      }
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
    return false;
  }

  // 3. Reivindica um Pod do Warm Pool ou cria um Pod dedicado montando o PVC/Volume isolado da Task do usuário
  async claimPodForTask(
    projectId: string,
    userId: string,
    taskId: string
  ): Promise<PodClaimResult> {
    const pvcName = await this.ensureProjectPVC(projectId);

    const k8sApi = this.getK8sApiClient();
    if (!k8sApi) {
      return {
        podName: `local-fallback-${projectId}-${taskId.slice(0, 6)}`,
        pvcName,
        status: 'fallback_mode',
        codeServerUrl: env.CODE_SERVER_URL,
      };
    }

    try {
      // Buscar se já existe um Pod ativo dedicado a essa tríade (projectId, userId, taskId)
      const labelSelector = `app.kubernetes.io/part-of=sci-latex-vscode,projectId=${projectId},claimedBy=${userId},taskId=${taskId}`;

      const existingPods = await k8sApi.listNamespacedPod(
        this.namespace,
        undefined,
        undefined,
        undefined,
        undefined,
        labelSelector
      );

      const activePod = (existingPods.body.items || []).find(
        (pod) => pod.status?.phase === 'Running'
      );
      if (activePod?.metadata?.name) {
        await this.updateServiceSelector(projectId, userId, taskId);
        await this.waitForPodReady(activePod.metadata.name);
        return {
          podName: activePod.metadata.name,
          pvcName,
          status: 'claimed_from_pool',
          codeServerUrl: env.CODE_SERVER_URL,
        };
      }

      // Se o Warm Pool tiver um pod livre, podemos limpar o standby antigo para criar o Pod 100% isolado da Task
      const warmPodsRes = await k8sApi.listNamespacedPod(
        this.namespace,
        undefined,
        undefined,
        undefined,
        undefined,
        'app.kubernetes.io/part-of=sci-latex-vscode,role=warm-standby'
      );

      const warmPod = (warmPodsRes.body.items || []).find((pod) => pod.status?.phase === 'Running');
      if (warmPod?.metadata?.name) {
        await k8sApi.deleteNamespacedPod(warmPod.metadata.name, this.namespace).catch(() => {});
      }

      // Define subcaminho isolado por tarefa do usuário: projects/${projectId}/users/${userId}/tasks/${taskId}
      const userTaskSubPath = `projects/${projectId}/users/${userId}/tasks/${taskId}`;

      // Cria o Pod sob demanda estritamente isolado da Task
      const userSuffix = userId ? userId.slice(0, 6) : 'user';
      const taskSuffix = taskId ? taskId.slice(0, 6) : 'task';
      const newPodName = `workspace-${projectId.slice(0, 6)}-${userSuffix}-${taskSuffix}-${Date.now().toString(36)}`;
      const podManifest: k8s.V1Pod = {
        apiVersion: 'v1',
        kind: 'Pod',
        metadata: {
          name: newPodName,
          namespace: this.namespace,
          labels: {
            'app.kubernetes.io/part-of': 'sci-latex-vscode',
            component: 'code-server',
            role: 'user-workspace',
            projectId,
            claimedBy: userId || 'anonymous',
            taskId,
          },
        },
        spec: {
          containers: [
            {
              name: 'code-server',
              image: 'sci-latex-vscode-code-server:latest',
              imagePullPolicy: 'IfNotPresent',
              args: [
                '--auth',
                'none',
                '--disable-telemetry',
                '--disable-workspace-trust',
                '/home/coder/project',
              ],
              ports: [{ containerPort: 8080, name: 'http' }],
              volumeMounts: [
                {
                  name: 'host-storage',
                  mountPath: '/home/coder/project',
                  subPath: userTaskSubPath,
                },
              ],
            },
          ],
          volumes: [
            {
              name: 'host-storage',
              hostPath: { path: '/home/coder/storage' },
            },
          ],
        },
      };

      await k8sApi.createNamespacedPod(this.namespace, podManifest);

      // Atualiza o Service selector e aguarda a prontidão do novo pod
      await this.updateServiceSelector(projectId, userId, taskId);
      await this.waitForPodReady(newPodName);

      // Dispara em background a reposição de +1 Pod Standby para o Warm Pool
      this.ensureWarmPool(1).catch(() => {});

      return {
        podName: newPodName,
        pvcName,
        status: 'created_on_demand',
        codeServerUrl: env.CODE_SERVER_URL,
      };
    } catch (err: any) {
      console.warn('⚠️ Error claiming K8s pod for task:', err.message || err);
      return {
        podName: `fallback-${projectId}-${taskId.slice(0, 6)}`,
        pvcName,
        status: 'fallback_mode',
        codeServerUrl: env.CODE_SERVER_URL,
      };
    }
  }

  // Fallback de compatibilidade
  async claimPodForProject(
    projectId: string,
    userId: string,
    taskId?: string
  ): Promise<PodClaimResult> {
    return this.claimPodForTask(projectId, userId, taskId || 'default-task');
  }

  // 4. Libera e destrói o Pod dedicado do projeto após o usuário fechar a aba/desconectar
  async releasePodForProject(projectId: string): Promise<void> {
    const k8sApi = this.getK8sApiClient();
    if (!k8sApi) return;

    try {
      const existingPods = await k8sApi.listNamespacedPod(
        this.namespace,
        undefined,
        undefined,
        undefined,
        undefined,
        `app.kubernetes.io/part-of=sci-latex-vscode,projectId=${projectId}`
      );

      const podsToDelete = existingPods.body.items || [];
      for (const pod of podsToDelete) {
        if (pod.metadata?.name) {
          await k8sApi.deleteNamespacedPod(pod.metadata.name, this.namespace);
          console.log(
            `🧹 Pod ${pod.metadata.name} encerrado com sucesso após desconexão do usuário.`
          );
        }
      }

      // Re-valida o Warm Standby Pool para garantir exatamente 1 Pod livre na reserva
      await this.ensureWarmPool(1);
    } catch (err: any) {
      console.warn(`⚠️ Error releasing Pod for project ${projectId}:`, err.message || err);
    }
  }

  // 5. Limpeza Inteligente do PVC após confirmação de push/merge no GitHub ou deleção
  async cleanProjectPVC(projectId: string): Promise<void> {
    const k8sApi = this.getK8sApiClient();
    if (!k8sApi) return;

    const pvcName = `pvc-project-${projectId.slice(0, 18)}`;
    try {
      await k8sApi.deleteNamespacedPersistentVolumeClaim(pvcName, this.namespace);
      console.log(`🧹 PVC ${pvcName} limpo com sucesso após confirmação no GitHub.`);
    } catch (err: any) {
      console.warn(`⚠️ Error cleaning PVC ${pvcName}:`, err.message || err);
    }
  }

  // 6. Varredura e Reconciliação de Pods Órfãos baseada nas chaves TTL do Redis
  async reconcileOrphanPods(): Promise<number> {
    const k8sApi = this.getK8sApiClient();
    if (!k8sApi) return 0;

    let cleanedCount = 0;
    try {
      // Buscar todos os Pods de workspace do usuário no K8s
      const podsRes = await k8sApi.listNamespacedPod(
        this.namespace,
        undefined,
        undefined,
        undefined,
        undefined,
        'app.kubernetes.io/part-of=sci-latex-vscode,role=user-workspace'
      );

      const userPods = podsRes.body.items || [];
      for (const pod of userPods) {
        const podName = pod.metadata?.name;
        const labels = pod.metadata?.labels || {};
        const projectId = labels.projectId;
        const userId = labels.claimedBy;
        const taskId = labels.taskId || 'default-task';

        if (!podName || !projectId || !userId) continue;

        // Se o Redis não considerar essa workspace ativa (chave expirou por passar > 3 min sem heartbeat):
        const isActive = await redisService.isWorkspaceActive(projectId, userId, taskId);
        if (!isActive) {
          console.log(
            `🧹 Varredura: Pod órfão ${podName} (Projeto: ${projectId}, Task: ${taskId}) expirou no Redis. Excluindo Pod...`
          );
          await k8sApi.deleteNamespacedPod(podName, this.namespace).catch(() => {});
          cleanedCount++;

          // Atualiza o status no banco de dados para TERMINATED
          await prisma.workspace
            .updateMany({
              where: { projectId, userId, taskId },
              data: { status: 'TERMINATED', podName: null, updatedAt: new Date() },
            })
            .catch(() => {});
        }
      }

      // Garante a existência do Pod de reserva Warm Standby se necessário
      await this.ensureWarmPool(1);
    } catch (err: any) {
      console.warn('⚠️ Error during orphan pods reconciliation sweep:', err.message || err);
    }

    return cleanedCount;
  }
}
