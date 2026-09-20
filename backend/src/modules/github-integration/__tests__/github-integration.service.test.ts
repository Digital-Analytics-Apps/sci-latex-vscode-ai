import crypto from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { prisma } from '../../../db/prisma';
import { GithubIntegrationService } from '../github-integration.service';
import { MockGithubProvider } from '../mock-github.provider';
import { WebhookInboxService } from '../webhook-inbox.service';

describe('GithubIntegrationService', () => {
  it('deve configurar repositório, Project v2 e criar projeções locais para o artigo', async () => {
    // Cria equipe e projeto reais no banco de teste para satisfazer a FK do Prisma
    const user = await prisma.user.create({
      data: {
        email: `test-${Date.now()}@sci-latex.com`,
        name: 'Autor Teste',
        passwordHash: 'hash',
        role: 'AUTHOR',
      },
    });

    const team = await prisma.team.create({
      data: {
        name: `Equipe Teste ${Date.now()}`,
        coordinatorId: user.id,
      },
    });

    const project = await prisma.project.create({
      data: {
        name: 'Artigo TeX de Teste',
        gitRepoPath: `/git/test-${Date.now()}`,
        teamId: team.id,
      },
    });

    const mockProvider = new MockGithubProvider();
    const service = new GithubIntegrationService(mockProvider);

    const integration = await service.setupArticleGithubIntegration(project.id, project.name);

    expect(integration).toBeDefined();
    expect(integration.articleId).toBe(project.id);
    expect(integration.githubRepoName).toContain('sci-paper');

    const workItems = await service.getArticleWorkItems(project.id);
    expect(workItems.length).toBeGreaterThan(0);
    expect(workItems[0].title).toBeDefined();
  });
});

describe('WebhookInboxService', () => {
  it('deve validar corretamente a assinatura HMAC SHA-256', () => {
    const service = new WebhookInboxService();
    const payload = { hello: 'world' };
    const secret = 'super-secret';

    const hmac = crypto.createHmac('sha256', secret);
    const validSignature = `sha256=${hmac.update(JSON.stringify(payload)).digest('hex')}`;

    const isValid = service.verifySignature(payload, validSignature, secret);
    expect(isValid).toBe(true);

    const isInvalid = service.verifySignature(payload, 'sha256=invalida', secret);
    expect(isInvalid).toBe(false);
  });
});
