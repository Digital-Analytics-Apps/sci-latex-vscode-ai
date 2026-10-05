import { exec } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';
import { TaskStatus } from '@prisma/client';
import { env } from '../../config/env';
import { prisma } from '../../db/prisma';
import { K8sPodManagerService } from '../../infra/k8s/k8s-pod-manager.service';
import { ITasksRepository, PrismaTasksRepository } from '../../repositories/tasks.repository';
import { editorProxyService } from '../editor-proxy/editor-proxy.service';
import { redisService } from '../../infra/redis/redis.service';

const execAsync = promisify(exec);

export interface CreateTaskDTO {
  projectId: string;
  assignedToId?: string;
  title: string;
  dueDate?: string;
  stageId?: string;
}

export class TasksService {
  constructor(
    private readonly tasksRepository: ITasksRepository = new PrismaTasksRepository(),
    private readonly k8sPodManager: K8sPodManagerService = new K8sPodManagerService()
  ) {}

  async claimTask(projectId: string, taskId: string, userId: string) {
    const task = await this.tasksRepository.findById(taskId);
    if (task?.projectId !== projectId) {
      throw new Error('TASK_NOT_FOUND: Tarefa não encontrada.');
    }
    return this.tasksRepository.update(taskId, { assignedToId: userId });
  }

  async unclaimTask(projectId: string, taskId: string) {
    const task = await this.tasksRepository.findById(taskId);
    if (task?.projectId !== projectId) {
      throw new Error('TASK_NOT_FOUND: Tarefa não encontrada.');
    }
    return this.tasksRepository.update(taskId, { assignedToId: null });
  }

  // Gera o nome amigável da branch da task: task/<slug>-<uuid>
  private generateTaskBranchName(title: string, taskId: string): string {
    const slug = title
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/[\s_]+/g, '-')
      .replace(/-+/g, '-')
      .slice(0, 30)
      .replace(/^-+|-+$/g, '');

    const shortId = taskId.slice(0, 6);
    return `task/${slug || 'item'}-${shortId}`;
  }

  // 1. Criar nova Task associada ao autor
  async createTask(dto: CreateTaskDTO) {
    if (!dto.stageId) {
      throw new Error(
        'TASK_STAGE_REQUIRED: A sub-tarefa deve obrigatoriamente estar associada a uma etapa de escrita.'
      );
    }

    if (dto.dueDate) {
      const parentStage = await prisma.projectStage.findUnique({ where: { id: dto.stageId } });
      if (parentStage) {
        const stageMaxDate = parentStage.plannedCompletionDate || parentStage.plannedEndAt;
        if (stageMaxDate && new Date(dto.dueDate) > new Date(stageMaxDate)) {
          throw new Error(
            'TASK_DUE_DATE_EXCEEDS_STAGE: A data limite da sub-tarefa não pode ser posterior à data limite da etapa.'
          );
        }
      }
    }

    const tempId = crypto.randomUUID();
    const branchName = this.generateTaskBranchName(dto.title, tempId);

    const task = await this.tasksRepository.create({
      projectId: dto.projectId,
      assignedToId: dto.assignedToId,
      title: dto.title,
      branchName,
      dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
      status: TaskStatus.NOT_STARTED,
      stageId: dto.stageId,
    });

    return task;
  }

  // 2. Listar tarefas do projeto
  async getTasksByProject(
    projectId: string,
    assignedToId?: string,
    filters?: { status?: any; search?: string; stageId?: string }
  ) {
    const localTasks = await this.tasksRepository.findMany({
      projectId,
      assignedToId,
      status: filters?.status,
      search: filters?.search,
      stageId: filters?.stageId,
    });

    const presenceMap = await redisService.getTaskPresenceMap(projectId);
    const activeUserIds = Array.from(new Set(Array.from(presenceMap.values())));
    const activeUsersMap = new Map<string, { id: string; name: string }>();

    if (activeUserIds.length > 0) {
      const dbUsers = await prisma.user
        .findMany({
          where: { id: { in: activeUserIds } },
          select: { id: true, name: true },
        })
        .catch(() => []);
      for (const u of dbUsers) {
        activeUsersMap.set(u.id, u);
      }
    }

    const allProjectTasks = await this.tasksRepository.findMany({ projectId });
    const stageTasksMap = new Map<string, typeof allProjectTasks>();

    for (const t of allProjectTasks) {
      if (t.stageId) {
        const list = stageTasksMap.get(t.stageId) || [];
        list.push(t);
        stageTasksMap.set(t.stageId, list);
      }
    }

    const blockedTaskIdSet = new Set<string>();
    for (const [, list] of stageTasksMap) {
      const sorted = [...list].sort(
        (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );
      let foundUnmerged = false;
      for (const t of sorted) {
        if (foundUnmerged) {
          blockedTaskIdSet.add(t.id);
        } else if (t.status !== TaskStatus.MERGED) {
          foundUnmerged = true;
        }
      }
    }

    return localTasks.map((t) => {
      const activeUserId = presenceMap.get(t.id);
      const activeUser = activeUserId ? activeUsersMap.get(activeUserId) : null;
      return {
        ...t,
        isOccupied: Boolean(activeUserId),
        occupiedBy: activeUser ? { id: activeUser.id, name: activeUser.name } : null,
        isBlockedByPrevious: blockedTaskIdSet.has(t.id),
      };
    });
  }

  // 3. Ativar/Iniciar o Workspace orientado a uma Task
  async startTaskWorkspace(projectId: string, taskId: string, userId: string) {
    const activeUserId = await redisService.findActiveUserForTask(projectId, taskId);
    if (activeUserId && activeUserId !== userId) {
      const activeUser = await prisma.user
        .findUnique({
          where: { id: activeUserId },
          select: { name: true },
        })
        .catch(() => null);
      const activeName = activeUser?.name || 'outro usuário';
      throw new Error(
        `TASK_WORKSPACE_OCCUPIED: Esta tarefa está sendo editada por ${activeName} no momento.`
      );
    }

    let task = await this.tasksRepository.findById(taskId);

    if (!task || task.projectId !== projectId) {
      throw new Error('TASK_NOT_FOUND: A tarefa especificada não foi encontrada no projeto.');
    }

    // Governança de Assinatura: Um usuário só pode iniciar o workspace se ele tiver assinado a tarefa
    if (task.assignedToId !== userId) {
      if (!task.assignedToId) {
        throw new Error(
          'TASK_NOT_CLAIMED: Um usuário só pode iniciar o workspace se tiver assinado a tarefa. Assine a tarefa primeiro.'
        );
      }
      throw new Error(
        'TASK_CLAIMED_BY_OTHER: Esta tarefa está atribuída a outro membro. Apenas o autor responsável pode iniciar o workspace.'
      );
    }

    // Trava Sequencial: Verifica se existe alguma sub-tarefa anterior na mesma etapa que não foi mesclada
    if (task.stageId) {
      const stageTasks = await prisma.task.findMany({
        where: { projectId, stageId: task.stageId },
        orderBy: { createdAt: 'asc' },
      });
      const taskIndex = stageTasks.findIndex((t) => t.id === task!.id);
      if (taskIndex > 0) {
        const previousUnmerged = stageTasks
          .slice(0, taskIndex)
          .find((t) => t.status !== TaskStatus.MERGED);
        if (previousUnmerged) {
          throw new Error(
            'TASK_BLOCKED_BY_PREVIOUS: A tarefa anterior desta etapa precisa ser finalizada e mesclada antes de iniciar esta.'
          );
        }
      }
    }

    // Garante a existência do repositório base do projeto
    const project = await prisma.project.findUnique({ where: { id: projectId } });
    const projectBaseDir = path.resolve(env.STORAGE_PATH, 'projects', projectId);
    await fs.mkdir(projectBaseDir, { recursive: true, mode: 0o777 });

    // Invariante 5: Se task.branchName não existir no repositório base do projeto, cria a partir do SHA explícito de dev
    try {
      const gitDir = path.join(projectBaseDir, '.git');
      const hasGit = await fs
        .access(gitDir)
        .then(() => true)
        .catch(() => false);
      if (hasGit) {
        const branchCheck = await execAsync(
          `git -C "${projectBaseDir}" rev-parse --verify "${task.branchName}"`
        ).catch(() => null);

        if (!branchCheck) {
          const devShaRes = await execAsync(`git -C "${projectBaseDir}" rev-parse dev`).catch(
            () => null
          );
          const devSha = devShaRes?.stdout?.trim();
          if (devSha) {
            await execAsync(
              `git -C "${projectBaseDir}" branch "${task.branchName}" "${devSha}"`
            ).catch(() => {});
          }
        }
      }
    } catch {
      // Ignora erro de preparação de branch no repositório base
    }

    // Invariante 3 & 4: Inicializa o diretório isolado do workspace da tarefa (projects/P/users/U/stages/S/tasks/T)
    await editorProxyService.ensureTaskWorkspace({
      projectId,
      userId,
      taskId: task.id,
      stageId: task.stageId || undefined,
      branchName: task.branchName,
      gitRepoPath: project?.gitRepoPath,
    });

    let podResult: any;
    let workspaceStatus: 'READY' | 'ERROR' = 'READY';

    try {
      // Reivindica o Pod atômico montado no subcaminho exclusivo da tarefa
      podResult = await this.k8sPodManager.claimPodForTask(
        projectId,
        userId,
        task.id,
        task.stageId || undefined
      );
    } catch (podErr) {
      console.warn(`⚠️ Error claiming Pod for task ${task.id}:`, podErr);
      podResult = { podName: null };
      workspaceStatus = 'ERROR';
    }

    const stageId = task.stageId || 'general';

    // Invariante 2 & 7: Upsert do Workspace na chave única composta (projectId, userId, stageId, taskId)
    const workspace = await prisma.workspace.upsert({
      where: {
        projectId_userId_stageId_taskId: {
          projectId,
          userId,
          stageId,
          taskId: task.id,
        },
      },
      create: {
        projectId,
        userId,
        stageId,
        taskId: task.id,
        podName: podResult.podName || null,
        status: workspaceStatus,
      },
      update: {
        podName: podResult.podName || undefined,
        status: workspaceStatus,
        updatedAt: new Date(),
      },
    });

    // Se o status da task ainda era NOT_STARTED, avança para IN_PROGRESS e salva a data de início real no banco
    const now = new Date();
    if (task.status === TaskStatus.NOT_STARTED) {
      task = await this.tasksRepository.update(task.id, {
        status: TaskStatus.IN_PROGRESS,
        startedAt: task.startedAt ?? now,
        startDate: task.startDate ?? now,
      });
    }

    // Propaga o início para a Etapa Pai (ProjectStage) no banco de dados se ela ainda estiver NOT_STARTED
    if (task.stageId) {
      const parentStage = await prisma.projectStage.findUnique({ where: { id: task.stageId } });
      if (parentStage?.status === 'NOT_STARTED') {
        await prisma.projectStage.update({
          where: { id: task.stageId },
          data: {
            status: 'IN_PROGRESS',
            startedAt: parentStage.startedAt ?? now,
          },
        });
      }
    }

    const codeServerUrl = `${podResult.codeServerUrl}/?folder=/home/coder/project`;

    return {
      task,
      workspace,
      podResult,
      codeServerUrl,
    };
  }
}

export const tasksService = new TasksService();
