import { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { verifyJwt } from '../../middlewares/auth.middleware';
import { TasksController } from './tasks.controller';

export const tasksRoutes: FastifyPluginAsyncZod = async (fastify) => {
  const controller = new TasksController();

  // Hook de autenticação JWT para todas as rotas de tarefas
  fastify.addHook('onRequest', verifyJwt);

  // POST /api/v1/projects/:projectId/tasks - Criar nova tarefa
  fastify.post(
    '/api/v1/projects/:projectId/tasks',
    {
      schema: {
        tags: ['Tasks'],
        summary: 'Criar nova tarefa no projeto',
        security: [{ bearerAuth: [] }],
        params: z.object({
          projectId: z.string().min(1),
        }),
        body: z.object({
          assignedToId: z.string().min(1),
          title: z.string().min(1),
          dueDate: z.string().optional(),
        }),
      },
    },
    controller.create.bind(controller)
  );

  // GET /api/v1/projects/:projectId/tasks - Listar tarefas do projeto
  fastify.get(
    '/api/v1/projects/:projectId/tasks',
    {
      schema: {
        tags: ['Tasks'],
        summary: 'Listar tarefas do projeto',
        security: [{ bearerAuth: [] }],
        params: z.object({
          projectId: z.string().min(1),
        }),
        querystring: z.object({
          assignedToId: z.string().optional(),
        }),
      },
    },
    controller.list.bind(controller)
  );

  // POST /api/v1/projects/:projectId/tasks/:taskId/workspace - Iniciar / Continuar Workspace para uma Task
  fastify.post(
    '/api/v1/projects/:projectId/tasks/:taskId/workspace',
    {
      schema: {
        tags: ['Tasks'],
        summary: 'Iniciar ou continuar Workspace para uma Task',
        security: [{ bearerAuth: [] }],
        params: z.object({
          projectId: z.string().min(1),
          taskId: z.string().min(1),
        }),
      },
    },
    controller.startWorkspace.bind(controller)
  );
};
