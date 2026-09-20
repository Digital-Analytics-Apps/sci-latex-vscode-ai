# Módulo: github-integration

## Visão Geral

O módulo `github-integration` é o responsável por orquestrar toda a comunicação entre o **SCI-LaTeX** e o ecossistema do **GitHub** (GitHub Repositories, GitHub Projects v2, GitHub Issues e GitHub Pull Requests), além de gerenciar o recebimento idempotente de Webhooks, resiliência de concorrência e atualização das projeções locais.

---

## Princípios de Design Aplicados (SOLID & DRY)

1. **Single Responsibility Principle (SRP)**:
   - `GithubProvider`: Responsável exclusivo por abstrair e executar chamadas de API (REST/GraphQL) no GitHub via Octokit ou adaptador de Mock.
   - `WebhookInboxService`: Responsável por validar a assinatura HMAC (`X-Hub-Signature-256`), registrar o evento de forma idempotente (`delivery_id`) no banco e sinalizar falhas.
   - `EventProcessorService`: Responsável por interpretar a ação (`event_type + action`), filtrar eventos desordenados (`incoming.updated_at > current.updated_at`), atualizar as tabelas de projeção e emitir SSE.
   - `GithubIntegrationService`: Responsável pelo fluxo de alto nível de criação de artigos no GitHub (Repositório TeX, Project v2 e Work Items iniciais).

2. **Open/Closed Principle (OCP)** & **Dependency Inversion Principle (DIP)**:
   - `IGithubProvider` define o contrato de integração com o GitHub.
   - Suporte a dois provedores plugáveis sem alterar a regra de negócio:
     - `LiveOctokitGithubProvider`: Comunicação real via API REST/GraphQL do GitHub.
     - `MockGithubProvider`: Emulação determinística para ambiente de testes e desenvolvimento local offline.

3. **Don't Repeat Yourself (DRY)**:
   - Utilitário centralizado de verificação de assinatura HMAC.
   - Mapeamentos reutilizáveis de status do Project v2 (`NOT_REQUIRED`, `WAITING_NIT`, `APPROVED_NIT`, `REJECTED_NIT`).

---

## Contratos de Dados & Interfaces

```typescript
export interface CreateArticleGithubRepositoryParams {
  articleId: string;
  articleName: string;
  templateType: string;
}

export interface CreateArticleGithubRepositoryResult {
  githubRepositoryId: bigint;
  githubRepoName: string;
  githubProjectV2Id: string;
  initialIssueIds: bigint[];
}

export interface IGithubProvider {
  createRepositoryWithTeXTemplate(params: CreateArticleGithubRepositoryParams): Promise<CreateArticleGithubRepositoryResult>;
  createProjectV2Board(repositoryId: bigint, title: string): Promise<string>;
  createWorkItemIssue(repositoryId: bigint, title: string, body?: string): Promise<{ issueId: bigint; issueNumber: number; htmlUrl: string }>;
  updateProjectV2CustomField(projectV2Id: string, itemId: string, fieldName: string, value: string): Promise<void>;
  createPullRequest(repositoryId: bigint, title: string, headBranch: string, baseBranch: string): Promise<{ prNodeId: string; prNumber: number }>;
  mergePullRequest(repositoryId: bigint, prNumber: number): Promise<void>;
}
```

---

## Endpoints

### 1. Recebimento de Webhook do GitHub
`POST /api/v1/github/webhooks`

- **Headers**:
  - `x-github-delivery`: ID único da entrega.
  - `x-github-event`: Tipo do evento (ex: `issues`, `pull_request`, `projects_v2_item`).
  - `x-hub-signature-256`: Assinatura HMAC SHA256 do payload.
- **Resposta**: `200 OK` (`{ received: true, deliveryId: "..." }`)

---

## Fluxo de Processamento de Eventos (Event Processor)

```
HTTP Webhook (POST) ──► HMAC Validator ──► Webhook Inbox (Save) ──► Event Processor
                                                                          │
                                                      ┌───────────────────┴───────────────────┐
                                                      ▼                                       ▼
                                           Local Projection Update                       SSE Manager
                                        (incoming.updatedAt > current)                (Emit Realtime Event)
```
