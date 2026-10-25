import { TaskStatus } from '@prisma/client';
import { FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { TasksService } from './tasks.service';

export const taskParamsSchema = z.object({
  projectId: z.string().min(1),
});

export const createTaskBodySchema = z.object({
  assignedToId: z.string().optional(),
  title: z.string().min(1),
  dueDate: z.string().optional(),
  stageId: z.string().optional(),
});

export const listTasksQuerySchema = z.object({
  assignedToId: z.string().optional(),
  status: z.union([z.nativeEnum(TaskStatus), z.literal('ALL')]).optional(),
  search: z.string().optional(),
  stageId: z.string().optional(),
});

export const taskWorkspaceParamsSchema = z.object({
  projectId: z.string().min(1),
  taskId: z.string().min(1),
});
export const requestReviewBodySchema = z.object({
  notes: z.string().optional(),
});

export const reviewDecisionBodySchema = z.object({
  decision: z.enum(['APPROVED', 'CHANGES_REQUESTED']),
  feedback: z.string().optional(),
});


export class TasksController {
  constructor(private readonly service: TasksService = new TasksService()) {}

  async create(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { projectId } = taskParamsSchema.parse(request.params);
      const { assignedToId, title, dueDate, stageId } = createTaskBodySchema.parse(request.body);

      const task = await this.service.createTask({
        projectId,
        assignedToId,
        title,
        dueDate,
        stageId,
      });

      return reply.status(201).send(task);
    } catch (err: any) {
      return reply.status(400).send({ error: 'CREATE_TASK_FAILED', message: err.message });
    }
  }

  async claim(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { projectId, taskId } = taskWorkspaceParamsSchema.parse(request.params);
      const userId = request.user.sub;
      const task = await this.service.claimTask(projectId, taskId, userId);
      return reply.send(task);
    } catch (err: any) {
      return reply.status(400).send({ error: 'CLAIM_TASK_FAILED', message: err.message });
    }
  }

  async unclaim(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { projectId, taskId } = taskWorkspaceParamsSchema.parse(request.params);
      const task = await this.service.unclaimTask(projectId, taskId);
      return reply.send(task);
    } catch (err: any) {
      return reply.status(400).send({ error: 'UNCLAIM_TASK_FAILED', message: err.message });
    }
  }
  async complete(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { projectId, taskId } = taskWorkspaceParamsSchema.parse(request.params);
      const userId = request.user.sub;
      const task = await this.service.completeTask(projectId, taskId, userId);
      return reply.send(task);
    } catch (err: unknown) {
      const error = err as Error;
      return reply.status(400).send({ error: 'COMPLETE_TASK_FAILED', message: error.message });
    }
  }
  async requestReview(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { projectId, taskId } = taskWorkspaceParamsSchema.parse(request.params);
      const { notes } = requestReviewBodySchema.parse(request.body || {});
      const userId = request.user.sub;
      const task = await this.service.requestTaskReview(projectId, taskId, userId, notes);
      return reply.send(task);
    } catch (err: unknown) {
      const error = err as Error;
      return reply.status(400).send({ error: 'REQUEST_REVIEW_FAILED', message: error.message });
    }
  }

  async startReview(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { projectId, taskId } = taskWorkspaceParamsSchema.parse(request.params);
      const userId = request.user.sub;
      const task = await this.service.startTaskReview(projectId, taskId, userId);
      return reply.send(task);
    } catch (err: unknown) {
      const error = err as Error;
      return reply.status(400).send({ error: 'START_REVIEW_FAILED', message: error.message });
    }
  }

  async reviewDecision(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { projectId, taskId } = taskWorkspaceParamsSchema.parse(request.params);
      const { decision, feedback } = reviewDecisionBodySchema.parse(request.body || {});
      const userId = request.user.sub;
      const task = await this.service.reviewTaskDecision(projectId, taskId, userId, decision, feedback);
      return reply.send(task);
    } catch (err: unknown) {
      const error = err as Error;
      return reply.status(400).send({ error: 'REVIEW_DECISION_FAILED', message: error.message });
    }
  }



  async list(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { projectId } = taskParamsSchema.parse(request.params);
      const { assignedToId, status, search, stageId } = listTasksQuerySchema.parse(
        request.query || {}
      );

      const tasks = await this.service.getTasksByProject(projectId, assignedToId, {
        status,
        search,
        stageId,
      });
      return reply.send({ tasks });
    } catch (err: any) {
      console.error('❌ GET /projects/:projectId/tasks error:', err);
      return reply.status(500).send({ error: 'GET_TASKS_FAILED', message: err.message });
    }
  }

  async startWorkspace(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { projectId, taskId } = taskWorkspaceParamsSchema.parse(request.params);
      const userId = request.user.sub;

      const result = await this.service.startTaskWorkspace(projectId, taskId, userId);
      return reply.send(result);
    } catch (err: any) {
      return reply.status(400).send({ error: 'START_WORKSPACE_FAILED', message: err.message });
    }
  }
}
