# ADR: Arquitetura GitHub-Native para Colaboração e Workflow de Artigos Científicos

**Status**: Aprovado como Diretriz Arquitetural Definitiva  
**Data**: 2026-09-20  
**Contexto**: Plataforma SCI-LaTeX para Gestão, Escrita TeX em Pods K8s e Revisão Institucional de Artigos Científicos.

---

## 1. Visão Geral e Fronteiras de Domínio

O **SCI-LaTeX** adota uma arquitetura **GitHub-Native**, estabelecendo uma divisão rigorosa de autoridades entre a plataforma de colaboração e versionamento (GitHub) e a plataforma acadêmica e operacional local (SCI-LaTeX).

```
                         SCI-LaTeX Backend
                              │
             ┌────────────────┼─────────────────┐
             │                │                 │
             ▼                ▼                 ▼
       Academic Domain   Workspace          Institutional
         PostgreSQL       K8s                Processes (NIT)
             │                │                 │
             └────────────────┼─────────────────┘
                              │
                              │
                     GitHub Integration (App / Octokit)
                              │
                              ▼
                         ┌──────────┐
                         │ GitHub   │
                         ├──────────┤
                         │ Repo     │
                         │ Issues   │
                         │ PRs      │
                         │ Projects │
                         └──────────┘
                              │
                         Webhooks
                              │
                              ▼
                       Webhook Inbox
                              │
                              ▼
                       Event Processor
                         │          │
                         ▼          ▼
                     Projection     SSE Manager
                         │          │
                         └────┬─────┘
                              ▼
                          React UI
```

### Regra de Fronteira de Domínio:
> **GitHub** é o *Source of Truth* dentro do domínio de **colaboração e versionamento baseado em Git** para código TeX, branches, commits, Work Items (Issues), Pull Requests (revisões de integração) e acompanhamento de planejamento (Projects v2).
>
> **SCI-LaTeX (PostgreSQL + K8s)** é o *Source of Truth* para o **domínio acadêmico, infraestrutura e processos institucionais**: metadados do artigo, participantes e funções acadêmicas, processo oficial e protocolo do NIT, orquestração de Pods K8s, sessões do editor `code-server`, templates TeX e homologação de Release Candidates.

---

## 2. Invariantes Arquiteturais

Para garantir a longevidade e a consistência da arquitetura, as seguintes 10 regras são imutáveis:

1. **GitHub é o Source of Truth dentro do domínio de colaboração e versionamento** para código, branches, commits, Issues, PRs e itens do Project v2.
2. **PostgreSQL não mantém cópia autoritativa** de Issues, PRs ou Tasks. Nenhuma tabela relacional local substitui a entidade Work Item do GitHub.
3. **Local Projections são estritamente somente-leitura** sob a perspectiva do domínio e servem apenas para otimização de leitura e UI.
4. **O processamento de Webhooks deve ser tolerante à entrega fora de ordem**, aplicando somente eventos que representem um estado mais recente que a projection atual (`incoming.updated_at > current.updated_at`).
5. **Processamento de Webhooks deve ser estritamente idempotente** (garantido via `delivery_id` e validação prévia de assinatura HMAC `X-Hub-Signature-256`).
6. **Workspaces K8s e Pods não representam estado de negócio**; são recursos temporários de infraestrutura.
7. **Release Candidate referencia um snapshot imutável** identificado por `commit_sha`, registrado no momento da criação, originado da branch `dev`.
8. **Permissões Acadêmicas SCI-LaTeX não são inferidas exclusivamente das permissões do GitHub**. As operações de merge exigem dupla camada de proteção: validação acadêmica no SCI-LaTeX + Branch Protection Rulesets no GitHub.
9. **Labels do GitHub não representam estados estruturados** que já possuam Custom Fields no Project v2 (ex: estado do NIT).
10. **Seções TeX (`sections/`) não possuem relacionamento 1:1 obrigatório com Work Items**. Um Work Item representa uma entrega/modificação e pode impactar múltiplos arquivos.

---

## 3. Estrutura do Domínio do Artigo

Diferenciamos de forma explícita o **SCI-LaTeX Article** (domínio acadêmico) do **GitHub Project v2** (quadro de colaboração):

```
SCI-LaTeX Article
 ├── Metadados Acadêmicos (Título, Resumo, Área, Orientador, Instituição) [PostgreSQL]
 ├── Participantes & Funções Acadêmicas (Autor, Revisor, Coordenador) [PostgreSQL]
 ├── Processo Institucional NIT (Protocolo, Anexos, Datas, Notas) [PostgreSQL]
 ├── Orquestração de Workspaces (Pods K8s, Container Image, Session Token) [PostgreSQL / K8s]
 ├── Release Candidates (Unidade de homologação acadêmica do artigo completo) [PostgreSQL]
 └── GitHub Integration (github_integration)
       ├── GitHub Repository (main.tex, sections/, IEEEtran.cls, .gitignore)
       ├── GitHub Issues (Work Items / Tarefas de escrita e ajustes)
       ├── Branches (`task/123-introducao`, `dev`, `main`)
       ├── Commits & Diffs de Versão
       ├── Pull Requests (Revisão de pares / Peer Review de código)
       └── GitHub Project v2 (Planejamento Kanban / Roadmap)
```

---

## 4. Integração com GitHub Projects v2

### Distinção entre Propriedades do Objeto e Campos do Project v2
O GitHub Projects v2 referencia Issues e Pull Requests e fornece campos próprios de planejamento. É importante notar que **não existe uma sincronização bidirecional genérica de todos os campos via uma única chamada de API**:
* **Propriedades da Issue / PR** (ex: `assignees`, `labels`, `milestone`, `repository`): Pertencem diretamente ao objeto Issue/PR. Sua alteração exige as mutations ou endpoints GraphQL/REST específicos da Issue/PR (`addAssigneesToAssignable`, `addLabelsToLabelable`, etc.).
* **Campos do Project v2** (ex: `Status`, `Iteration`, `Custom Fields`): Pertencem ao item dentro do Project v2. Suas alterações exigem a mutation `updateProjectV2ItemFieldValue`.

---

## 5. Modelagem da Entidade de Trabalho: Issue como Work Item

No SCI-LaTeX, a **GitHub Issue é a unidade primária de trabalho (Work Item)**. 

No banco relacional local, armazenamos apenas as tabelas de domínio e mapeamento/projeções observáveis:

```sql
-- Mapeamento da integração com o repositório e projeto no GitHub
CREATE TABLE github_integration (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id UUID NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
  github_repository_id BIGINT NOT NULL,
  github_repo_name TEXT NOT NULL,
  github_project_v2_id TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Projeções locais (Local Projections) - Com campos de observabilidade operacional
CREATE TABLE github_issue_projection (
  github_issue_id BIGINT PRIMARY KEY,
  github_repository_id BIGINT NOT NULL,
  issue_number INT NOT NULL,
  title TEXT NOT NULL,
  state TEXT NOT NULL,
  author_github_username TEXT,
  assignee_github_username TEXT,
  html_url TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  last_github_event_at TIMESTAMPTZ,
  last_synced_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE github_project_item_projection (
  github_project_item_id TEXT PRIMARY KEY,
  github_project_v2_id TEXT NOT NULL,
  github_issue_id BIGINT NOT NULL,
  status_value TEXT,
  nit_status_value TEXT,
  updated_at TIMESTAMPTZ NOT NULL,
  last_synced_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 6. Fluxo de Execução e Dupla Camada de Proteção de Branch

```
GitHub Issue #123 (Work Item)
    │
    │ 1. Clique "Start Workspace" na UI do SCI-LaTeX
    ▼
Criar Branch `task/123-introducao`
    │
    │ 2. Backend SCI-LaTeX provisiona infraestrutura
    ▼
Workspace K8s (Pod + Editor VS Code)
    │
    │ 3. Autor escreve o documento TeX
    ▼
Commits na branch `task/123-introducao`
    │
    │ 4. Clique "Solicitar Revisão"
    ▼
Pull Request #456 (da branch da task para `dev`)
    │
    │ 5. Peer Review entre Autores/Revisores
    ▼
    ├── Changes Requested ──► Novos Commits na Branch ──┐
    │                                                   │
    └── Approved ───────────────────────────────────────┘
          │
          │ 6. Validação Dupla de Proteção:
          │    - Camada 1: Backend SCI-LaTeX valida Papel Acadêmico no PostgreSQL
          │    - Camada 2: GitHub Branch Protection Ruleset valida status de CI & PR
          ▼
    Merge PR na branch `dev` (GitHub)
          │
          │ 7. Artigo atinge marco de versão
          ▼
Release Candidate (Snapshot no PostgreSQL vinculado a um commit_sha imutável da `dev`)
          │
          │ 8. Homologação final pelo Revisor/Coordenador
          ▼
    Merge da `dev` para a `main` (Publicação do Artigo)
```

### Regras de Proteção de Branches (GitHub Rulesets):
* **Branch `dev`**: Proibido `push` direto. Exige Pull Request com aprovação de Peer Review e build de CI aprovado.
* **Branch `main`**: Proibido `push` direto. Alterações permitidas apenas via PR de Release Candidate homologado.

---

## 7. Modelagem do Processo do NIT (Núcleo de Inovação Tecnológica)

```sql
CREATE TABLE nit_process (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id UUID NOT NULL REFERENCES articles(id),
  github_pr_node_id TEXT NOT NULL,
  status TEXT NOT NULL, -- WAITING_NIT, APPROVED_NIT, REJECTED_NIT
  sent_at TIMESTAMPTZ NOT NULL,
  sent_notes TEXT,
  approved_at TIMESTAMPTZ,
  response_notes TEXT,
  protocol_number TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 8. Arquitetura Orientada a Eventos: Webhook Inbox & Event Processor

```sql
CREATE TABLE github_webhook_event (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  delivery_id TEXT UNIQUE NOT NULL,
  event_type TEXT NOT NULL,
  action TEXT,
  signature_valid BOOLEAN NOT NULL,
  installation_id BIGINT NOT NULL,
  payload JSONB NOT NULL,
  received_at TIMESTAMPTZ DEFAULT NOW(),
  processed_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'PENDING'
);
```

### 1. Processamento e Idempotência
* **Validação de Assinatura**: Todo evento recebido tem sua assinatura HMAC (`X-Hub-Signature-256`) calculada. Se inválida, `signature_valid = false` e o evento é descartado sem processamento.
* **Resolução de Concorrência (Out-of-Order Events)**: O Event Processor aplica a regra de atualização condicional:
  ```python
  if incoming_event.updated_at > projection.updated_at:
      apply_projection_update()
  else:
      ignore_outdated_event()
  ```

### 2. Estratégia do Reconciliation Engine (Convergência Eventual)
* **Fluxo Unidirecional**: A reconciliação é estritamente $GitHub \rightarrow Local Projection$.
* **Gatilhos**: Cronjob periódico (ex: a cada hora), Dead-Letter Queue de Webhooks (`status = 'FAILED'`), inicialização de artigo ou acionamento administrativo sob demanda.

---

## 9. Permissões da GitHub App & Mapeamento de Papéis (Least Privilege)

### Matriz de Permissões da GitHub App

| Recurso | Permissão | Justificativa |
| :--- | :--- | :--- |
| **Repository Metadata** | `Read-only` | Leitura de metadados gerais do repositório. |
| **Contents** | `Read & Write` | Criação de arquivos TeX iniciais, branches e commits. |
| **Issues** | `Read & Write` | Gerenciamento do ciclo de vida dos Work Items. |
| **Pull Requests** | `Read & Write` | Abertura e tramitação de revisões de código TeX. |
| **Projects (Organization)**| `Read & Write` | Leitura e atualização de quadros e Custom Fields do Project v2. |
| **Workflows** | `Read-only` | Acompanhamento do status de compilações do GitHub Actions (Write concedido apenas sob demanda explícita). |

### Isolamento de Permissões Acadêmicas
> **Permissões do GitHub $\neq$ Permissões Acadêmicas do SCI-LaTeX**
> 
> Ter permissão de escrita no repositório GitHub não concede a um usuário a autoridade acadêmica de "Revisor" ou "Coordenador". O backend do SCI-LaTeX valida rigorosamente os papéis cadastrados no PostgreSQL antes de invocar as APIs do GitHub.

---

## 10. Arquitetura Modular e Hierarquia de Dependências

O backend é organizado em quatro módulos estritamente desacoplados:

```
             Academic Domain (Articles, Participants, NIT, Release Candidates)
                    │
             ┌──────┴──────┐
             ▼             ▼
      GitHub Integration   Workspace Orchestrator
             │             │
             ▼             ▼
      Local Projections    Kubernetes Pods
             │
             ▼
        SSE Manager ──► React UI
```

* **Regra de Dependência**: O módulo `Academic Domain` **nunca importa bibliotecas do GitHub (Octokit) nem tipos da API do GitHub diretamente**. Todas as interações com o GitHub passam pelas interfaces expostas pelo módulo `GitHub Integration`.

---

## 11. Regras de Consistência e Recuperação

1. **GitHub é a autoridade máxima** para objetos de colaboração e versionamento.
2. **Local Projections são derivadas e descartáveis**.
3. **Nenhuma operação de negócio depende exclusivamente da projection** quando a informação autoritativa estiver disponível no GitHub.
4. **Webhooks são tratados como mecanismo de atualização**, não como garantia absoluta de entrega.
5. **Todo webhook é idempotente** através do `delivery_id` e validação prévia de assinatura HMAC.
6. **Eventos fora de ordem não podem regredir a projection** (`incoming.updated_at > current.updated_at`).
7. **Reconciliation Engine pode reconstruir integralmente as projections** a partir do GitHub.
8. **Falhas de processamento em webhooks devem ser observáveis** (`status = 'FAILED'`) e recuperáveis.
9. **Release Candidate referencia um commit SHA imutável**, nunca apenas o nome de uma branch.
10. **Operações de merge são protegidas simultaneamente por**:
    - Validação de regra/papel acadêmico no backend do SCI-LaTeX;
    - Proteções e Rulesets de branch no GitHub.
