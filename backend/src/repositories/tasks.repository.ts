import { Task, TaskStatus } from '@prisma/client';
import { prisma } from '../db/prisma';

export interface CreateTaskData {
  projectId: string;
  assignedToId?: string | null;
  title: string;
  branchName?: string;
  dueDate?: Date;
  status?: TaskStatus;
  stageId?: string;
}

export interface UpdateTaskData {
  title?: string;
  branchName?: string;
  dueDate?: Date;
  status?: TaskStatus;
  assignedToId?: string | null;
  stageId?: string;
}

export interface TaskFilterOptions {
  projectId: string;
  assignedToId?: string;
  status?: TaskStatus;
  search?: string;
  stageId?: string;
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
        stageId: data.stageId,
      },
      include: {
        stage: true,
        assignee: { select: { id: true, name: true, email: true, role: true } },
      },
    });
  }

  async update(id: string, data: UpdateTaskData): Promise<Task> {
    return prisma.task.update({
      where: { id },
      data,
      include: {
        stage: true,
        assignee: { select: { id: true, name: true, email: true, role: true } },
      },
    });
  }

  async findById(id: string): Promise<Task | null> {
    return prisma.task.findUnique({
      where: { id },
      include: {
        stage: true,
        assignee: { select: { id: true, name: true, email: true, role: true } },
        pullRequests: true,
      },
    });
  }

  async findMany(filters: TaskFilterOptions): Promise<Task[]> {
    const where: any = { projectId: filters.projectId };
    if (filters.assignedToId) {
      where.assignedToId = filters.assignedToId;
    }
    if (filters.stageId) {
      where.stageId = filters.stageId;
    }
    if (filters.status && filters.status !== ('ALL' as any)) {
      where.status = filters.status;
    }
    if (filters.search && filters.search.trim() !== '') {
      const query = filters.search.trim();
      where.OR = [
        { title: { contains: query, mode: 'insensitive' } },
        { branchName: { contains: query, mode: 'insensitive' } },
      ];
    }

    return prisma.task.findMany({
      where,
      include: {
        stage: true,
        assignee: { select: { id: true, name: true, email: true, role: true } },
        pullRequests: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}
