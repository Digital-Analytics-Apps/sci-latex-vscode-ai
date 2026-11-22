import { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { verifyJwt } from '../../middlewares/auth.middleware';
import { requireAdmin } from '../../middlewares/rbac.middleware';
import { TemplatesController } from './templates.controller';

export const templatesRoutes: FastifyPluginAsyncZod = async (app) => {
  const controller = new TemplatesController();

  app.addHook('onRequest', verifyJwt);

  // GET /api/v1/templates - Listar todos os templates LaTeX disponíveis
  app.get(
    '/',
    {
      schema: {
        tags: ['Templates'],
        summary: 'Listar templates LaTeX disponíveis',
        description: 'Retorna todos os templates homologados no catálogo institucional.',
        security: [{ bearerAuth: [] }],
      },
    },
    controller.list.bind(controller)
  );

  // GET /api/v1/templates/:id - Obter detalhes de um template específico
  app.get(
    '/:id',
    {
      schema: {
        tags: ['Templates'],
        summary: 'Obter detalhes de um template LaTeX',
        security: [{ bearerAuth: [] }],
        params: z.object({
          id: z.string(),
        }),
      },
    },
    controller.getById.bind(controller)
  );

  // GET /api/v1/templates/:id/download - Obter URL assinada para download do pacote .zip (exclusivo ADMIN)
  app.get(
    '/:id/download',
    {
      preHandler: [requireAdmin],
      schema: {
        tags: ['Templates'],
        summary: 'Download do arquivo ZIP do template (exclusivo ADMIN)',
        security: [{ bearerAuth: [] }],
        params: z.object({
          id: z.string(),
        }),
      },
    },
    controller.download.bind(controller)
  );

  // POST /api/v1/templates/upload - Cadastrar / Sobrescrever template LaTeX (.zip) (exclusivo ADMIN)
  app.post(
    '/upload',
    {
      preHandler: [requireAdmin],
      schema: {
        tags: ['Templates'],
        summary: 'Fazer upload / sobrescrita de um template LaTeX (.zip) (exclusivo ADMIN)',
        description:
          'Recebe um pacote .zip com arquivos TeX (.tex, .cls, .sty, .bib), armazena no MinIO com nome dinâmico e registra metadados.',
        security: [{ bearerAuth: [] }],
      },
    },
    controller.upload.bind(controller)
  );

  // DELETE /api/v1/templates/:id - Excluir template LaTeX (exclusivo ADMIN)
  app.delete(
    '/:id',
    {
      preHandler: [requireAdmin],
      schema: {
        tags: ['Templates'],
        summary: 'Excluir template LaTeX do catálogo (exclusivo ADMIN)',
        security: [{ bearerAuth: [] }],
        params: z.object({
          id: z.string(),
        }),
      },
    },
    controller.delete.bind(controller)
  );
};
