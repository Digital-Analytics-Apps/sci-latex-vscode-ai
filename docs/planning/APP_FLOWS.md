# 🔄 Documento de Fluxos da Aplicação e Jornadas de Usuário (`APP_FLOWS.md`)

**Produto:** SCIA — Scientific Collaboration + AI (Plataforma Web Self-Hosted)  
**Versão:** 2.0 (Consolidada com ADRs 001 a 006, specs v2.0 e TRD v2.0)  
**Status:** Aprovado / Em Desenvolvimento Ativo  
**Documentos Relacionados:**  
* 📄 [`PRD.md`](file:///home/gilson-russo/development/professional/sci-latex-vscode/docs/planning/PRD.md) — Documento de Requisitos de Produto (Visão, Personas & 7 Fases)  
* ⚙️ [`TRD.md`](file:///home/gilson-russo/development/professional/sci-latex-vscode/docs/planning/TRD.md) — Documento de Requisitos Técnicos (Arquitetura, K8s, Git & APIs)  
* 🛠️ [`WORKFLOW.md`](file:///home/gilson-russo/development/professional/sci-latex-vscode/docs/planning/WORKFLOW.md) — Fluxo de Trabalho de Desenvolvimento Git/Jira  
* 📌 [`STATUS.md`](file:///home/gilson-russo/development/professional/sci-latex-vscode/docs/planning/STATUS.md) — Status Atual & Checkpoint de Retomada  

---

## 📑 1. Identificação, Propósito & Visão Geral dos Fluxos

### 1.1 Propósito
O **Documento de Fluxos da Aplicação (App Flows)** mapeia detalhadamente todas as **jornadas de usuário (User Journeys)**, **transições de máquina de estados**, **interações de tela**, **comportamento de modais** e **processos assíncronos em tempo real (SSE & K8s)** da plataforma SCIA. Ele serve como o guia visual e operacional definitivo para desenvolvedores frontend, backend, UX designers e QA garantirem conformidade estrita entre a experiência de usuário e as regras de negócio.

### 1.2 Os Quatro Pilares da Experiência SCIA
```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                               OS 4 PILARES DE FLUXO SCIA                               │
├──────────────────────────┬─────────────────────────────┬───────────────────────────────┤
│ 1. Escrita Zen & Rápida  │  2. Revisão Viva Side-by-Side│  3. Governança Rígida NIT     │
│ VS Code nativo no iframe,│ Comparador Diff LaTeX + PDF │ Gatekeeper 1 (NIT) e          │
│ auto-build no Ctrl+S e   │ compilado da versão oficial,│ Gatekeeper 2 (Congresso) com  │
│ commits silenciosos.     │ drawer de notas por linha.  │ travas sequenciais automáticas│
├──────────────────────────┴─────────────────────────────┴───────────────────────────────┤
│ 4. Governança de Prazos & Copilot com IA: Dual View [Fluxo] vs [Timeline], alertas de  │
│ estouro de datas e assistência multi-agente (OpenAlex / Semantic Scholar).             │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 🗺️ 2. Mapa de Navegação & Hierarquia de Telas (Sitemap)

```mermaid
graph TD
    Login["/login<br/>Tela de Autenticação JWT"] --> Resolver["PersonaRootResolver<br/>(Resolução por Role)"]
    
    Resolver -->|AUTHOR| AuthorHome["/<br/>AuthorArticlesPage (Meus Artigos)"]
    Resolver -->|REVIEWER| ReviewerHome["/reviews<br/>ReviewsListPage (PRs p/ Avaliação)"]
    Resolver -->|COORDINATOR| CoordHome["/coordinator<br/>CoordinatorDashboardPage (Equipes & Prazos)"]
    Resolver -->|MANAGER| ManagerHome["/manager<br/>ManagerDashboardPage (Ciclo & Metas)"]

    AuthorHome --> ArticleDetail["/articles/:projectId<br/>ArticleDetailPage (Gantt, Etapas & Tarefas)"]
    ArticleDetail --> Workspace["/workspace/:projectId/task/:taskId<br/>WorkspacePage (Editor VS Code + Topbar)"]

    ReviewerHome --> ReviewDetail["/reviews/:prId<br/>ReviewDetailPage (Diff LaTeX + PDF + Parecer)"]
    
    CoordHome --> ArticleDetail
    ManagerHome --> ManageTeamModal["ManageTeamModal<br/>(Cotas, Membros & Metas)"]

    ArticleDetail --> ModalsAuthor["Modais de Autor:<br/>CreateStageModal / CreateTaskModal /<br/>AddMemberModal / ProjectSettingsModal /<br/>ReleaseCandidatesModal / PostSubmissionModal"]
    Workspace --> ModalsWorkspace["Modais de Sessão:<br/>SaveProgressModal / CreatePRModal"]
```

---

## 🔄 3. O Fluxo Macro do Artigo Científico: 7 Fases & 2 Gatekeepers

O artigo científico obedece a uma máquina de estados linear estrita em 7 fases, com duas barreiras institucionais invioláveis (**Gatekeepers**):

```mermaid
stateDiagram-v2
    direction TB
    
    [*] --> Phase1_Setup: Fase 1: Criação, Ciclo Acadêmico & Timeline
    Phase1_Setup --> Phase2_Writing: Fase 2: Escrita Paralela & Commits Silenciosos
    Phase2_Writing --> Phase3_PeerReview: Fase 3: Revisão Acadêmica Contínua (Task PRs)
    Phase3_PeerReview --> Phase2_Writing: Ajustes Solicitados (Round v2)
    Phase3_PeerReview --> Phase2_Writing: Merge da Seção na dev
    
    Phase2_Writing --> Phase4_GatekeeperNIT: 100% das Etapas de Escrita Concluídas
    note right of Phase4_GatekeeperNIT
        🔒 GATEKEEPER 1: Parecer do NIT
        A solicitação é bloqueada até que
        todas as tarefas de conteúdo estejam MERGED.
    end note

    Phase4_GatekeeperNIT --> Phase5_AuthorMerge: Parecer Aprovado (APPROVED_NIT)
    Phase4_GatekeeperNIT --> Phase2_Writing: Parecer com Inconformidades (Ajustes)

    Phase5_AuthorMerge --> Phase6_GatekeeperSubmission: Fase 5: Merge na dev/main
    
    note right of Phase6_GatekeeperSubmission
        🔒 GATEKEEPER 2: Submissão ao Congresso Alvo
        Envio oficial bloqueado estritamente
        até que o NIT aprove o registro formal.
    end note

    Phase6_GatekeeperSubmission --> Phase7_PostSubmission: Fase 6: Envio ao Congresso Alvo
    
    Phase7_PostSubmission --> Decision_Accepted: Cenário A: Artigo Aceito
    Phase7_PostSubmission --> Decision_Revisions: Cenário B: Revisão Solicitada
    Phase7_PostSubmission --> Decision_Rejected: Cenário C: Artigo Rejeitado

    Decision_Accepted --> Published: Metadados Finais (DOI & Camera-Ready)
    Decision_Revisions --> Phase2_Writing: Correções v2 no Mesmo Congresso
    Decision_Rejected --> Phase1_Setup: Submissão ao Congresso Backup ou Novo
    
    Published --> [*]
```

---

## 🔑 4. Fluxo 1: Autenticação, Sessão e Resolução de Papel (Login & RBAC)

```mermaid
sequenceDiagram
    autonumber
    actor User as Pesquisador / Usuário
    participant SPA as React Frontend
    participant Gateway as Fastify Backend
    participant DB as PostgreSQL (Prisma)
    
    User->>SPA: Acessa /login e digita e-mail e senha
    SPA->>Gateway: POST /api/v1/auth/login { email, password }
    Gateway->>DB: Busca User por e-mail e valida hash de senha (Argon2/bcrypt)
    alt Credenciais Inválidas
        Gateway-->>SPA: HTTP 401 Unauthorized { message: "Credenciais inválidas" }
        SPA-->>User: Exibe mensagem de erro no formulário
    else Credenciais Válidas
        Gateway->>DB: Cria novo registro em Session (refreshToken)
        Gateway-->>SPA: HTTP 200 { user, accessToken } + Set-Cookie: refreshToken (HttpOnly)
        SPA->>SPA: Armazena user e token no authSlice (Redux)
        SPA->>SPA: Executa PersonaRootResolver com base em user.role
        alt Role == AUTHOR
            SPA-->>User: Redireciona para / (AuthorArticlesPage)
        else Role == REVIEWER
            SPA-->>User: Redireciona para /reviews (ReviewsListPage)
        else Role == COORDINATOR
            SPA-->>User: Redireciona para /coordinator (CoordinatorDashboardPage)
        else Role == MANAGER
            SPA-->>User: Redireciona para /manager (ManagerDashboardPage)
        end
    end
```

### Regras de Negócio do Fluxo de Autenticação:
1. **Cookies HttpOnly:** O `refreshToken` é armazenado em cookie seguro `HttpOnly`, invulnerável a ataques XSS via JavaScript.
2. **Renovação Transparente (Silent Refresh):** O interceptor HTTP (`src/services/api.ts`) captura respostas `401 Unauthorized`, aciona automaticamente `POST /api/v1/auth/refresh` com o cookie e reprocessa a requisição original sem deslogar o usuário.
3. **Proteção de Rota (`ProtectedRoute`):** Caso o usuário tente acessar manualmente uma URL sem possuir a role exigida (ex: Autor acessando `/manager`), o componente exibe feedback de acesso negado e redireciona para sua home canônica.

---

## 🚀 5. Fluxo 2: Onboarding & Criação do Artigo Científico

Este fluxo abrange desde a parametrização inicial até o provisionamento automático de repositório no GitHub e a geração do cronograma de etapas paralelas.

```mermaid
flowchart TD
    Start([Início: Autor clica em 'Novo Artigo']) --> Choice{Tipo de Criação?}
    
    Choice -->|Modal Rápido| ModalFlow[1. Formulário CreateProjectModal]
    Choice -->|Com Assistência de IA| AIFlow[2. Chat Copilot Onboarding]
    
    AIFlow --> LangGraph[Supervisor LangGraph coordena agentes:<br/>IdeaRefiner + SearchSpecialist + Curation]
    LangGraph --> AutoPopulate[Preenche Título, Resumo, Template e Congresso Alvo]
    AutoPopulate --> SubmitCreation
    
    ModalFlow --> SubmitCreation[Autor preenche Título, Equipe, Ciclo Acadêmico,<br/>Template TeX e Datas dos Congressos Alvo e Backup]
    
    SubmitCreation --> BackendReq[Fastify: POST /api/v1/projects]
    
    subgraph "Provisionamento Automatizado no Backend"
        BackendReq --> GitHubCall[Octokit: Cria repositório privado no GitHub<br/>sci-paper-slug-hash]
        GitHubCall --> GitInit[GitService clona template .cls selecionado<br/>IEEE / ACM / SBC / Springer]
        GitInit --> GitPush[Commit inicial de main.tex e references.bib<br/>Criação das branches 'main' e 'dev']
        GitPush --> DBInsert[Prisma: Cria Project, ProjectMember e ProjectStage]
        DBInsert --> StagesGen[Gera Etapas Preliminares:<br/>1. Introdução<br/>2. Metodologia<br/>3. Resultados<br/>4. Análise NIT 🔒<br/>5. Submissão ao Congresso 🔒]
    end
    
    StagesGen --> EndSuccess([Redireciona para /articles/:projectId<br/>Visualização Gantt Ativa])
```

### Regras de Negócio da Criação do Artigo:
1. **Nome Único do Repositório:** O nome no GitHub adota o padrão `sci-paper-<slug-do-titulo>-<hash-8-chars>`, garantindo unicidade mesmo com títulos semelhantes.
2. **Template Auto-contido:** O arquivo de classe (`.cls` ou `.sty`) selecionado é gravado fisicamente na raiz do repositório, garantindo que o TeX Live compile o documento de forma autônoma sem dependências externas.
3. **Branches Padrão:** O repositório nasce com a branch `main` (protegida para releases e submissões oficiais) e a branch `dev` (trunk de integração das tarefas em andamento).

---

## ✍️ 6. Fluxo 3: Escrita Paralela do Autor no Workspace VS Code

O Autor escreve em um ambiente VS Code (`code-server`) isolado em container Kubernetes, com auto-build de PDF e commits com classificação semântica de arquivos.

```mermaid
sequenceDiagram
    autonumber
    actor Author as Autor / Pesquisador
    participant Frontend as WorkspacePage (SPA)
    participant Gateway as Fastify Proxy (/editor-proxy)
    participant K8s as K8sPodManager (KinD)
    participant Editor as code-server Pod (TeX Live)
    participant Git as GitService & GitHub

    Author->>Frontend: Clica em "Abrir Editor" na tarefa (task/123-intro)
    Frontend->>Gateway: Carrega Iframe: GET /editor-proxy/:projectId?taskId=:taskId&stageId=:stageId
    Gateway->>K8s: ensureTaskWorkspace(projectId, taskId, userId, stageId)
    
    alt Pod Ativo Existe para esta Tarefa
        K8s-->>Gateway: Retorna endereço ClusterIP do Pod existente
    else Sem Pod Ativo
        K8s->>K8s: Reivindica Pod pré-aquecido da Warm Pool (sci-workspace-warm-*)
        K8s->>K8s: Ajusta volumeMount.subPath para projects/:id/stages/:stageId/tasks/:taskId
        K8s->>Git: git clone --branch task/... da URL do GitHub
        K8s-->>Gateway: Retorna Pod pronto (WorkspaceStatus.READY)
    end
    
    Gateway-->>Frontend: Estabelece Reverse Proxy (@fastify/http-proxy) + WebSockets
    Frontend-->>Author: Exibe VS Code Zen Mode no Iframe com main.tex carregado

    loop Ciclo de Edição Contínua
        Author->>Editor: Digita código TeX e pressiona Ctrl+S (Salvar)
        Editor->>Editor: LaTeX Workshop compila instantaneamente via TeX Live local
        Editor-->>Author: Atualiza visualização de main.pdf na aba lateral do editor
    end

    Author->>Frontend: Clica em "Salvar Progresso" na Topbar do SCIA
    Frontend->>Gateway: GET /api/v1/projects/:id/tasks/:taskId/diff-summary
    Gateway->>Git: Executa git diff HEAD na working tree da tarefa
    Git-->>Gateway: Retorna arquivos alterados com adições e deleções
    Gateway->>Gateway: ClassificationService categoriza arquivos (Seção, Figuras, Referências)
    Gateway-->>Frontend: Retorna resumo factual com descrição sugerida
    Frontend-->>Author: Abre SaveProgressModal com resumo formatado
    Author->>Frontend: Confirma salvamento (com ou sem mensagem manual)
    Frontend->>Gateway: POST /api/v1/projects/:id/tasks/:taskId/commit
    Gateway->>Git: Executa git commit silencioso (--author="Nome <email>") e git push
    Gateway->>Git: Cria/Atualiza Draft Pull Request no GitHub (draft: true)
    Gateway->>DB: Atualiza PullRequest (status: DRAFT) e Workspace (status: READY)
    Gateway-->>Frontend: Sucesso! Notifica que o progresso está salvo e protegido no GitHub
```

### Regras de Negócio da Escrita e Salvamento:
1. **Compilação sem Filas:** Ao salvar (`Ctrl+S`), a extensão LaTeX Workshop compila o documento diretamente no container em menos de 2 segundos. Não há envio de mensagens para brokers externos de recompilação.
2. **Linha de Base do Diff:** O cálculo de progresso é sempre relativo a `git diff HEAD` daquela tarefa. O pesquisador vê apenas o que modificou desde o último salvamento.
3. **Classificação Amigável:** Caminhos técnicos como `sections/01_intro.tex` são apresentados como `"Seção Introdução"`, e `references.bib` como `"Referências Bibliográficas"`.
4. **Draft PR Permanente:** Cada salvamento de progresso sincroniza o Draft PR no GitHub, garantindo que a equipe acompanhe a evolução do código sem risco de perda de trabalho.

---

## 🔍 7. Fluxo 4: Revisão Acadêmica Contínua (Peer Review & Diff Side-by-Side)

Processo de avaliação vivo acionado em cada sub-tarefa. O Revisor analisa as alterações em uma interface especializada lado a lado.

```mermaid
sequenceDiagram
    autonumber
    actor Author as Autor
    participant Frontend as Interface SCIA (SPA)
    participant Gateway as Fastify Backend
    participant SSE as SSE Hub
    actor Reviewer as Revisor Acadêmico
    participant DB as PostgreSQL

    Author->>Frontend: Clica em "Enviar p/ Revisão" na Topbar da Workspace
    Frontend->>Gateway: POST /api/v1/pull-requests/:id/ready-for-review
    Gateway->>DB: Atualiza PullRequest (status: UNDER_REVIEW)
    Gateway->>Gateway: Atribui Revisor do artigo (se não especificado)
    Gateway->>DB: Grava ReviewRound inicial com submittedCommitHash
    Gateway->>SSE: Broadcast de evento PR_OPENED para todos os membros
    SSE-->>Reviewer: Notificação visual em tempo real na tela
    SSE-->>Frontend: Topbar atualiza estado para "Em Revisão"

    Reviewer->>Frontend: Acessa /reviews/:prId (ReviewDetailPage)
    Frontend->>Gateway: GET /api/v1/pull-requests/:prId/details
    Gateway-->>Frontend: Retorna diff unificado, dados do PR e URL do PDF compilado
    Frontend-->>Reviewer: Renderiza Tela Side-by-Side:
    Note over Frontend,Reviewer: Esquerda: Diff visual LaTeX com linhas coloridas<br/>Direita: Visualizador do PDF oficial compilado da submissão<br/>Gaveta Lateral: Histórico de comentários por linha

    Reviewer->>Frontend: Clica em uma linha do Diff e digita apontamento
    Frontend->>Gateway: POST /api/v1/pull-requests/:prId/comments { lineNumer, comment }
    Gateway->>DB: Persiste ReviewComment associado ao ReviewRound

    alt Revisor Solicita Ajustes
        Reviewer->>Frontend: Seleciona "Solicitar Ajustes" no modal de conclusão
        Frontend->>Gateway: POST /api/v1/pull-requests/:prId/review-decision { decision: "CHANGES_REQUESTED" }
        Gateway->>DB: Atualiza PullRequest (status: CHANGES_REQUESTED)
        Gateway->>SSE: Broadcast de evento PR_CHANGES_REQUESTED
        SSE-->>Author: Notificação: "Revisor solicitou correções na tarefa"
        Note over Author: Autor reabre a workspace, corrige os apontamentos e salva o progresso (Round v2)
    else Revisor Aprova a Tarefa
        Reviewer->>Frontend: Seleciona "Aprovar Tarefa" no modal de conclusão
        Frontend->>Gateway: POST /api/v1/pull-requests/:prId/review-decision { decision: "APPROVED" }
        Gateway->>DB: Atualiza PullRequest (status: APPROVED)
        Gateway->>SSE: Broadcast de evento PR_APPROVED
        SSE-->>Author: Notificação: "Tarefa aprovada pelo revisor! Botão Realizar Merge liberado."
    end
```

### Regras de Negócio da Revisão:
1. **SHA Imutável:** A tela de revisão do Revisor é congelada no commit exato submetido pelo Autor (`submittedCommitHash`). Se o autor continuar digitando em sua workspace local, a revisão não é alterada dinamicamente.
2. **Histórico por Rodadas (`ReviewRound`):** Caso o revisor solicite ajustes, as correções subsequentes criam um novo `ReviewRound` (ex: Rodada 2), preservando o histórico completo de pareceres e réplicas anteriores.
3. **Habilitação de Botões Guiada pelo Domínio:** O botão "Realizar Merge" no painel do autor permanece estritamente bloqueado enquanto `activePR.status !== APPROVED`.

---

## 🔀 8. Fluxo 5: Merge pelo Autor & Limpeza de Pod (Workspace Cleanup)

O encerramento de uma sub-tarefa de escrita é executado pelo próprio Autor após a aprovação formal do Revisor.

```mermaid
flowchart TD
    Start([Autor clica em 'Realizar Merge' na Topbar]) --> CheckStatus{activePR.status === APPROVED?}
    
    CheckStatus -->|Não| Blocked[Botão Desabilitado / Ação Bloqueada]
    CheckStatus -->|Sim| OpenModal[Abre Modal de Confirmação de Merge]
    
    OpenModal --> Confirm[Autor confirma mesclagem da seção]
    Confirm --> BackendCall[Fastify: POST /api/v1/projects/:id/tasks/:taskId/merge]
    
    subgraph "Execução Atômica de Merge e Limpeza"
        BackendCall --> GitMerge[Octokit / GitService: Executa git merge da branch da tarefa na dev]
        GitMerge --> DeleteBranch[Octokit: Remove a branch remota temporária do GitHub]
        DeleteBranch --> ReleasePod[K8sPodManager: releasePodForProject - Devolve/destrói Pod]
        ReleasePod --> CleanStorage[Limpa diretório/PVC temporário da tarefa no host]
        CleanStorage --> UpdateDB[Prisma: Task.status = MERGED, Workspace.status = TERMINATED]
        UpdateDB --> Audit[AuditLog: Grava registro de merge com usuário e timestamp]
    end
    
    Audit --> SSEEvent[SSE Hub: Dispara broadcast TASK_UPDATED]
    SSEEvent --> Redirect[Frontend redireciona autor para /articles/:projectId]
    Redirect --> EndSuccess([Tarefa exibida com badge 'Concluída (Merged)'<br/>Botão 'Abrir Editor' desabilitado])
```

### Regras de Negócio do Merge:
1. **Eliminação de Branches Órfãs:** A branch temporária da sub-tarefa (`task/<slug>-<shortHash>`) é excluída remotamente no GitHub logo após a confirmação do merge na `dev`.
2. **Desalocação Imediata de Memória:** O Pod Kubernetes e o PVC temporário são destruídos imediatamente, liberando recursos computacionais do cluster para outras tarefas.
3. **Invalidação de Acesso:** Com o status `MERGED`, a workspace é marcada como `TERMINATED` e o endpoint do editor recusa novas conexões para aquela tarefa.

---

## 🏛️ 9. Fluxo 6: Gatekeeper 1 — Processo de Avaliação Institucional do NIT

O **Núcleo de Inovação Tecnológica (NIT)** é o órgão institucional que avalia o potencial de patente e propriedade intelectual do artigo antes de qualquer publicação externa.

```mermaid
sequenceDiagram
    autonumber
    actor Author as Autor / Pesquisador
    participant Frontend as ArticleDetailPage (SPA)
    participant Gateway as Fastify Backend
    participant DB as PostgreSQL (Prisma)
    actor NITReviewer as Parecerista NIT / Coordenador

    Note over Frontend: Etapa do NIT está inicialmente com status LOCKED 🔒

    loop Verificação Contínua
        Frontend->>Frontend: Verifica se 100% das etapas de conteúdo estão COMPLETED
    end

    alt Alguma Etapa de Conteúdo Pendente
        Author->>Frontend: Tenta clicar no botão "Solicitar Análise do NIT"
        Frontend-->>Author: Botão desabilitado com tooltip informativo:<br/>"Conclua 100% das etapas de escrita para solicitar o parecer do NIT"
    else 100% das Etapas de Escrita Concluídas
        Frontend-->>Author: Etapa NIT desbloqueia! 🔓 Botão "Solicitar Análise do NIT" habilitado
        Author->>Frontend: Clica em "Solicitar Análise do NIT" e preenche notas
        Frontend->>Gateway: POST /api/v1/projects/:id/nit/request { notes, protocol }
        Gateway->>DB: Valida em transação atômica se all(stages.writing === COMPLETED)
        Gateway->>DB: Cria registro em NitProcess (status: WAITING_NIT)
        Gateway->>DB: Atualiza Project (submissionStatus: WAITING_NIT)
        Gateway->>DB: Grava AuditLog com ação "NIT_ANALYSIS_REQUESTED"
        Gateway-->>Frontend: Solicitação protocolada com sucesso!
        Frontend-->>Author: Etapa exibe badge "Em Análise pelo NIT" (Relógio Amarelo ⏳)
    end

    NITReviewer->>Frontend: Acessa painel do NIT / modal de parecer institucional
    NITReviewer->>Frontend: Analisa o artigo consolidado na branch dev e emite o parecer

    alt Parecer Aprovado
        NITReviewer->>Frontend: Registra parecer "Aprovado" com número de protocolo
        Frontend->>Gateway: POST /api/v1/projects/:id/nit/decision { status: "APPROVED_NIT", protocol, notes }
        Gateway->>DB: Atualiza NitProcess (status: APPROVED_NIT, approvedAt: now)
        Gateway->>DB: Atualiza ProjectStage NIT (status: COMPLETED)
        Gateway->>DB: Desbloqueia Gatekeeper 2 (Submissão ao Congresso Alvo 🔓)
        Gateway-->>Frontend: Parecer registrado!
        Frontend-->>Author: Notificação: "NIT Aprovado! Submissão ao Congresso Alvo liberada."
    else Parecer com Inconformidades (Rejeitado)
        NITReviewer->>Frontend: Registra parecer "Rejeitado" com apontamentos de PI
        Frontend->>Gateway: POST /api/v1/projects/:id/nit/decision { status: "REJECTED_NIT", notes }
        Gateway->>DB: Atualiza NitProcess (status: REJECTED_NIT)
        Gateway->>DB: Mantém Gatekeeper 2 bloqueado (🔒 LOCKED)
        Frontend-->>Author: Notificação de inconformidade institucional; ajustes necessários
    end
```

### Regras de Negócio do Gatekeeper 1 (NIT):
1. **Trava Sequencial Rígida:** É impossível solicitar o NIT com etapas de escrita pendentes. A verificação é validada tanto na interface quanto no backend (`HTTP 409 Conflict` se houver etapa aberta).
2. **Auditabilidade de Propriedade Intelectual:** Todos os despachos, protocolos e notas emitidos pelo NIT são gravados de forma imutável na tabela `AuditLog`.

---

## 🎯 10. Fluxo 7: Gatekeeper 2 — Submissão Oficial ao Congresso Alvo

O envio formal do artigo compilado para a conferência científica é estritamente condicionado à aprovação do NIT.

```mermaid
flowchart TD
    Start([Autor/Coordenador clica em 'Submeter ao Congresso Alvo']) --> CheckNIT{nitStatus === APPROVED_NIT?}
    
    CheckNIT -->|Não| Blocked[Ação 🔒 BLOQUEADA: Exige parecer favorável do NIT]
    CheckNIT -->|Sim| OpenModal[Abre Modal de Submissão Oficial]
    
    OpenModal --> FillData[Preenche data de submissão e anexa PDF oficial da conferência]
    FillData --> SubmitReq[Fastify: POST /api/v1/projects/:id/submit-target]
    
    subgraph "Processamento de Submissão Oficial"
        SubmitReq --> FreezeCommit[Obtém SHA do último commit na branch main/dev]
        FreezeCommit --> CreateRC[Prisma: Cria ReleaseCandidate com versionTag 'v1.0-sub' e commitSha]
        CreateRC --> UpdateProject[Prisma: Project.submissionStatus = SUBMITTED_TARGET]
        UpdateProject --> CompleteStage[Prisma: ProjectStage 'Submissão ao Congresso' = COMPLETED]
        CompleteStage --> AuditSubmission[AuditLog: Registra submissão oficial ao congresso]
    end
    
    AuditSubmission --> SSEEvent[SSE Hub: Notifica toda a equipe sobre a submissão]
    SSEEvent --> SuccessScreen([Artigo entra na Fase 7: Pós-Submissão<br/>Aguardando decisão da conferência])
```

### Regras de Negócio do Gatekeeper 2:
1. **Inviolabilidade de Envio:** Nenhuma submissão para conferências externas (IEEE, ACM, SBC, etc.) é liberada pelo sistema sem o selo `APPROVED_NIT`.
2. **Congelamento do Artefato (Freeze):** O estado do código no momento exato da submissão é imutavelmente registrado através de uma `ReleaseCandidate` contendo a tag de versão e o SHA do commit.

---

## 🏆 11. Fluxo 8: Árvore de Decisão Pós-Submissão (Post-Submission Outcomes)

Após a avaliação da banca revisora do congresso, os autores recebem o parecer externo e registram o desfecho na plataforma através do `PostSubmissionModal`.

```mermaid
graph TD
    SubFinished[Artigo em SUBMITTED_TARGET / Pós-Submissão] --> ResultInput[Autor/Coordenador clica em 'Registrar Resultado da Conferência']
    
    ResultInput --> OutcomeDecision{Qual foi o resultado?}
    
    OutcomeDecision -->|1. ACEITO| ScenarioA[Cenário A: Artigo Aceito 🟢]
    OutcomeDecision -->|2. REVISÃO SOLICITADA| ScenarioB[Cenário B: Revisão Solicitada 🟡]
    OutcomeDecision -->|3. REJEITADO| ScenarioC[Cenário C: Artigo Rejeitado 🔴]

    subgraph "Cenário A: Publicação & Metadados Finais"
        ScenarioA --> ModalAccepted[Abre Formulário de Metadados Finais]
        ModalAccepted --> FillMetadata[Preenche DOI, URL de Publicação, Link do Dataset e PDF Camera-Ready]
        FillMetadata --> SaveAccepted[POST /projects/:id/post-submission/accepted]
        SaveAccepted --> ReleasePub[Prisma: Cria Release final e status = COMPLETED_PUBLISHED]
        ReleasePub --> EndDone([Artigo Finalizado com Sucesso e Publicado 🎉])
    end

    subgraph "Cenário B: Correções para o Mesmo Congresso"
        ScenarioB --> ModalRevisions[Abre Formulário de Correções v2]
        ModalRevisions --> FillNotes[Insere prazos da banca e apontamentos dos revisores externos]
        FillNotes --> SaveRevisions[POST /projects/:id/post-submission/revision]
        SaveRevisions --> ReopenTasks[Prisma: submissionStatus = ACCEPTED_REVISION_REQUESTED<br/>Reabre tarefas de escrita para ajustes v2 na mesma conferência]
        ReopenTasks --> BackToWriting([Retorna para a Fase 2: Escrita de Correções])
    end

    subgraph "Cenário C: Decisão dos Autores (Backup vs Novo Congresso)"
        ScenarioC --> ModalRejected[Abre Modal de Decisão dos Autores]
        ModalRejected --> AuthorsChoice{Qual o caminho escolhido?}
        
        AuthorsChoice -->|Usar Congresso Backup| PathBackup[Ativar Congresso Backup Cadastrado]
        AuthorsChoice -->|Submeter a Novo Congresso| PathNew[Cadastrar Novo Congresso Alvo]
        
        PathBackup --> SaveBackup[POST /projects/:id/post-submission/backup]
        SaveBackup --> ConfigBackup[Transiciona submissionStatus = SUBMITTED_BACKUP<br/>Atualiza datas e modelo de formatação v2]
        
        PathNew --> SaveNew[POST /projects/:id/post-submission/new-target]
        SaveNew --> ConfigNew[Transiciona submissionStatus = REJECTED_REOPENED_V2<br/>Reconfigura template e prazos da nova conferência]
        
        ConfigBackup --> ReopenWriting([Reabre ciclo de escrita v2 com novo prazo])
        ConfigNew --> ReopenWriting
    end
```

### Regras de Negócio do Pós-Submissão:
1. **Cenário A (Aceito):** Permite o upload da versão *Camera-Ready* e gravação do DOI oficial para citação acadêmica. O projeto é arquivado como concluído.
2. **Cenário B (Revisão Solicitada):** Mantém o mesmo congresso alvo, porém cria novas sub-tarefas de correção (ex: *"Revisão v2: Ajustar Figuras e Equações"*).
3. **Cenário C (Rejeitado):** Oferece transição instantânea para o congresso backup definido na Fase 1 ou permite parametrizar uma conferência totalmente nova, preservando todo o texto já produzido.

---

## 📈 12. Fluxo 9: Governança, Prazos & Análise Preditiva (Coordenação e Gerência)

O acompanhamento de cronogramas e entregas de artigos científicos opera através de duas visões integradas no componente `<ArticleTimelineHeader />`:

```mermaid
flowchart LR
    Header[ArticleTimelineHeader] --> ViewSelector{Seletor de Modo}
    
    ViewSelector -->|Modo [Fluxo]| FlowView[Visão Sequencial de Etapas:<br/>Cards horizontais de etapas com travas 🔒<br/>e progresso percentual concluído]
    
    ViewSelector -->|Modo [Timeline]| TimelineView[Visão Cronológica de Gantt:<br/>Régua temporal com datas planejadas e reais:<br/>plannedStartAt até plannedEndAt]

    TimelineView --> DeadlineLogic[Cálculo de Status de Prazo do Artigo]
    
    DeadlineLogic --> OnTime[🟢 ON_TIME: Faltam > 15 dias para o prazo final]
    DeadlineLogic --> Warning[🟡 WARNING_SOON: Faltam <= 15 dias para o vencimento]
    DeadlineLogic --> Overdue[🔴 OVERDUE: Prazo final da conferência expirado]

    TimelineView --> TaskAudit{Data da Tarefa > Prazo da Etapa?}
    TaskAudit -->|Sim| TaskWarning[⚠️ Exibe Chip Vermelho no Card da Tarefa:<br/>'A data limite da tarefa excede o final da etapa']
    TaskAudit -->|Não| TaskOk[Exibe data normal de vencimento]
```

### Regras de Negócio de Governança e Coordenação:
1. **Validação de Inconsistência de Datas:** Se um autor definir o vencimento de sua sub-tarefa para uma data posterior ao término planejado da etapa (`task.dueDate > stage.plannedEndAt`), o sistema destaca a inconsistência visualmente em vermelho e emite alerta ao Coordenador.
2. **Metas Globais de Gerência (`TeamAcademicGoal`):** O Gerente define a quantidade de artigos esperados por equipe dentro de um determinado **Ciclo Acadêmico**. O painel calcula automaticamente a taxa de atingimento e over-achievement.
3. **Análise Preditiva de Gargalos:** O sistema identifica preventivamente equipes com tarefas travadas há mais de 7 dias sem novos commits, alertando a coordenação antes que o prazo do congresso seja violado.

---

## 🤖 13. Fluxo 10: Interação com a Inteligência Artificial Científica (SciAI Copilot)

A assistência de IA é acessível pelo painel lateral de chat (`AIChatSidebar`) ou durante o onboarding guiado (`OnboardingChat`).

```mermaid
sequenceDiagram
    autonumber
    actor Author as Autor / Pesquisador
    participant ChatUI as Frontend Chat (AIChatSidebar)
    participant Gateway as Fastify Proxy (/api/v1/ai)
    participant SciAI as ai-service (FastAPI + LangGraph)
    participant Tools as Academic Tools (OpenAlex / S2)
    participant Editor as code-server Workspace

    Author->>ChatUI: Digita pergunta: "Busque 3 artigos recentes sobre compilação TeX em K8s"
    ChatUI->>Gateway: POST /api/v1/chat/stream { message, baseCommitSha, baseFileHash }
    Gateway->>SciAI: Repassa requisição com chave de serviço M2M
    SciAI->>SciAI: Supervisor Agent ativa o SearchSpecialist Agent
    SciAI->>Tools: Consulta APIs do Semantic Scholar e OpenAlex em pool assíncrono
    Tools-->>SciAI: Retorna artigos com títulos, autores, resumos e DOIs
    
    Note over SciAI: Nó de Interrupção LangGraph (Human-in-the-Loop)
    SciAI-->>ChatUI: Evento SSE ai:interrupt { papers: [...] }
    ChatUI-->>Author: Exibe os 3 artigos com caixas de seleção na interface
    
    Author->>ChatUI: Seleciona 2 artigos e clica em "Usar estes artigos na Introdução"
    ChatUI->>Gateway: POST /api/v1/chat/resume { selectedPapers: [...] }
    Gateway->>SciAI: Repassa resposta do autor para destravar o grafo
    SciAI->>SciAI: Curation Agent gera as citações .bib e parágrafos formatados em LaTeX
    
    SciAI-->>ChatUI: Stream SSE com sugestão de texto e botão "Aplicar na Workspace"
    Author->>ChatUI: Clica em "Aplicar Sugestão"
    ChatUI->>Gateway: POST /api/v1/projects/:id/tasks/:taskId/apply-ai-proposal
    Gateway->>Gateway: Valida se o arquivo em disco ainda possui o mesmo baseFileHash
    alt Arquivo foi modificado pelo autor concorrentemente
        Gateway-->>ChatUI: HTTP 409 Conflict: "O arquivo foi modificado no editor. Resolva o conflito."
    else Arquivo íntegro
        Gateway->>Editor: Aplica as alterações no arquivo TeX em disco
        Gateway-->>ChatUI: Proposta aplicada com sucesso!
        Note over Editor: LaTeX Workshop detecta alteração e recompila o PDF na hora
    end
```

### Regras de Negócio do SciAI:
1. **Human-in-the-Loop Obrigatório:** O agente de busca bibliográfica jamais insere artigos ou referências no texto sem a validação explícita do pesquisador na interface.
2. **Proteção de Concorrência:** O envio de `baseFileHash` (SHA-256 do arquivo aberto) impede que uma proposta demorada da IA sobrescreva acidentalmente alterações manuais feitas pelo autor no editor.
3. **Connection Pooling & Retries:** Chamadas a APIs externas acadêmicas utilizam semáforos assíncronos e retentativas com backoff exponencial para evitar bloqueios de taxa (*rate limiting*).

---

## 📋 14. Matriz Consolidada de Telas, Modais, Ações & Permissões RBAC

| Rota / Tela | Componente Principal | Modais e Painéis Associados | Ações Principais | Chamadas de API / Eventos | Papéis Autorizados |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `/login` | `LoginPage` | — | Autenticação via e-mail e senha | `POST /auth/login` | Pública |
| `/` | `AuthorArticlesPage` | `CreateProjectModal` | Listar artigos do usuário, criar novo artigo | `GET /projects`, `POST /projects` | `AUTHOR` |
| `/articles/:projectId` | `ArticleDetailPage` | `CreateStageModal`, `CreateTaskModal`, `AddMemberModal`, `ProjectSettingsModal`, `ReleaseCandidatesModal`, `PostSubmissionModal` | Navegar no Gantt, alternar `[Fluxo]` e `[Timeline]`, gerenciar etapas e membros, solicitar NIT e submissão | `GET /projects/:id`, `POST /stages`, `POST /tasks`, `POST /nit/request`, `POST /submit-target` | `AUTHOR`, `COORDINATOR`, `MANAGER` |
| `/workspace/:projectId/task/:taskId` | `WorkspacePage` | `SaveProgressModal`, `CreatePRModal`, `AIChatSidebar` | Escrever TeX no VS Code embutido, compilar PDF instantâneo, salvar progresso (commit) e enviar p/ revisão | `GET /editor-proxy/:id`, `GET /tasks/:id/diff-summary`, `POST /tasks/:id/commit`, `POST /prs/:id/ready-for-review`, `POST /tasks/:id/merge` | `AUTHOR` |
| `/reviews` | `ReviewsListPage` | — | Listar Pull Requests pendentes de avaliação acadêmica | `GET /pull-requests` | `REVIEWER`, `COORDINATOR`, `AUTHOR` |
| `/reviews/:prId` | `ReviewDetailPage` | `NITParecerModal`, Drawer de Comentários | Avaliar Diff LaTeX side-by-side com PDF oficial, comentar por linha, solicitar ajustes ou aprovar | `GET /prs/:id/details`, `POST /prs/:id/comments`, `POST /prs/:id/review-decision`, `POST /nit/decision` | `REVIEWER`, `COORDINATOR` |
| `/coordinator` | `CoordinatorDashboardPage` | `ProjectSettingsModal` | Visualizar matriz de prazos de todas as equipes (🟢/🟡/🔴), reatribuir revisores | `GET /coordinator/summary`, `PATCH /prs/:id/reviewer` | `COORDINATOR`, `MANAGER` |
| `/manager` | `ManagerDashboardPage` | `ManageTeamModal`, `CreateAcademicPeriodModal`, `CreateUserModal` | Filtrar por Ciclo Acadêmico, definir cotas por equipe (`TeamAcademicGoal`), analisar gargalos | `GET /manager/dashboard`, `POST /academic-periods`, `PATCH /teams/:id/goals` | `MANAGER`, `ADMIN` |

---

## 📚 15. Referências e Navegação

* 📄 **Documento de Requisitos do Produto:** [`PRD.md`](file:///home/gilson-russo/development/professional/sci-latex-vscode/docs/planning/PRD.md)
* ⚙️ **Documento de Requisitos Técnicos:** [`TRD.md`](file:///home/gilson-russo/development/professional/sci-latex-vscode/docs/planning/TRD.md)
* 🛠️ **Workflow de Desenvolvimento Git & Jira:** [`WORKFLOW.md`](file:///home/gilson-russo/development/professional/sci-latex-vscode/docs/planning/WORKFLOW.md)
* 📘 **Especificação Geral do Sistema:** [`specs/system-specs.md`](file:///home/gilson-russo/development/professional/sci-latex-vscode/docs/planning/specs/system-specs.md)
* 📌 **Status Atual e Guia de Retomada:** [`STATUS.md`](file:///home/gilson-russo/development/professional/sci-latex-vscode/docs/planning/STATUS.md)
