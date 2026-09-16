import { Workspace, WorkspaceStatus } from '@prisma/client';
import { prisma } from '../db/prisma';

export interface UpsertWorkspaceData {
  projectId: string;
  userId: string;
  taskId?: string | null;
  podName?: string | null;
  status?: WorkspaceStatus;
}

export interface IWorkspacesRepository {
  upsertWorkspace(data: UpsertWorkspaceData): Promise<Workspace>;
  deleteByProjectId(projectId: string): Promise<void>;
  findByProjectIdAndUserId(projectId: string, userId: string): Promise<Workspace | null>;
  updateStatusByProjectId(projectId: string, status: WorkspaceStatus): Promise<void>;
}

export class PrismaWorkspacesRepository implements IWorkspacesRepository {
  async upsertWorkspace(data: UpsertWorkspaceData): Promise<Workspace> {
    return prisma.workspace.upsert({
      where: {
        projectId_userId: {
          projectId: data.projectId,
          userId: data.userId,
        },
      },
      create: {
        projectId: data.projectId,
        userId: data.userId,
        taskId: data.taskId || null,
        podName: data.podName || null,
        status: data.status || 'READY',
      },
      update: {
        taskId: data.taskId || null,
        podName: data.podName || null,
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

  async findByProjectIdAndUserId(projectId: string, userId: string): Promise<Workspace | null> {
    return prisma.workspace.findUnique({
      where: {
        projectId_userId: { projectId, userId },
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
