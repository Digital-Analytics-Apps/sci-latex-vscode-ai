export interface CreateArticleGithubRepositoryParams {
  articleId: string;
  articleName: string;
  templateType: string;
}

export interface CreateArticleGithubRepositoryResult {
  githubRepositoryId: bigint;
  githubRepoName: string;
  githubProjectV2Id: string;
  initialIssues: Array<{
    issueId: bigint;
    issueNumber: number;
    title: string;
    htmlUrl: string;
  }>;
}

export interface IGithubProvider {
  createRepositoryWithTeXTemplate(
    params: CreateArticleGithubRepositoryParams
  ): Promise<CreateArticleGithubRepositoryResult>;
  createProjectV2Board(repositoryId: bigint, title: string): Promise<string>;
  createWorkItemIssue(
    repositoryId: bigint,
    title: string,
    body?: string
  ): Promise<{ issueId: bigint; issueNumber: number; htmlUrl: string }>;
  updateProjectV2CustomField(
    projectV2Id: string,
    itemId: string,
    fieldName: string,
    value: string
  ): Promise<void>;
  addIssueToProjectV2(projectV2Id: string, contentNodeId: string): Promise<void>;
  createPullRequest(
    repositoryId: bigint,
    title: string,
    headBranch: string,
    baseBranch: string
  ): Promise<{ prNodeId: string; prNumber: number }>;
  mergePullRequest(repositoryId: bigint, prNumber: number): Promise<void>;
}
