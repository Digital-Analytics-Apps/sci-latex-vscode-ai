import fs from 'fs/promises';
import path from 'path';
import { env } from '../../config/env';
import { prisma } from '../../db/prisma';
import { ITasksRepository, PrismaTasksRepository } from '../../repositories/tasks.repository';
import { K8sPodManagerService } from '../../infra/k8s/k8s-pod-manager.service';

export interface CreateTaskDTO {
  projectId: string;
  assignedToId: string;
  title: string;
  dueDate?: string;
}

export class TasksService {
  constructor(
    private tasksRepository: ITasksRepository = new PrismaTasksRepository(),
    private k8sPodManager: K8sPodManagerService = new K8sPodManagerService()
  ) {}

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
    const task = await this.tasksRepository.create({
      projectId: dto.projectId,
      assignedToId: dto.assignedToId,
      title: dto.title,
      branchName: 'pending',
      dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
      status: 'NOT_STARTED',
    });

    const branchName = this.generateTaskBranchName(dto.title, task.id);

    // Atualiza a Task com o nome final da branch
    const updatedTask = await this.tasksRepository.update(task.id, {
      branchName,
    });

    return updatedTask;
  }

  // 2. Listar tarefas do projeto
  async getTasksByProject(projectId: string, assignedToId?: string) {
    return this.tasksRepository.findMany({ projectId, assignedToId });
  }

  // 3. Ativar/Iniciar o Workspace orientado a uma Task
  async startTaskWorkspace(projectId: string, taskId: string, userId: string) {
    const task = await this.tasksRepository.findById(taskId);

    if (!task || task.projectId !== projectId) {
      throw new Error('TASK_NOT_FOUND: A tarefa especificada não foi encontrada no projeto.');
    }

    // Garante a existência do diretório do repositório no host para o usuário
    const projectBaseDir = path.resolve(env.STORAGE_PATH, 'projects', projectId);
    const userWorkspaceDir = path.resolve(env.STORAGE_PATH, 'projects', projectId, 'users', userId);
    await fs.mkdir(userWorkspaceDir, { recursive: true, mode: 0o777 });

    const userMainTex = path.join(userWorkspaceDir, 'main.tex');
    const hasUserFiles = await fs
      .access(userMainTex)
      .then(() => true)
      .catch(() => false);
    if (
      !hasUserFiles &&
      (await fs
        .access(projectBaseDir)
        .then(() => true)
        .catch(() => false))
    ) {
      await fs.cp(projectBaseDir, userWorkspaceDir, { recursive: true }).catch(() => {});
    }

    // Provisiona / reivindica o Pod Kubernetes dedicado ao par projectId + userId
    const podResult = await this.k8sPodManager.claimPodForProject(projectId, userId);

    // Atualiza ou cria o registro do Workspace do usuário em estado READY
    const workspace = await prisma.workspace.upsert({
      where: { projectId_userId: { projectId, userId } },
      create: {
        projectId,
        userId,
        taskId,
        podName: podResult.podName,
        status: 'READY',
      },
      update: {
        taskId,
        podName: podResult.podName,
        status: 'READY',
      },
    });

    // Se o status da task ainda era NOT_STARTED, avança para IN_PROGRESS
    if (task.status === 'NOT_STARTED') {
      await this.tasksRepository.update(taskId, {
        status: 'IN_PROGRESS',
      });
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
