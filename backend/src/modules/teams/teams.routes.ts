import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { verifyJwt } from '../../middlewares/auth.middleware';
import {
  requireCoordinatorOrAbove,
  requireManagerOrAdmin,
} from '../../middlewares/rbac.middleware';
import { PrismaTeamsRepository } from '../../repositories/teams.repository';
import { TeamsService } from './teams.service';
import { TeamsController } from './teams.controller';

export async function teamsRoutes(app: FastifyInstance) {
  const teamsRepository = new PrismaTeamsRepository();
  const teamsService = new TeamsService(teamsRepository);
  const controller = new TeamsController(teamsService);

  app.addHook('onRequest', verifyJwt);

  // POST /api/v1/teams - Criar nova Equipe (Apenas Gerente ou Admin)
  app.post(
    '/',
    {
      onRequest: [requireManagerOrAdmin],
      schema: {
        tags: ['Teams'],
        summary: 'Criar nova Equipe / Laboratório (Gerente ou Admin)',
        description: 'Cria uma nova equipe de pesquisa e atribui um Coordenador responsável.',
        security: [{ bearerAuth: [] }],
        body: z.object({
          name: z.string().min(2),
          description: z.string().optional(),
          coordinatorId: z.string().uuid(),
          managerId: z.string().uuid().optional(),
        }),
      },
    },
    (req, reply) => controller.create(req, reply)
  );

  // GET /api/v1/teams - Listar Equipes
  app.get(
    '/',
    {
      schema: {
        tags: ['Teams'],
        summary: 'Listar Equipes de pesquisa',
        description: 'Retorna a lista de equipes ativas com contagem de membros e projetos.',
        security: [{ bearerAuth: [] }],
        querystring: z.object({
          managerId: z.string().uuid().optional(),
        }),
      },
    },
    (req, reply) => controller.list(req, reply)
  );

  // GET /api/v1/teams/:id - Obter detalhes da Equipe
  app.get(
    '/:id',
    {
      schema: {
        tags: ['Teams'],
        summary: 'Obter detalhes de uma Equipe',
        description: 'Retorna metadados completos da equipe, membro coordenador, gerente e alunos.',
        security: [{ bearerAuth: [] }],
        params: z.object({
          id: z.string().uuid(),
        }),
      },
    },
    (req, reply) => controller.getById(req, reply)
  );

  // PATCH /api/v1/teams/:id - Atualizar Equipe (Apenas Gerente ou Admin)
  app.patch(
    '/:id',
    {
      onRequest: [requireManagerOrAdmin],
      schema: {
        tags: ['Teams'],
        summary: 'Atualizar Equipe (Gerente ou Admin)',
        description:
          'Permite alterar o nome, descrição, coordenador ou gerente responsável da equipe.',
        security: [{ bearerAuth: [] }],
        params: z.object({
          id: z.string().uuid(),
        }),
        body: z.object({
          name: z.string().min(2).optional(),
          description: z.string().optional(),
          coordinatorId: z.string().uuid().optional(),
          managerId: z.string().uuid().optional(),
        }),
      },
    },
    (req, reply) => controller.update(req, reply)
  );

  // DELETE /api/v1/teams/:id - Excluir Equipe (Apenas Gerente ou Admin)
  app.delete(
    '/:id',
    {
      onRequest: [requireManagerOrAdmin],
      schema: {
        tags: ['Teams'],
        summary: 'Excluir Equipe (Gerente ou Admin)',
        description: 'Exclui uma equipe do sistema.',
        security: [{ bearerAuth: [] }],
        params: z.object({
          id: z.string().uuid(),
        }),
      },
    },
    (req, reply) => controller.delete(req, reply)
  );

  // POST /api/v1/teams/:id/members - Adicionar membro à Equipe (Coordenador, Gerente ou Admin)
  app.post(
    '/:id/members',
    {
      onRequest: [requireCoordinatorOrAbove],
      schema: {
        tags: ['Teams'],
        summary: 'Adicionar membro à Equipe',
        description: 'Adiciona um aluno/pesquisador ou revisor à equipe.',
        security: [{ bearerAuth: [] }],
        params: z.object({
          id: z.string().uuid(),
        }),
        body: z.object({
          userId: z.string().uuid(),
          role: z.enum(['AUTHOR', 'REVIEWER', 'COORDINATOR']),
        }),
      },
    },
    (req, reply) => controller.addMember(req, reply)
  );

  // DELETE /api/v1/teams/:id/members/:userId - Remover membro da Equipe (Coordenador, Gerente ou Admin)
  app.delete(
    '/:id/members/:userId',
    {
      onRequest: [requireCoordinatorOrAbove],
      schema: {
        tags: ['Teams'],
        summary: 'Remover membro da Equipe',
        description: 'Remove um membro da equipe.',
        security: [{ bearerAuth: [] }],
        params: z.object({
          id: z.string().uuid(),
          userId: z.string().uuid(),
        }),
      },
    },
    (req, reply) => controller.removeMember(req, reply)
  );
}
