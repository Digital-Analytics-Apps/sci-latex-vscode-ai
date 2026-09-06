import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { verifyJwt } from '../../middlewares/auth.middleware';
import { requireCoordinatorOrAbove } from '../../middlewares/rbac.middleware';
import { PrismaProjectsRepository } from '../../repositories/projects.repository';
import { PrismaTeamsRepository } from '../../repositories/teams.repository';
import { GitService } from '../git/git.service';
import { ProjectsController } from './projects.controller';
import { ProjectsService } from './projects.service';

export async function projectsRoutes(app: FastifyInstance) {
  const projectsRepository = new PrismaProjectsRepository();
  const teamsRepository = new PrismaTeamsRepository();
  const gitService = new GitService();
  const projectsService = new ProjectsService(projectsRepository, teamsRepository, gitService);
  const controller = new ProjectsController(projectsService);

  // Exige autenticação JWT para todas as rotas de projetos
  app.addHook('onRequest', verifyJwt);

  // POST /api/v1/projects - Criar novo projeto e repositório Git no GitHub
  app.post(
    '/',
    {
      schema: {
        tags: ['Projects'],
        summary: 'Criar novo projeto e repositório Git/GitHub',
        description:
          'Cria um novo artigo científico no banco de dados e provisiona o repositório remoto no GitHub com o template main.tex.',
        security: [{ bearerAuth: [] }],
        body: z.object({
          name: z.string().min(2),
          description: z.string().optional(),
          teamId: z.string().uuid().optional(),
          academicPeriodId: z.string().uuid().optional(),
          targetConferenceName: z.string().optional(),
          targetConferenceDate: z.string().optional(),
          backupConferenceName: z.string().optional(),
          backupConferenceDate: z.string().optional(),
        }),
      },
    },
    (req, reply) => controller.create(req, reply)
  );

  // GET /api/v1/projects - Listar projetos
  app.get(
    '/',
    {
      schema: {
        tags: ['Projects'],
        summary: 'Listar projetos de artigos científicos',
        description:
          'Retorna a lista de artigos aos quais o usuário autenticado tem acesso ou gerencia.',
        security: [{ bearerAuth: [] }],
      },
    },
    (req, reply) => controller.list(req, reply)
  );

  // GET /api/v1/projects/:id - Obter detalhes de um projeto
  app.get(
    '/:id',
    {
      schema: {
        tags: ['Projects'],
        summary: 'Obter detalhes de um projeto',
        description: 'Retorna metadados completos, seções e membros associados a um artigo.',
        security: [{ bearerAuth: [] }],
        params: z.object({
          id: z.string().uuid(),
        }),
      },
    },
    (req, reply) => controller.getById(req, reply)
  );

  // PATCH /api/v1/projects/:id - Atualizar metadados e congressos do projeto (Exige justificativa em datas)
  app.patch(
    '/:id',
    {
      schema: {
        tags: ['Projects'],
        summary: 'Atualizar metadados e congressos do projeto',
        description:
          'Permite atualizar o título, descrição, congressos alvo/backup ou status de submissão do artigo. Requer campo justification caso datas sejam alteradas.',
        security: [{ bearerAuth: [] }],
        params: z.object({
          id: z.string().uuid(),
        }),
        body: z.object({
          name: z.string().optional(),
          description: z.string().optional(),
          targetConferenceName: z.string().optional(),
          targetConferenceDate: z.string().optional(),
          backupConferenceName: z.string().optional(),
          backupConferenceDate: z.string().optional(),
          doi: z.string().optional(),
          publicationUrl: z.string().optional(),
          datasetUrl: z.string().optional(),
          justification: z.string().optional(),
        }),
      },
    },
    (req, reply) => controller.update(req, reply)
  );

  // DELETE /api/v1/projects/:id - Deletar um projeto (Apenas Coordenador, Gerente ou Admin)
  app.delete(
    '/:id',
    {
      onRequest: [requireCoordinatorOrAbove],
      schema: {
        tags: ['Projects'],
        summary: 'Deletar artigo científico (Coordenador, Gerente ou Admin)',
        description:
          'Exclui permanentemente um artigo científico do sistema. Requer papel de Coordenador, Gerente ou Admin.',
        security: [{ bearerAuth: [] }],
        params: z.object({
          id: z.string().uuid(),
        }),
      },
    },
    (req, reply) => controller.delete(req, reply)
  );

  // POST /api/v1/projects/:id/members - Adicionar/Associar membro (Autor ou Revisor)
  app.post(
    '/:id/members',
    {
      onRequest: [requireCoordinatorOrAbove],
      schema: {
        tags: ['Projects'],
        summary: 'Adicionar ou associar Autor/Revisor ao artigo',
        description:
          'Permite ao Coordenador, Gerente ou Admin associar um usuário ao projeto com papel de AUTHOR ou REVIEWER.',
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

  // DELETE /api/v1/projects/:id/members/:userId - Remover Autor ou Revisor do artigo
  app.delete(
    '/:id/members/:userId',
    {
      onRequest: [requireCoordinatorOrAbove],
      schema: {
        tags: ['Projects'],
        summary: 'Remover Autor ou Revisor do artigo',
        description: 'Permite ao Coordenador, Gerente ou Admin remover um membro de um projeto.',
        security: [{ bearerAuth: [] }],
        params: z.object({
          id: z.string().uuid(),
          userId: z.string().uuid(),
        }),
      },
    },
    (req, reply) => controller.removeMember(req, reply)
  );

  // GET /api/v1/projects/:id/timeline - Obter Timeline rastreável do artigo
  app.get(
    '/:id/timeline',
    {
      schema: {
        tags: ['Projects'],
        summary: 'Obter Timeline Rastreável do Artigo',
        description:
          'Retorna o histórico cronológico de criações, alterações de prazos com justificativas, PRs e revisões.',
        security: [{ bearerAuth: [] }],
        params: z.object({
          id: z.string().uuid(),
        }),
      },
    },
    (req, reply) => controller.getTimeline(req, reply)
  );

  // PATCH /api/v1/projects/:id/post-submission - Atualizar status pós-submissão e decisão dos autores
  app.patch(
    '/:id/post-submission',
    {
      schema: {
        tags: ['Projects'],
        summary:
          'Atualizar status pós-submissão e decisão dos autores (DOI, Aceite, Rejeição, Backup)',
        description:
          'Permite registrar o aceite com DOI, pedido de ajustes, ou decisão dos autores após rejeição (redirecionar para congresso backup ou abrir versão v2).',
        security: [{ bearerAuth: [] }],
        params: z.object({
          id: z.string().uuid(),
        }),
        body: z.object({
          submissionStatus: z.enum([
            'IN_PROGRESS',
            'WAITING_NIT',
            'SUBMITTED_TARGET',
            'SUBMITTED_BACKUP',
            'ACCEPTED_REVISION_REQUESTED',
            'ACCEPTED_CAMERA_READY',
            'REJECTED_WAITING_DECISION',
            'REJECTED_REOPENED_V2',
            'COMPLETED_PUBLISHED',
          ]),
          doi: z.string().optional(),
          publicationUrl: z.string().optional(),
          datasetUrl: z.string().optional(),
          publishedAt: z.string().optional(),
          reviewerFeedback: z.string().optional(),
          decisionReason: z.string().optional(),
        }),
      },
    },
    (req, reply) => controller.updatePostSubmission(req, reply)
  );
}
