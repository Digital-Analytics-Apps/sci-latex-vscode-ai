import {
  CreateArticleGithubRepositoryParams,
  CreateArticleGithubRepositoryResult,
  IGithubProvider,
} from './github-provider.interface';

export class MockGithubProvider implements IGithubProvider {
  private repoCounter = 1000n;
  private issueCounter = 5000n;

  async createRepositoryWithTeXTemplate(
    params: CreateArticleGithubRepositoryParams
  ): Promise<CreateArticleGithubRepositoryResult> {
    const repoId = ++this.repoCounter;
    const repoName = `sci-paper-${params.articleId.slice(0, 8)}`;
    const projectV2Id = `PVT_kwDO${params.articleId.slice(0, 8)}`;

    const initialTitles = [
      'Seção 1: Introdução e Trabalhos Relacionados',
      'Seção 2: Metodologia e Formulacao',
      'Seção 3: Resultados e Experimentos',
      'Seção 4: Conclusão e Trab. Futuros',
    ];

    const initialIssues = initialTitles.map((title, index) => {
      const issueId = ++this.issueCounter;
      const issueNumber = index + 1;
      return {
        issueId,
        issueNumber,
        title,
        htmlUrl: `https://github.com/sci-latex-org/${repoName}/issues/${issueNumber}`,
      };
    });

    return {
      githubRepositoryId: repoId,
      githubRepoName: repoName,
      githubProjectV2Id: projectV2Id,
      initialIssues,
    };
  }

  async createProjectV2Board(_repositoryId: bigint, title: string): Promise<string> {
    return `PVT_board_${title.slice(0, 8)}`;
  }

  async createWorkItemIssue(
    repositoryId: bigint,
    _title: string,
    _body?: string
  ): Promise<{ issueId: bigint; issueNumber: number; htmlUrl: string }> {
    const issueId = ++this.issueCounter;
    const issueNumber = Math.floor(Math.random() * 100) + 1;
    return {
      issueId,
      issueNumber,
      htmlUrl: `https://github.com/sci-latex-org/repo-${repositoryId}/issues/${issueNumber}`,
    };
  }

  async updateProjectV2CustomField(
    _projectV2Id: string,
    _itemId: string,
    _fieldName: string,
    _value: string
  ): Promise<void> {
    // Mock no-op
  }

  async addIssueToProjectV2(_projectV2Id: string, _contentNodeId: string): Promise<void> {
    // Mock no-op
  }

  async createPullRequest(
    repositoryId: bigint,
    _title: string,
    _headBranch: string,
    _baseBranch: string
  ): Promise<{ prNodeId: string; prNumber: number }> {
    const prNumber = Math.floor(Math.random() * 50) + 10;
    return {
      prNodeId: `PR_node_${repositoryId}_${prNumber}`,
      prNumber,
    };
  }

  async mergePullRequest(_repositoryId: bigint, _prNumber: number): Promise<void> {
    // Mock no-op
  }
}
