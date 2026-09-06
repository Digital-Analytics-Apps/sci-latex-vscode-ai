import { FastifyInstance } from 'fastify';
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

  // POST /api/v1/projects - Criar novo projeto e repositório Git
  app.post('/', (req, reply) => controller.create(req, reply));

  // GET /api/v1/projects - Listar projetos
  app.get('/', (req, reply) => controller.list(req, reply));

  // GET /api/v1/projects/:id - Obter detalhes de um projeto
  app.get('/:id', (req, reply) => controller.getById(req, reply));

  // PATCH /api/v1/projects/:id - Atualizar metadados e congressos do projeto
  app.patch('/:id', (req, reply) => controller.update(req, reply));
}
