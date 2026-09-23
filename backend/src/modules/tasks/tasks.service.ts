import { exec } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';
import { env } from '../../config/env';
import { prisma } from '../../db/prisma';
import { K8sPodManagerService } from '../../infra/k8s/k8s-pod-manager.service';
import { ITasksRepository, PrismaTasksRepository } from '../../repositories/tasks.repository';
import { editorProxyService } from '../editor-proxy/editor-proxy.service';
import {
  getGithubProvider,
  githubIntegrationService,
} from '../github-integration/github-integration.service';

import { redisService } from '../../infra/redis/redis.service';

const execAsync = promisify(exec);

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
    const integration = await prisma.githubIntegration.findFirst({
      where: { articleId: dto.projectId },
    });

    let issueNumber = 1;
    if (integration) {
      const count = await prisma.githubIssueProjection.count({
        where: { githubRepositoryId: integration.githubRepositoryId },
      });
      issueNumber = count + 1;
    }

    const slug = dto.title
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/[\s_]+/g, '-')
      .replace(/-+/g, '-')
      .slice(0, 30)
      .replace(/^-+|-+$/g, '');

    const branchName = integration
      ? `task/${issueNumber}-${slug || 'item'}`
      : this.generateTaskBranchName(dto.title, dto.projectId);

    const task = await this.tasksRepository.create({
      projectId: dto.projectId,
      assignedToId: dto.assignedToId,
      title: dto.title,
      branchName,
      dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
      status: 'NOT_STARTED',
    });

    if (integration) {
      const fakeIssueId = BigInt(Date.now());
      await prisma.githubIssueProjection.upsert({
        where: { githubIssueId: fakeIssueId },
        create: {
          githubIssueId: fakeIssueId,
          githubRepositoryId: integration.githubRepositoryId,
          issueNumber,
          title: dto.title,
          state: 'open',
          htmlUrl: `https://github.com/org/${integration.githubRepoName}/issues/${issueNumber}`,
          updatedAt: new Date(),
        },
        update: {},
      });
    }

    return task;
  }

  // 2. Listar tarefas do projeto
  async getTasksByProject(projectId: string, assignedToId?: string) {
    const localTasks = await this.tasksRepository.findMany({ projectId, assignedToId });

    let integration = await prisma.githubIntegration.findFirst({
      where: { articleId: projectId },
    });

    if (!integration) {
      const project = await prisma.project.findUnique({ where: { id: projectId } });
      if (project) {
        integration = await githubIntegrationService
          .setupArticleGithubIntegration(projectId, project.name)
          .catch(() => null);
      }
    }

    if (integration) {
      const issueProjections = await prisma.githubIssueProjection.findMany({
        where: { githubRepositoryId: integration.githubRepositoryId },
        orderBy: { issueNumber: 'asc' },
      });

      const projectItemProjections = await prisma.githubProjectItemProjection.findMany({
        where: { githubProjectV2Id: integration.githubProjectV2Id },
      });

      const itemStatusMap = new Map<string, string>();
      for (const item of projectItemProjections) {
        if (item.statusValue) {
          itemStatusMap.set(item.githubIssueId.toString(), item.statusValue);
        }
      }

      for (const issue of issueProjections) {
        const slug = issue.title
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .toLowerCase()
          .trim()
          .replace(/[^a-z0-9\s-]/g, '')
          .replace(/[\s_]+/g, '-')
          .replace(/-+/g, '-')
          .slice(0, 30);
        const branchName = `task/${issue.issueNumber}-${slug || 'item'}`;

        const existing = localTasks.some(
          (t) =>
            t.branchName.includes(`task/${issue.issueNumber}-`) ||
            t.title.trim().toLowerCase() === issue.title.trim().toLowerCase()
        );

        if (!existing) {
          let status: any = 'NOT_STARTED';
          if (issue.state === 'closed') {
            status = 'MERGED';
          } else {
            const itemStatus = itemStatusMap.get(issue.githubIssueId.toString());
            if (itemStatus) {
              const lower = itemStatus.toLowerCase();
              if (lower.includes('progress') || lower.includes('andamento')) {
                status = 'IN_PROGRESS';
              } else if (
                lower.includes('done') ||
                lower.includes('concluid') ||
                lower.includes('merged')
              ) {
                status = 'MERGED';
              } else if (lower.includes('review')) {
                status = 'UNDER_REVIEW';
              } else {
                status = 'NOT_STARTED';
              }
            } else {
              status = 'NOT_STARTED';
            }
          }

          localTasks.push({
            id: `github-issue-${issue.githubIssueId.toString()}`,
            projectId,
            assignedToId: assignedToId || '',
            title: issue.title,
            branchName,
            status,
            dueDate: undefined as any,
            createdAt: issue.updatedAt,
            updatedAt: issue.updatedAt,
            assignee: {
              id: 'github-user',
              name: issue.assigneeGithubUsername || 'Membro Atribuído',
              email: 'assigned@scilatex.org',
            } as any,
          } as any);
        }
      }
    }

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

    return localTasks.map((t) => {
      const activeUserId = presenceMap.get(t.id);
      const activeUser = activeUserId ? activeUsersMap.get(activeUserId) : null;
      return {
        ...t,
        isOccupied: Boolean(activeUserId),
        occupiedBy: activeUser ? { id: activeUser.id, name: activeUser.name } : null,
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

    if (!task && taskId.startsWith('github-issue-')) {
      const issueIdStr = taskId.replace('github-issue-', '');
      try {
        const issueProjection = await prisma.githubIssueProjection.findUnique({
          where: { githubIssueId: BigInt(issueIdStr) },
        });

        if (issueProjection) {
          const slug = issueProjection.title
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .toLowerCase()
            .trim()
            .replace(/[^a-z0-9\s-]/g, '')
            .replace(/[\s_]+/g, '-')
            .replace(/-+/g, '-')
            .slice(0, 30);
          const branchName = `task/${issueProjection.issueNumber}-${slug || 'item'}`;

          const localTasks = await this.tasksRepository.findMany({ projectId });
          const existing = localTasks.find((t) => t.branchName === branchName);

          if (existing) {
            task = existing;
          } else {
            task = await this.tasksRepository.create({
              projectId,
              assignedToId: userId,
              title: issueProjection.title,
              branchName,
              status: 'NOT_STARTED',
            });
          }
        }
      } catch (err) {
        console.warn(`⚠️ Warning resolving virtual github issue ${taskId}:`, err);
      }
    }

    if (!task || task.projectId !== projectId) {
      throw new Error('TASK_NOT_FOUND: A tarefa especificada não foi encontrada no projeto.');
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

    // Invariante 3 & 4: Inicializa o diretório isolado do workspace da tarefa (projects/P/users/U/tasks/T)
    await editorProxyService.ensureTaskWorkspace({
      projectId,
      userId,
      taskId: task.id,
      branchName: task.branchName,
      gitRepoPath: project?.gitRepoPath,
    });

    let podResult: any;
    let workspaceStatus: 'READY' | 'ERROR' = 'READY';

    try {
      // Reivindica o Pod atômico montado no subcaminho exclusivo da tarefa
      podResult = await this.k8sPodManager.claimPodForTask(projectId, userId, task.id);
    } catch (podErr) {
      console.warn(`⚠️ Error claiming Pod for task ${task.id}:`, podErr);
      podResult = { podName: null };
      workspaceStatus = 'ERROR';
    }

    // Invariante 2 & 7: Upsert do Workspace na chave única composta (projectId, userId, taskId)
    const workspace = await prisma.workspace.upsert({
      where: {
        projectId_userId_taskId: {
          projectId,
          userId,
          taskId: task.id,
        },
      },
      create: {
        projectId,
        userId,
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

    // Se o status da task ainda era NOT_STARTED, avança para IN_PROGRESS
    if (task.status === 'NOT_STARTED') {
      task = await this.tasksRepository.update(task.id, {
        status: 'IN_PROGRESS',
      });
    }

    // Atualiza o status da issue no GitHub Project v2 para "In Progress"
    const integration = await prisma.githubIntegration
      .findFirst({ where: { articleId: projectId } })
      .catch(() => null);

    if (integration?.githubProjectV2Id) {
      const issueMatch = task.branchName.match(/^task\/(\d+)-/);
      if (issueMatch) {
        const issueNumber = Number.parseInt(issueMatch[1], 10);
        try {
          const provider = getGithubProvider();
          await provider.updateIssueStatusInProjectV2(
            integration.githubProjectV2Id,
            issueNumber,
            'In Progress'
          );
        } catch (err: any) {
          console.warn(
            `⚠️ Warning updating Project v2 issue #${issueNumber} status to In Progress:`,
            err.message || err
          );
        }
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
