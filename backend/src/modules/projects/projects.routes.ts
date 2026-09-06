import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { verifyJwt } from '../../middlewares/auth.middleware';
import { PrismaProjectsRepository } from '../../repositories/projects.repository';
import { GitService } from '../git/git.service';
import { ProjectsService } from './projects.service';
import { ProjectsController } from './projects.controller';

export async function projectsRoutes(app: FastifyInstance) {
  const projectsRepository = new PrismaProjectsRepository();
  const gitService = new GitService();
  const projectsService = new ProjectsService(projectsRepository, gitService);
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
        description: 'Cria um novo artigo científico no banco de dados e provisiona o repositório remoto no GitHub com o template main.tex.',
        security: [{ bearerAuth: [] }],
        body: z.object({
          name: z.string().min(2),
          description: z.string().optional(),
          teamId: z.string().uuid(),
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
        description: 'Retorna a lista de artigos aos quais o usuário autenticado tem acesso ou gerencia.',
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

  // PATCH /api/v1/projects/:id - Atualizar metadados e congressos do projeto
  app.patch(
    '/:id',
    {
      schema: {
        tags: ['Projects'],
        summary: 'Atualizar metadados e congressos do projeto',
        description: 'Permite atualizar o título, descrição, congressos alvo/backup ou status de submissão do artigo.',
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
        }),
      },
    },
    (req, reply) => controller.update(req, reply)
  );
}
