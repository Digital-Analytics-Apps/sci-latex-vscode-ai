import { FastifyInstance } from 'fastify';
import { githubIntegrationService } from './github-integration.service';
import { webhooksController } from './webhooks.controller';

export async function githubIntegrationRoutes(fastify: FastifyInstance) {
  // Endpoint de recepção de Webhooks do GitHub
  fastify.post('/webhooks', (req, reply) => webhooksController.handleWebhook(req, reply));

  // Endpoint para listar os Work Items de um artigo
  fastify.get('/articles/:articleId/work-items', async (req, reply) => {
    const { articleId } = req.params as { articleId: string };
    const workItems = await githubIntegrationService.getArticleWorkItems(articleId);
    return reply.send({ workItems });
  });

  // Endpoint para disparar a configuração inicial da integração no GitHub
  fastify.post('/articles/:articleId/setup', async (req, reply) => {
    const { articleId } = req.params as { articleId: string };
    const body = (req.body as { name?: string }) || {};
    const integration = await githubIntegrationService.setupArticleGithubIntegration(
      articleId,
      body.name || 'Artigo TeX'
    );
    return reply.send({ integration });
  });
}
