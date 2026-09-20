import { prisma } from '../../db/prisma';
import { IGithubProvider } from './github-provider.interface';
import { MockGithubProvider } from './mock-github.provider';

export class GithubIntegrationService {
  constructor(private readonly provider: IGithubProvider = new MockGithubProvider()) {}

  /**
   * Configura o repositório, Project v2 e Work Items no GitHub para um Artigo TeX
   */
  async setupArticleGithubIntegration(articleId: string, articleName: string) {
    const result = await this.provider.createRepositoryWithTeXTemplate({
      articleId,
      articleName,
      templateType: 'IEEE',
    });

    const integration = await prisma.githubIntegration.create({
      data: {
        articleId,
        githubRepositoryId: result.githubRepositoryId,
        githubRepoName: result.githubRepoName,
        githubProjectV2Id: result.githubProjectV2Id,
      },
    });

    // Cria as projeções locais para os Work Items iniciais gerados
    const now = new Date();
    for (const issue of result.initialIssues) {
      await prisma.githubIssueProjection.upsert({
        where: { githubIssueId: issue.issueId },
        create: {
          githubIssueId: issue.issueId,
          githubRepositoryId: result.githubRepositoryId,
          issueNumber: issue.issueNumber,
          title: issue.title,
          state: 'open',
          htmlUrl: issue.htmlUrl,
          updatedAt: now,
        },
        update: {
          title: issue.title,
          state: 'open',
          updatedAt: now,
        },
      });
    }

    return integration;
  }

  /**
   * Obtém os Work Items (Projeções locais) de um artigo para exibição na Dashboard
   */
  async getArticleWorkItems(articleId: string) {
    const integration = await prisma.githubIntegration.findFirst({
      where: { articleId },
    });

    if (!integration) {
      return [];
    }

    const projections = await prisma.githubIssueProjection.findMany({
      where: { githubRepositoryId: integration.githubRepositoryId },
      orderBy: { issueNumber: 'asc' },
    });

    return projections.map((proj) => ({
      id: proj.githubIssueId.toString(),
      issueNumber: proj.issueNumber,
      title: proj.title,
      state: proj.state,
      htmlUrl: proj.htmlUrl,
      updatedAt: proj.updatedAt,
    }));
  }
}

export const githubIntegrationService = new GithubIntegrationService();
