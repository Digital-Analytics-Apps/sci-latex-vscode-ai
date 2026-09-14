import { Task, TaskStatus } from '@prisma/client';
import { prisma } from '../db/prisma';

export interface CreateTaskData {
  projectId: string;
  assignedToId: string;
  title: string;
  branchName?: string;
  dueDate?: Date;
  status?: TaskStatus;
}

export interface UpdateTaskData {
  title?: string;
  branchName?: string;
  dueDate?: Date;
  status?: TaskStatus;
  assignedToId?: string;
}

export interface TaskFilterOptions {
  projectId: string;
  assignedToId?: string;
}

export interface ITasksRepository {
  create(data: CreateTaskData): Promise<Task>;
  update(id: string, data: UpdateTaskData): Promise<Task>;
  findById(id: string): Promise<Task | null>;
  findMany(filters: TaskFilterOptions): Promise<Task[]>;
}

export class PrismaTasksRepository implements ITasksRepository {
  async create(data: CreateTaskData): Promise<Task> {
    return prisma.task.create({
      data: {
        projectId: data.projectId,
        assignedToId: data.assignedToId,
        title: data.title,
        branchName: data.branchName || 'pending',
        dueDate: data.dueDate,
        status: data.status || 'NOT_STARTED',
      },
    });
  }

  async update(id: string, data: UpdateTaskData): Promise<Task> {
    return prisma.task.update({
      where: { id },
      data,
    });
  }

  async findById(id: string): Promise<Task | null> {
    return prisma.task.findUnique({
      where: { id },
    });
  }

  async findMany(filters: TaskFilterOptions): Promise<Task[]> {
    const where: any = { projectId: filters.projectId };
    if (filters.assignedToId) {
      where.assignedToId = filters.assignedToId;
    }

    return prisma.task.findMany({
      where,
      include: {
        assignee: { select: { id: true, name: true, email: true, role: true } },
        pullRequests: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}
