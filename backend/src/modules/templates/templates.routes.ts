import { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { verifyJwt } from '../../middlewares/auth.middleware';
import { TemplatesController } from './templates.controller';

export const templatesRoutes: FastifyPluginAsyncZod = async (app) => {
  const controller = new TemplatesController();

  app.addHook('onRequest', verifyJwt);

  // GET /api/v1/templates - Listar templates disponíveis (do sistema e do usuário)
  app.get(
    '/',
    {
      schema: {
        tags: ['Templates'],
        summary: 'Listar templates LaTeX disponíveis',
        description:
          'Retorna a lista de templates oficiais do sistema e templates customizados do usuário.',
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

  // POST /api/v1/templates/upload - Fazer upload de um template customizado (.zip)
  app.post(
    '/upload',
    {
      schema: {
        tags: ['Templates'],
        summary: 'Fazer upload de um template LaTeX customizado (.zip)',
        description:
          'Recebe um pacote .zip com arquivos TeX (.tex, .cls, .sty, .bib), armazena no MinIO e cadastra os metadados.',
        security: [{ bearerAuth: [] }],
      },
    },
    controller.upload.bind(controller)
  );
};
