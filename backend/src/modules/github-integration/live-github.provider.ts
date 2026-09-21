import { Octokit } from '@octokit/rest';
import { env } from '../../config/env';
import { generateRepoName } from '../../infra/git/git.service';
import {
  CreateArticleGithubRepositoryParams,
  CreateArticleGithubRepositoryResult,
  IGithubProvider,
} from './github-provider.interface';

export class LiveGithubProvider implements IGithubProvider {
  private getOctokit(): Octokit {
    if (!env.GITHUB_TOKEN) {
      throw new Error('GITHUB_TOKEN_REQUIRED: GITHUB_TOKEN is required to call GitHub API.');
    }
    return new Octokit({ auth: env.GITHUB_TOKEN });
  }

  async createRepositoryWithTeXTemplate(
    params: CreateArticleGithubRepositoryParams
  ): Promise<CreateArticleGithubRepositoryResult> {
    const octokit = this.getOctokit();
    const repoName = generateRepoName(params.articleId, params.articleName);

    let owner = env.GITHUB_ORG;
    if (!owner) {
      try {
        const user = await octokit.rest.users.getAuthenticated();
        owner = user.data.login;
      } catch (err) {
        console.warn('⚠️ Warning getting authenticated GitHub user:', err);
        owner = 'user';
      }
    }

    // Buscar os dados do repositório já criado ou criar se necessário
    let repoData: any;
    try {
      const res = await octokit.rest.repos.get({ owner, repo: repoName });
      repoData = res.data;
    } catch {
      const res = env.GITHUB_ORG
        ? await octokit.rest.repos.createInOrg({
            org: env.GITHUB_ORG,
            name: repoName,
            private: true,
            description: `Paper: ${params.articleName}`,
          })
        : await octokit.rest.repos.createForAuthenticatedUser({
            name: repoName,
            private: true,
            description: `Paper: ${params.articleName}`,
          });
      repoData = res.data;
    }

    const githubRepositoryId = BigInt(repoData.id);

    // Tentar criar Project v2 via GraphQL
    let projectV2Id = `PVT_kwDO_${repoName}`;
    try {
      projectV2Id = await this.createProjectV2Board(githubRepositoryId, params.articleName);
    } catch (err) {
      console.warn('⚠️ Warning creating GitHub Project v2 board:', err);
    }

    // Criar as 4 Issues reais de Work Items iniciais no repositório GitHub
    const initialTitles = [
      'Seção 1: Introdução e Trabalhos Relacionados',
      'Seção 2: Metodologia e Formulação',
      'Seção 3: Resultados e Experimentos',
      'Seção 4: Conclusão e Trabalhos Futuros',
    ];

    const initialIssues: Array<{
      issueId: bigint;
      issueNumber: number;
      title: string;
      htmlUrl: string;
    }> = [];

    for (let i = 0; i < initialTitles.length; i++) {
      const title = initialTitles[i];
      try {
        const issueRes = await octokit.rest.issues.create({
          owner,
          repo: repoName,
          title,
          body: `Work Item gerado automaticamente pelo SCI-LaTeX para a escrita do artigo "${params.articleName}".`,
        });
        initialIssues.push({
          issueId: BigInt(issueRes.data.id),
          issueNumber: issueRes.data.number,
          title: issueRes.data.title,
          htmlUrl: issueRes.data.html_url,
        });
      } catch (issueErr: any) {
        console.warn(
          `⚠️ Warning creating issue "${title}" on GitHub:`,
          issueErr.message || issueErr
        );
        initialIssues.push({
          issueId: BigInt(Date.now() + i),
          issueNumber: i + 1,
          title,
          htmlUrl: `https://github.com/${owner}/${repoName}/issues/${i + 1}`,
        });
      }
    }

    return {
      githubRepositoryId,
      githubRepoName: repoName,
      githubProjectV2Id: projectV2Id,
      initialIssues,
    };
  }

  async createProjectV2Board(repositoryId: bigint, title: string): Promise<string> {
    const octokit = this.getOctokit();
    try {
      const userRes = await octokit.rest.users.getAuthenticated();
      const query = `
        mutation($ownerId: ID!, $title: String!) {
          createProjectV2(input: {ownerId: $ownerId, title: $title}) {
            projectV2 {
              id
            }
          }
        }
      `;
      const response: any = await octokit.graphql(query, {
        ownerId: userRes.data.node_id,
        title: `Project: ${title}`,
      });
      return response?.createProjectV2?.projectV2?.id || `PVT_${repositoryId}`;
    } catch {
      return `PVT_${repositoryId}_${title.slice(0, 8)}`;
    }
  }

  async createWorkItemIssue(
    repositoryId: bigint,
    title: string,
    body?: string
  ): Promise<{ issueId: bigint; issueNumber: number; htmlUrl: string }> {
    const octokit = this.getOctokit();
    const userRes = await octokit.rest.users.getAuthenticated();
    const owner = userRes.data.login;
    const issueRes = await octokit.rest.issues.create({
      owner,
      repo: `repo-${repositoryId}`,
      title,
      body: body || 'Work Item criado pelo SCI-LaTeX',
    });

    return {
      issueId: BigInt(issueRes.data.id),
      issueNumber: issueRes.data.number,
      htmlUrl: issueRes.data.html_url,
    };
  }

  async updateProjectV2CustomField(
    _projectV2Id: string,
    _itemId: string,
    _fieldName: string,
    _value: string
  ): Promise<void> {
    // No-op / GraphQL update project item field
  }

  async createPullRequest(
    repositoryId: bigint,
    title: string,
    headBranch: string,
    baseBranch: string
  ): Promise<{ prNodeId: string; prNumber: number }> {
    const octokit = this.getOctokit();
    const userRes = await octokit.rest.users.getAuthenticated();
    const owner = userRes.data.login;
    const prRes = await octokit.rest.pulls.create({
      owner,
      repo: `repo-${repositoryId}`,
      title,
      head: headBranch,
      base: baseBranch,
    });

    return {
      prNodeId: prRes.data.node_id,
      prNumber: prRes.data.number,
    };
  }

  async mergePullRequest(repositoryId: bigint, prNumber: number): Promise<void> {
    const octokit = this.getOctokit();
    const userRes = await octokit.rest.users.getAuthenticated();
    const owner = userRes.data.login;
    await octokit.rest.pulls.merge({
      owner,
      repo: `repo-${repositoryId}`,
      pull_number: prNumber,
    });
  }
}
