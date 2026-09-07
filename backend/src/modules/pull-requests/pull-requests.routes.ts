import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { verifyJwt } from '../../middlewares/auth.middleware';
import { requireCoordinatorOrAbove } from '../../middlewares/rbac.middleware';
import { PrismaPullRequestsRepository } from '../../repositories/pull-requests.repository';
import { PullRequestsService } from './pull-requests.service';
import { PullRequestsController } from './pull-requests.controller';

import { GitService } from '../git/git.service';

export async function pullRequestsRoutes(app: FastifyInstance) {
  const prRepository = new PrismaPullRequestsRepository();
  const gitService = new GitService();
  const prService = new PullRequestsService(prRepository, gitService);
  const controller = new PullRequestsController(prService);

  app.addHook('onRequest', verifyJwt);

  // POST /api/v1/pull-requests - Abertura de PR pelo Autor
  app.post(
    '/',
    {
      schema: {
        tags: ['PullRequests'],
        summary: 'Abrir novo Pull Request para revisão de seção',
        description:
          'Envia a alteração da seção do artigo para revisão do Revisor e parecer do NIT.',
        security: [{ bearerAuth: [] }],
        body: z.object({
          title: z.string().min(3),
          description: z.string().optional().nullable(),
          sectionId: z.string().min(1),
          projectId: z.string().min(1),
          reviewerId: z.string().optional().nullable().or(z.literal('')),
        }),
      },
    },
    (req, reply) => controller.create(req, reply)
  );

  // GET /api/v1/pull-requests - Listar PRs
  app.get(
    '/',
    {
      schema: {
        tags: ['PullRequests'],
        summary: 'Listar Pull Requests',
        description: 'Retorna os PRs filtrados por projeto ou do usuário logado.',
        security: [{ bearerAuth: [] }],
        querystring: z.object({
          projectId: z.string().optional(),
        }),
      },
    },
    (req, reply) => controller.list(req, reply)
  );

  // GET /api/v1/pull-requests/:id - Detalhes do PR
  app.get(
    '/:id',
    {
      schema: {
        tags: ['PullRequests'],
        summary: 'Obter detalhes de um Pull Request',
        description:
          'Retorna os metadados do PR, histórico de comentários por linha e status do NIT.',
        security: [{ bearerAuth: [] }],
        params: z.object({
          id: z.string(),
        }),
      },
    },
    (req, reply) => controller.getById(req, reply)
  );

  // POST /api/v1/pull-requests/:id/review - Avaliação pelo Revisor
  app.post(
    '/:id/review',
    {
      schema: {
        tags: ['PullRequests'],
        summary: 'Avaliar Pull Request (Aprovar ou Solicitar Ajustes)',
        description:
          'Permite ao Revisor aprovar a seção ou solicitar ajustes adicionando comentários linha por linha.',
        security: [{ bearerAuth: [] }],
        params: z.object({
          id: z.string(),
        }),
        body: z.object({
          status: z.enum(['APPROVED', 'CHANGES_REQUESTED', 'UNDER_REVIEW']).optional(),
          comment: z.string().optional(),
          lineNumer: z.number().int().positive().optional(),
        }),
      },
    },
    (req, reply) => controller.review(req, reply)
  );

  // PATCH /api/v1/pull-requests/:id/nit - Parecer manual do NIT
  app.patch(
    '/:id/nit',
    {
      onRequest: [requireCoordinatorOrAbove],
      schema: {
        tags: ['PullRequests'],
        summary: 'Registrar parecer do NIT (Núcleo de Inovação Tecnológica)',
        description:
          'Permite ao Coordenador, Gerente ou Admin aprovar ou rejeitar o parecer do NIT sobre a seção.',
        security: [{ bearerAuth: [] }],
        params: z.object({
          id: z.string(),
        }),
        body: z.object({
          nitStatus: z.enum(['WAITING_NIT', 'APPROVED_NIT', 'REJECTED_NIT']),
          nitNotes: z.string().optional(),
        }),
      },
    },
    (req, reply) => controller.updateNIT(req, reply)
  );

  // PATCH /api/v1/pull-requests/:id/reviewer - Atribuir ou atualizar Revisor no PR
  app.patch(
    '/:id/reviewer',
    {
      onRequest: [requireCoordinatorOrAbove],
      schema: {
        tags: ['PullRequests'],
        summary: 'Atribuir ou atualizar Revisor do Pull Request',
        description: 'Permite ao Coordenador, Gerente ou Admin designar um Revisor para o PR.',
        security: [{ bearerAuth: [] }],
        params: z.object({
          id: z.string(),
        }),
        body: z.object({
          reviewerId: z.string().min(1),
        }),
      },
    },
    (req, reply) => controller.assignReviewer(req, reply)
  );

  // POST /api/v1/pull-requests/:id/merge - Executar Merge com Trava de Segurança
  app.post(
    '/:id/merge',
    {
      schema: {
        tags: ['PullRequests'],
        summary: 'Executar Merge do PR para a branch principal (main)',
        description:
          'Realiza o merge da seção aprovada. Trava estrita: exige aprovação do Revisor E aprovação do NIT.',
        security: [{ bearerAuth: [] }],
        params: z.object({
          id: z.string(),
        }),
      },
    },
    (req, reply) => controller.merge(req, reply)
  );
}
