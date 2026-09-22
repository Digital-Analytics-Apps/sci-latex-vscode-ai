import path from 'node:path';
import { Workspace, WorkspaceStatus } from '@prisma/client';
import { env } from '../config/env';
import { prisma } from '../db/prisma';

export interface UpsertWorkspaceData {
  projectId: string;
  userId: string;
  taskId: string;
  podName?: string | null;
  status?: WorkspaceStatus;
}

export interface IWorkspacesRepository {
  upsertWorkspace(data: UpsertWorkspaceData): Promise<Workspace>;
  deleteByProjectId(projectId: string): Promise<void>;
  findByProjectIdUserIdAndTaskId(
    projectId: string,
    userId: string,
    taskId: string
  ): Promise<Workspace | null>;
  updateStatusByProjectId(projectId: string, status: WorkspaceStatus): Promise<void>;
  getTaskWorkspacePath(projectId: string, userId: string, taskId: string): string;
}

export class PrismaWorkspacesRepository implements IWorkspacesRepository {
  getTaskWorkspacePath(projectId: string, userId: string, taskId: string): string {
    return path.resolve(env.STORAGE_PATH, 'projects', projectId, 'users', userId, 'tasks', taskId);
  }

  async upsertWorkspace(data: UpsertWorkspaceData): Promise<Workspace> {
    return prisma.workspace.upsert({
      where: {
        projectId_userId_taskId: {
          projectId: data.projectId,
          userId: data.userId,
          taskId: data.taskId,
        },
      },
      create: {
        projectId: data.projectId,
        userId: data.userId,
        taskId: data.taskId,
        podName: data.podName || null,
        status: data.status || 'READY',
      },
      update: {
        podName: data.podName !== undefined ? data.podName : undefined,
        status: data.status || 'READY',
        updatedAt: new Date(),
      },
    });
  }

  async deleteByProjectId(projectId: string): Promise<void> {
    await prisma.workspace.deleteMany({
      where: { projectId },
    });
  }

  async findByProjectIdUserIdAndTaskId(
    projectId: string,
    userId: string,
    taskId: string
  ): Promise<Workspace | null> {
    return prisma.workspace.findUnique({
      where: {
        projectId_userId_taskId: { projectId, userId, taskId },
      },
    });
  }

  async updateStatusByProjectId(projectId: string, status: WorkspaceStatus): Promise<void> {
    await prisma.workspace.updateMany({
      where: { projectId },
      data: {
        status,
        podName: status === 'TERMINATED' ? null : undefined,
        updatedAt: new Date(),
      },
    });
  }
}
