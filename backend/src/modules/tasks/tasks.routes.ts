import { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { verifyJwt } from '../../middlewares/auth.middleware';
import {
  createTaskBodySchema,
  listTasksQuerySchema,
  requestReviewBodySchema,
  reviewDecisionBodySchema,
  taskParamsSchema,
  TasksController,
  taskWorkspaceParamsSchema,
} from './tasks.controller';

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
        params: taskParamsSchema,
        body: createTaskBodySchema,
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
        params: taskParamsSchema,
        querystring: listTasksQuerySchema,
      },
    },
    controller.list.bind(controller)
  );

  // POST /api/v1/projects/:projectId/tasks/:taskId/claim - Assinar tarefa
  fastify.post(
    '/api/v1/projects/:projectId/tasks/:taskId/claim',
    {
      schema: {
        tags: ['Tasks'],
        summary: 'Assinar tarefa (Claim)',
        security: [{ bearerAuth: [] }],
        params: taskWorkspaceParamsSchema,
      },
    },
    controller.claim.bind(controller)
  );

  // POST /api/v1/projects/:projectId/tasks/:taskId/unclaim - Desassinar tarefa
  fastify.post(
    '/api/v1/projects/:projectId/tasks/:taskId/unclaim',
    {
      schema: {
        tags: ['Tasks'],
        summary: 'Desassinar tarefa (Unclaim)',
        security: [{ bearerAuth: [] }],
        params: taskWorkspaceParamsSchema,
      },
    },
    controller.unclaim.bind(controller)
  );
  // POST /api/v1/projects/:projectId/tasks/:taskId/complete - Concluir tarefa
  fastify.post(
    '/api/v1/projects/:projectId/tasks/:taskId/complete',
    {
      schema: {
        tags: ['Tasks'],
        summary: 'Marcar tarefa como concluída',
        security: [{ bearerAuth: [] }],
        params: taskWorkspaceParamsSchema,
      },
    },
    controller.complete.bind(controller)
  );
  // POST /api/v1/projects/:projectId/tasks/:taskId/request-review - Solicitar revisão da tarefa
  fastify.post(
    '/api/v1/projects/:projectId/tasks/:taskId/request-review',
    {
      schema: {
        tags: ['Tasks'],
        summary: 'Solicitar revisão de uma tarefa de escrita ao orientador',
        security: [{ bearerAuth: [] }],
        params: taskWorkspaceParamsSchema,
        body: requestReviewBodySchema,
      },
    },
    controller.requestReview.bind(controller)
  );

  // POST /api/v1/projects/:projectId/tasks/:taskId/start-review - Revisor inicia avaliação da tarefa
  fastify.post(
    '/api/v1/projects/:projectId/tasks/:taskId/start-review',
    {
      schema: {
        tags: ['Tasks'],
        summary: 'Revisor assume inspeção da tarefa em modo leitura',
        security: [{ bearerAuth: [] }],
        params: taskWorkspaceParamsSchema,
      },
    },
    controller.startReview.bind(controller)
  );

  // POST /api/v1/projects/:projectId/tasks/:taskId/decision - Emitir parecer da tarefa (Aprovar ou Ajustes)
  fastify.post(
    '/api/v1/projects/:projectId/tasks/:taskId/decision',
    {
      schema: {
        tags: ['Tasks'],
        summary: 'Emitir parecer da tarefa de escrita (Aprovação ou Ajustes Solicitados)',
        security: [{ bearerAuth: [] }],
        params: taskWorkspaceParamsSchema,
        body: reviewDecisionBodySchema,
      },
    },
    controller.reviewDecision.bind(controller)
  );



  // POST /api/v1/projects/:projectId/tasks/:taskId/workspace - Iniciar / Continuar Workspace para uma Task
  fastify.post(
    '/api/v1/projects/:projectId/tasks/:taskId/workspace',
    {
      schema: {
        tags: ['Tasks'],
        summary: 'Iniciar ou continuar Workspace para uma Task',
        security: [{ bearerAuth: [] }],
        params: taskWorkspaceParamsSchema,
      },
    },
    controller.startWorkspace.bind(controller)
  );
};
