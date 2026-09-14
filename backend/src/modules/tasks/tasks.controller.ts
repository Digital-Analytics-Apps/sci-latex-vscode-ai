import { FastifyReply, FastifyRequest } from 'fastify';
import { TasksService } from './tasks.service';

export class TasksController {
  constructor(private service: TasksService = new TasksService()) {}

  async create(request: FastifyRequest, reply: FastifyReply) {
    const { projectId } = request.params as { projectId: string };
    const { assignedToId, title, dueDate } = request.body as {
      assignedToId: string;
      title: string;
      dueDate?: string;
    };

    try {
      const task = await this.service.createTask({
        projectId,
        assignedToId,
        title,
        dueDate,
      });

      return reply.status(201).send(task);
    } catch (err: any) {
      return reply.status(400).send({ error: 'CREATE_TASK_FAILED', message: err.message });
    }
  }

  async list(request: FastifyRequest, reply: FastifyReply) {
    const { projectId } = request.params as { projectId: string };
    const { assignedToId } = request.query as { assignedToId?: string };

    try {
      const tasks = await this.service.getTasksByProject(projectId, assignedToId);
      return reply.send({ tasks });
    } catch (err: any) {
      return reply.status(500).send({ error: 'GET_TASKS_FAILED', message: err.message });
    }
  }

  async startWorkspace(request: FastifyRequest, reply: FastifyReply) {
    const { projectId, taskId } = request.params as { projectId: string; taskId: string };
    const userId = request.user.sub;

    try {
      const result = await this.service.startTaskWorkspace(projectId, taskId, userId);
      return reply.send(result);
    } catch (err: any) {
      return reply.status(400).send({ error: 'START_WORKSPACE_FAILED', message: err.message });
    }
  }
}
