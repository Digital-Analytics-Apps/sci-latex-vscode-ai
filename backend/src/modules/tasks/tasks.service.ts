import { exec } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';
import { TaskStatus } from '@prisma/client';
import { env } from '../../config/env';
import { prisma } from '../../db/prisma';
import { ITasksRepository, PrismaTasksRepository } from '../../repositories/tasks.repository';
import { eventsManager } from '../events/events.manager';
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
    private readonly tasksRepository: ITasksRepository = new PrismaTasksRepository()
  ) {}

  async claimTask(projectId: string, taskId: string, userId: string) {
    const task = await this.tasksRepository.findById(taskId);
    if (task?.projectId !== projectId) {
      throw new Error('TASK_NOT_FOUND: Tarefa não encontrada.');
    }
    const updated = await this.tasksRepository.update(taskId, { assignedToId: userId });
    eventsManager.publishDomainEvent({
      eventName: 'TASK_CLAIMED',
      projectId,
      userId,
      data: updated,
    });
    return updated;
  }

  async unclaimTask(projectId: string, taskId: string) {
    const task = await this.tasksRepository.findById(taskId);
    if (task?.projectId !== projectId) {
      throw new Error('TASK_NOT_FOUND: Tarefa não encontrada.');
    }
    const updated = await this.tasksRepository.update(taskId, { assignedToId: null });
    eventsManager.publishDomainEvent({
      eventName: 'TASK_UNCLAIMED',
      projectId,
      data: updated,
    });
    return updated;
  }

  async completeTask(projectId: string, taskId: string, userId: string) {
    const task = await this.tasksRepository.findById(taskId);
    if (task?.projectId !== projectId) {
      throw new Error('TASK_NOT_FOUND: Tarefa não encontrada.');
    }
    const updated = await this.tasksRepository.update(taskId, {
      status: TaskStatus.COMPLETED,
    });
    eventsManager.publishDomainEvent({
      eventName: 'TASK_COMPLETED',
      projectId,
      userId,
      data: updated,
    });
    return updated;
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

    const task = await this.tasksRepository.create({
      projectId: dto.projectId,
      assignedToId: dto.assignedToId,
      title: dto.title,
      dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
      status: TaskStatus.NOT_STARTED,
      stageId: dto.stageId,
    });
    eventsManager.publishDomainEvent({
      eventName: 'TASK_CREATED',
      projectId: dto.projectId,
      data: task,
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
        } else if (t.status !== TaskStatus.COMPLETED) {
          foundUnmerged = true;
        }
      }
    }

    return localTasks.map((t) => ({
      ...t,
      isBlockedByPrevious: blockedTaskIdSet.has(t.id),
    }));
  }

  // 3. Ativar/Iniciar o Workspace orientado a uma Task
  async startTaskWorkspace(projectId: string, taskId: string, userId: string) {

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
          .find((t) => t.status !== TaskStatus.COMPLETED);
        if (previousUnmerged) {
          throw new Error(
            'TASK_BLOCKED_BY_PREVIOUS: A tarefa anterior desta etapa precisa ser concluída antes de iniciar esta.'
          );
        }
      }
    }


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

    return {
      task,
      codeServerUrl: `/workspace/${projectId}`,
    };
  }
}

export const tasksService = new TasksService();
