import { FastifyInstance } from 'fastify';
import { tasksService } from './tasks.service';

export async function tasksRoutes(fastify: FastifyInstance) {
  // Hook de autenticação JWT para todas as rotas de tarefas
  fastify.addHook('onRequest', async (request, reply) => {
    try {
      await request.jwtVerify();
    } catch {
      reply.status(401).send({ error: 'UNAUTHORIZED', message: 'Token JWT ausente ou inválido' });
    }
  });

  // POST /api/v1/projects/:projectId/tasks - Criar nova tarefa
  fastify.post('/api/v1/projects/:projectId/tasks', async (request, reply) => {
    const { projectId } = request.params as { projectId: string };
    const body = request.body as {
      assignedToId: string;
      title: string;
      dueDate?: string;
    };

    try {
      const task = await tasksService.createTask({
        projectId,
        assignedToId: body.assignedToId,
        title: body.title,
        dueDate: body.dueDate,
      });

      return reply.status(201).send(task);
    } catch (err: any) {
      return reply.status(400).send({ error: 'CREATE_TASK_FAILED', message: err.message });
    }
  });

  // GET /api/v1/projects/:projectId/tasks - Listar tarefas do projeto
  fastify.get('/api/v1/projects/:projectId/tasks', async (request, reply) => {
    const { projectId } = request.params as { projectId: string };
    const query = request.query as { assignedToId?: string };

    try {
      const tasks = await tasksService.getTasksByProject(projectId, query.assignedToId);
      return reply.send({ tasks });
    } catch (err: any) {
      return reply.status(500).send({ error: 'GET_TASKS_FAILED', message: err.message });
    }
  });

  // POST /api/v1/projects/:projectId/tasks/:taskId/workspace - Iniciar / Continuar Workspace para uma Task
  fastify.post('/api/v1/projects/:projectId/tasks/:taskId/workspace', async (request, reply) => {
    const { projectId, taskId } = request.params as { projectId: string; taskId: string };
    const userId = request.user.sub;

    try {
      const result = await tasksService.startTaskWorkspace(projectId, taskId, userId);
      return reply.send(result);
    } catch (err: any) {
      return reply.status(400).send({ error: 'START_WORKSPACE_FAILED', message: err.message });
    }
  });
}
