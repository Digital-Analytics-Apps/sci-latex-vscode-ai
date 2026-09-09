import * as k8s from '@kubernetes/client-node';
import { env } from '../../config/env';

export interface PodClaimResult {
  podName: string;
  pvcName: string;
  status: 'claimed_from_pool' | 'created_on_demand' | 'fallback_mode';
  codeServerUrl: string;
}

export class K8sPodManagerService {
  private k8sApi: k8s.CoreV1Api | null = null;
  private isK8sAvailable = false;
  private namespace = 'default';

  constructor() {
    this.initK8sClient();
  }

  private initK8sClient() {
    if (env.NODE_ENV === 'test') {
      this.isK8sAvailable = false;
      return;
    }

    try {
      const kc = new k8s.KubeConfig();
      kc.loadFromDefault();
      this.k8sApi = kc.makeApiClient(k8s.CoreV1Api);
      this.isK8sAvailable = true;
    } catch {
      console.log(
        'ℹ️ Local K8s/KinD cluster not detected. K8sPodManager operating in Fallback Mode.'
      );
      this.isK8sAvailable = false;
    }
  }

  // 1. Garante o Warm Standby Pool (Pods pré-aquecidos para latência 0ms)
  async ensureWarmPool(minWarmPods = 1): Promise<void> {
    if (!this.isK8sAvailable || !this.k8sApi) return;

    try {
      const podsRes = await this.k8sApi.listNamespacedPod({
        namespace: this.namespace,
        labelSelector: 'app.kubernetes.io/part-of=sci-latex-vscode,role=warm-standby',
      });

      const currentWarmPods = podsRes.items.filter((pod) => pod.status?.phase === 'Running');

      if (currentWarmPods.length < minWarmPods) {
        const needed = minWarmPods - currentWarmPods.length;
        for (let i = 0; i < needed; i++) {
          await this.createWarmStandbyPod();
        }
      }
    } catch (err: any) {
      console.warn('⚠️ K8s Warm Pool check warning:', err.message || err);
    }
  }

  private async createWarmStandbyPod(): Promise<string> {
    if (!this.k8sApi) throw new Error('K8S_CLIENT_NOT_INITIALIZED');

    const podName = `workspace-warm-${Date.now().toString(36)}`;
    const podManifest: k8s.V1Pod = {
      apiVersion: 'v1',
      kind: 'Pod',
      metadata: {
        name: podName,
        namespace: this.namespace,
        labels: {
          'app.kubernetes.io/part-of': 'sci-latex-vscode',
          component: 'code-server',
          role: 'warm-standby',
        },
      },
      spec: {
        containers: [
          {
            name: 'code-server',
            image: 'sci-latex-vscode-code-server:latest',
            imagePullPolicy: 'IfNotPresent',
            ports: [{ containerPort: 8080, name: 'http' }],
            resources: {
              requests: { cpu: '100m', memory: '256Mi' },
              limits: { cpu: '1', memory: '1Gi' },
            },
          },
        ],
      },
    };

    await this.k8sApi.createNamespacedPod({
      namespace: this.namespace,
      body: podManifest,
    });

    return podName;
  }

  // 2. Garante a existência do PVC dedicado do Projeto (`pvc-project-<projectId>`)
  async ensureProjectPVC(projectId: string): Promise<string> {
    const pvcName = `pvc-project-${projectId.slice(0, 18)}`;

    if (!this.isK8sAvailable || !this.k8sApi) {
      return pvcName;
    }

    try {
      await this.k8sApi.readNamespacedPersistentVolumeClaim({
        name: pvcName,
        namespace: this.namespace,
      });
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
        await this.k8sApi.createNamespacedPersistentVolumeClaim({
          namespace: this.namespace,
          body: pvcManifest,
        });
      } catch (err: any) {
        console.warn(`⚠️ Warning creating PVC ${pvcName}:`, err.message || err);
      }
      return pvcName;
    }
  }

  // 3. Reivindica um Pod do Warm Pool ou cria um Pod dedicado montando o PVC do projeto
  async claimPodForProject(projectId: string, userId: string): Promise<PodClaimResult> {
    const pvcName = await this.ensureProjectPVC(projectId);

    if (!this.isK8sAvailable || !this.k8sApi) {
      return {
        podName: `local-fallback-${projectId}`,
        pvcName,
        status: 'fallback_mode',
        codeServerUrl: env.CODE_SERVER_URL,
      };
    }

    try {
      // Buscar se já existe um Pod ativo dedicado a esse projeto
      const existingPods = await this.k8sApi.listNamespacedPod({
        namespace: this.namespace,
        labelSelector: `app.kubernetes.io/part-of=sci-latex-vscode,projectId=${projectId}`,
      });

      const activePod = existingPods.items.find((pod) => pod.status?.phase === 'Running');
      if (activePod && activePod.metadata?.name) {
        return {
          podName: activePod.metadata.name,
          pvcName,
          status: 'claimed_from_pool',
          codeServerUrl: env.CODE_SERVER_URL,
        };
      }

      // Buscar se existe um Pod livre no Warm Standby Pool
      const warmPodsRes = await this.k8sApi.listNamespacedPod({
        namespace: this.namespace,
        labelSelector: 'app.kubernetes.io/part-of=sci-latex-vscode,role=warm-standby',
      });

      const warmPod = warmPodsRes.items.find((pod) => pod.status?.phase === 'Running');

      if (warmPod && warmPod.metadata?.name) {
        // Reivindicar o Pod do Warm Standby Pool para o projeto
        const claimedPodName = warmPod.metadata.name;
        await this.k8sApi.patchNamespacedPod({
          name: claimedPodName,
          namespace: this.namespace,
          body: {
            metadata: {
              labels: {
                role: 'project-workspace',
                projectId,
                claimedBy: userId,
              },
            },
          },
        });

        // Dispara em background a reposição de +1 Pod Standby para o Warm Pool
        this.ensureWarmPool(1).catch(() => {});

        return {
          podName: claimedPodName,
          pvcName,
          status: 'claimed_from_pool',
          codeServerUrl: env.CODE_SERVER_URL,
        };
      }

      // Se o Warm Pool estiver vazio, cria o Pod sob demanda
      const newPodName = `workspace-${projectId.slice(0, 8)}-${Date.now().toString(36)}`;
      const podManifest: k8s.V1Pod = {
        apiVersion: 'v1',
        kind: 'Pod',
        metadata: {
          name: newPodName,
          namespace: this.namespace,
          labels: {
            'app.kubernetes.io/part-of': 'sci-latex-vscode',
            component: 'code-server',
            role: 'project-workspace',
            projectId,
            claimedBy: userId,
          },
        },
        spec: {
          containers: [
            {
              name: 'code-server',
              image: 'sci-latex-vscode-code-server:latest',
              imagePullPolicy: 'IfNotPresent',
              ports: [{ containerPort: 8080, name: 'http' }],
              volumeMounts: [
                {
                  name: 'project-storage',
                  mountPath: `/home/coder/storage/projects/${projectId}`,
                },
              ],
            },
          ],
          volumes: [
            {
              name: 'project-storage',
              persistentVolumeClaim: { claimName: pvcName },
            },
          ],
        },
      };

      await this.k8sApi.createNamespacedPod({
        namespace: this.namespace,
        body: podManifest,
      });

      // Dispara em background a reposição de +1 Pod Standby para o Warm Pool
      this.ensureWarmPool(1).catch(() => {});

      return {
        podName: newPodName,
        pvcName,
        status: 'created_on_demand',
        codeServerUrl: env.CODE_SERVER_URL,
      };
    } catch (err: any) {
      console.warn('⚠️ Error claiming K8s pod:', err.message || err);
      return {
        podName: `fallback-${projectId}`,
        pvcName,
        status: 'fallback_mode',
        codeServerUrl: env.CODE_SERVER_URL,
      };
    }
  }

  // 4. Limpeza Inteligente do PVC após confirmação de push/merge no GitHub ou deleção
  async cleanProjectPVC(projectId: string): Promise<void> {
    if (!this.isK8sAvailable || !this.k8sApi) return;

    const pvcName = `pvc-project-${projectId.slice(0, 18)}`;
    try {
      await this.k8sApi.deleteNamespacedPersistentVolumeClaim({
        name: pvcName,
        namespace: this.namespace,
      });
      console.log(`🧹 PVC ${pvcName} limpo com sucesso após confirmação no GitHub.`);
    } catch (err: any) {
      console.warn(`⚠️ Error cleaning PVC ${pvcName}:`, err.message || err);
    }
  }
}
