# 🔄 Documento de Fluxos da Aplicação e Jornadas de Usuário (`APP_FLOWS.md`)

**Produto:** SCIA — Scientific Collaboration and Intelligent Assistance (Plataforma Web Self-Hosted)  
**Versão:** 3.0 (Consolidada com ADR-007, ADR-008, 6 Etapas Fixas e Editor CodeMirror 6)  
**Status:** Aprovado / Em Desenvolvimento Ativo  
**Documentos Relacionados:**  
* 📄 [`PRD.md`](file:///home/gilson-russo/development/professional/sci-latex-vscode/docs/planning/PRD.md) — Documento de Requisitos de Produto (Visão, Personas & 6 Etapas Fixas)  
* ⚙️ [`TRD.md`](file:///home/gilson-russo/development/professional/sci-latex-vscode/docs/planning/TRD.md) — Documento de Requisitos Técnicos (Arquitetura, K8s & APIs)  
* 🏛️ [`ADR-007`](file:///home/gilson-russo/development/professional/sci-latex-vscode/docs/planning/adrs/adr-007-collaborative-editor-architecture-scaling.md) — Arquitetura do Editor Colaborativo CodeMirror 6  
* 🏛️ [`ADR-008`](file:///home/gilson-russo/development/professional/sci-latex-vscode/docs/planning/adrs/adr-008-workflow-6-etapas-revisao-desacoplamento-git.md) — Workflow em 6 Etapas Fixas e Modelo de Revisão em 2 Níveis  
* 🔍 [`specs/reviewer-view-spec.md`](file:///home/gilson-russo/development/professional/sci-latex-vscode/docs/planning/specs/reviewer-view-spec.md) — Especificação da Visão e Persona do Revisor  

---

## 📑 1. Identificação, Propósito & Visão Geral dos Fluxos

### 1.1 Propósito
O **Documento de Fluxos da Aplicação (App Flows)** mapeia detalhadamente todas as **jornadas de usuário (User Journeys)**, **transições de máquina de estados**, **interações de tela**, **comportamento de modais** e **processos assíncronos em tempo real (SSE & WebSockets)** da plataforma SCIA. Ele serve como o guia visual e operacional definitivo para desenvolvedores frontend, backend, UX designers e QA garantirem conformidade estrita entre a experiência de usuário e as regras de negócio.

### 1.2 Os Quatro Pilares da Experiência SCIA (v3.0)
```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                               OS 4 PILARES DE FLUXO SCIA                               │
├──────────────────────────┬─────────────────────────────┬───────────────────────────────┤
│ 1. Escrita Web Colab     │  2. Revisão em Dois Níveis  │  3. Régua de 6 Etapas Fixas   │
│ CodeMirror 6 nativo com  │ - Micro: Bate e volta por   │ Ordem 1 a 6 padronizada,      │
│ OT em tempo real, auto-  │   tarefas na Etapa 3.       │ imutável, sem exclusão ou     │
│ compilação de PDF e     │ - Macro: Revisão Geral na   │ drag-and-drop. Consistência   │
│ persistência no Postgres.│   Etapa 4 (antes do NIT).   │ institucional absoluta.       │
├──────────────────────────┴─────────────────────────────┴───────────────────────────────┤
│ 4. Governança Rígida e Gatekeepers: Etapa 5 (NIT 🔒) e Etapa 6 (Congresso Alvo 🔒)    │
│ com travas sequenciais automáticas e painéis preditivos de prazos para a Gerência.     │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 🗺️ 2. Mapa de Navegação & Hierarquia de Telas (Sitemap Unificado)

O revisor não possui um sitemap apartado; ele utiliza a mesma interface dos autores com resolução dinâmica de permissões de leitura e escrita:

```mermaid
graph TD
    Login["/login<br/>Autenticação JWT"] --> Resolver["PersonaRootResolver<br/>(Resolução por Role)"]
    
    Resolver -->|AUTHOR / REVIEWER| ArticlesHome["/<br/>AuthorArticlesPage (Meus Artigos)"]
    Resolver -->|COORDINATOR| CoordHome["/coordinator<br/>CoordinatorDashboardPage (Equipes & Prazos)"]
    Resolver -->|MANAGER / ADMIN| ManagerHome["/manager<br/>ManagerDashboardPage (Ciclo & Metas)"]

    ArticlesHome --> FilterArticles{"Filtro de Atuação"}
    FilterArticles -->|Como Autor| AuthorRole["Artigos em Escrita (Badge Azul)"]
    FilterArticles -->|Como Revisor| ReviewerRole["Artigos sob Minha Revisão (Badge Roxo)"]

    ArticlesHome --> ArticleDetail["/articles/:projectId<br/>ArticleDetailPage (Gantt das 6 Etapas Fixas)"]
    ArticleDetail --> Workspace["/workspace/:projectId<br/>EditorPage (CodeMirror 6 Colaborativo)"]

    Workspace --> ModeCheck{"Papel no Projeto"}
    ModeCheck -->|Autor| EditMode["Modo Escrita Colaborativa (Edição Livre)"]
    ModeCheck -->|Revisor| ReviewMode["Modo Revisão (Read-Only 🔒 + Comentários Ancorados)"]

    CoordHome --> ArticleDetail
    ManagerHome --> ManageTeamModal["ManageTeamModal<br/>(Cotas, Membros & Metas)"]
```

---

## 🔄 3. O Fluxo Macro do Artigo Científico: 6 Etapas Fixas & 2 Gatekeepers

O artigo científico obedece a uma máquina de estados linear estrita em **6 etapas fixas**, com duas barreiras institucionais invioláveis (**Gatekeepers**):

```mermaid
stateDiagram-v2
    direction TB
    
    [*] --> Stage1_Planning: Etapa 1: Planejamento e Pesquisa TeX
    Stage1_Planning --> Stage2_Experiments: Etapa 2: Desenvolvimento Experimental & Benchmarks
    Stage2_Experiments --> Stage3_Writing: Etapa 3: Escrita do Artigo (Tarefas Paralelas)
    
    state "Etapa 3: Bate e Volta de Tarefas" as Stage3_Writing {
        WritingTask --> TaskReview: Solicitar Revisão da Tarefa
        TaskReview --> WritingTask: Ajustes Solicitados pelo Revisor
        TaskReview --> TaskApproved: Tarefa Aprovada (COMPLETED)
    }

    Stage3_Writing --> Stage4_GeneralReview: 100% das Tarefas da Etapa 3 Aprovadas
    
    state "Etapa 4: Revisão Geral (Manuscrito Completo)" as Stage4_GeneralReview {
        ReadingConsolidated --> GeneralChanges: Solicitar Ajustes Gerais (Rodada 1)
        GeneralChanges --> ReadingConsolidated: Autores Corrigem LaTeX e Reenviam (Rodada 2)
        ReadingConsolidated --> GeneralApproved: Parecer Geral Aprovado
    }

    Stage4_GeneralReview --> Stage5_GatekeeperNIT: Etapa 4 Concluída (COMPLETED)
    
    note right of Stage5_GatekeeperNIT
        🔒 GATEKEEPER 1: Parecer do NIT
        A solicitação é bloqueada até que
        a Etapa 4 (Revisão Geral) seja 100% Aprovada.
    end note

    Stage5_GatekeeperNIT --> Stage6_GatekeeperSubmission: Parecer Favorável (APPROVED_NIT)
    Stage5_GatekeeperNIT --> Stage4_GeneralReview: Inconformidade de PI (Ajustes de Patente)

    note right of Stage6_GatekeeperSubmission
        🔒 GATEKEEPER 2: Submissão ao Congresso Alvo
        Envio oficial bloqueado estritamente
        até que o NIT emita o protocolo formal.
    end note

    Stage6_GatekeeperSubmission --> Stage7_PostSubmission: Submissão Externa Homologada
    
    Stage7_PostSubmission --> Decision_Accepted: Cenário A: Artigo Aceito
    Stage7_PostSubmission --> Decision_Revisions: Cenário B: Revisão Solicitada pela Banca
    Stage7_PostSubmission --> Decision_Rejected: Cenário C: Artigo Rejeitado

    Decision_Accepted --> Published: Metadados Finais (DOI & Camera-Ready)
    Decision_Revisions --> Stage4_GeneralReview: Correções v2 da Banca Externa
    Decision_Rejected --> Stage1_Planning: Redirecionamento p/ Congresso Backup
    
    Published --> [*]
```

---

## 🔑 4. Fluxo 1: Autenticação, Sessão e Resolução de Papel (Login & RBAC)

```mermaid
sequenceDiagram
    autonumber
    actor User as Pesquisador / Revisor
    participant SPA as React Frontend
    participant Gateway as Fastify Backend
    participant DB as PostgreSQL (Prisma)
    
    User->>SPA: Acessa /login e digita e-mail e senha
    SPA->>Gateway: POST /api/v1/auth/login { email, password }
    Gateway->>DB: Busca User por e-mail e valida hash de senha
    alt Credenciais Inválidas
        Gateway-->>SPA: HTTP 401 Unauthorized { message: "Credenciais inválidas" }
        SPA-->>User: Exibe mensagem de erro no formulário
    else Credenciais Válidas
        Gateway->>DB: Cria novo registro em Session (refreshToken)
        Gateway-->>SPA: HTTP 200 { user, accessToken } + Set-Cookie: refreshToken
        SPA->>SPA: Armazena user e token no authSlice (Redux)
        SPA->>SPA: Executa PersonaRootResolver com base em user.role
        alt Role == AUTHOR ou REVIEWER
            SPA-->>User: Redireciona para / (AuthorArticlesPage com filtros por papel)
        else Role == COORDINATOR
            SPA-->>User: Redireciona para /coordinator (CoordinatorDashboardPage)
        else Role == MANAGER ou ADMIN
            SPA-->>User: Redireciona para /manager (ManagerDashboardPage)
        end
    end
```

---

## 📁 5. Fluxo 2: Criação do Artigo e Instanciação das 6 Etapas Fixas

A criação de um novo artigo científico gera automaticamente a estrutura sequencial imutável:

```mermaid
sequenceDiagram
    autonumber
    actor Author as Autor / Pesquisador
    participant Modal as CreateProjectModal (SPA)
    participant Gateway as Fastify Backend
    participant DB as PostgreSQL (Prisma)

    Author->>Modal: Preenche título, conferência alvo, período acadêmico e orientador (Revisor Oficial)
    Author->>Modal: Configura datas planejadas para as 6 etapas fixas
    Author->>Modal: Clica em "Criar Artigo Científico"
    Modal->>Gateway: POST /api/v1/projects { title, conference, managerId, coordinatorId, reviewerId, stages }
    
    subgraph "Criação Transacional no Backend"
        Gateway->>DB: Cria registro em Project
        Gateway->>DB: Associa membros (Author como criador, ReviewerId como REVIEWER)
        Gateway->>DB: Cria as 6 etapas sequenciais obrigatórias (order: 1 a 6):
        Note over Gateway,DB: 1. Planejamento e Pesquisa<br/>2. Desenvolvimento Experimental & Benchmarks<br/>3. Escrita do Artigo<br/>4. Revisão Técnica e Científica (Revisão Geral)<br/>5. Parecer do NIT (Gatekeeper 1)<br/>6. Submissão Final ao Congresso (Gatekeeper 2)
        Gateway->>DB: Semeia arquivos TeX padrão (main.tex, references.bib, Makefile)
    end

    Gateway-->>Modal: HTTP 201 Created { project }
    Modal-->>Author: Notificação de sucesso e redirecionamento para o Gantt do Artigo
```

---

## ✍️ 6. Fluxo 3: Escrita Colaborativa no Editor CodeMirror 6

Conforme estabelecido na **ADR-007**, a edição é colaborativa em tempo real com Transformação Operacional:

```mermaid
sequenceDiagram
    autonumber
    actor Author as Autor
    participant CM as CodeMirror 6 Frontend
    participant WS as WebSocket /documents/:id/ws
    participant DocOwner as Fastify Document Owner (RAM)
    participant DB as PostgreSQL (Prisma)
    participant Compiler as LaTeX Compiler Service

    Author->>CM: Digita caracteres no parágrafo LaTeX
    CM->>WS: Envia transação OT de inserção/deleção (delta)
    WS->>DocOwner: Processa rebaseUpdates e atribui versão sequencial
    DocOwner->>WS: Broadcast do delta para os demais autores conectados
    
    Note over DocOwner: Timer híbrido de persistência (3s inatividade ou 15s contínuos)
    DocOwner->>DB: Persiste conteúdo consolidado em ProjectFile e DocumentSnapshot
    
    Author->>CM: Clica em "Recompilar PDF" ou pausa digitação
    CM->>Compiler: POST /api/v1/compiler/compile { files }
    Compiler-->>CM: Retorna buffer do PDF compilado
    CM-->>Author: Renderiza PDF atualizado no painel lateral
```

---

## 🔍 7. Fluxo 4: Bate e Volta de Tarefas de Escrita (Etapa 3 — Nível Micro)

Ciclo iterativo e paralelo entre autores e orientador para seções específicas:

```mermaid
sequenceDiagram
    autonumber
    actor Author as Autor da Seção
    participant Gantt as ArticleDetailPage (Gantt)
    participant Gateway as Fastify Backend
    participant DB as PostgreSQL
    actor Reviewer as Revisor Oficial (Orientador)
    participant Editor as CodeMirror 6 (Read-Only)

    Note over Author: Autor conclui a redação da tarefa (ex: "Escrita da Metodologia")
    Author->>Gantt: Clica em "Solicitar Revisão desta Tarefa"
    Gantt->>Gateway: POST /api/v1/tasks/:taskId/request-review { summaryNotes }
    Gateway->>DB: Task.status = REVIEW_REQUESTED
    Gateway->>Gateway: Dispara notificação SSE (TASK_REVIEW_REQUESTED)
    Gateway-->>Reviewer: Alerta visual no Gantt: "● Aguardando sua Revisão"
    
    Reviewer->>Editor: Abre tarefa no Editor (Carrega com EditorState.readOnly: true)
    Reviewer->>Editor: Seleciona trecho de texto e insere apontamento no ReviewSidebar
    Editor->>Gateway: POST /api/v1/documents/:docId/comments { from, to, text }
    Gateway->>DB: Cria ReviewComment ancorado ao texto
    
    alt Revisor Solicita Ajustes
        Reviewer->>Gantt: Clica em "Solicitar Ajustes na Tarefa"
        Gantt->>Gateway: POST /api/v1/tasks/:taskId/decision { decision: "CHANGES_REQUESTED", notes }
        Gateway->>DB: Task.status = CHANGES_REQUESTED
        Gateway-->>Author: Notificação: "Ajustes solicitados na seção pelo Revisor"
        Note over Author: Autor abre editor, faz correções no LaTeX, resolve comentários e clica em "Reenviar p/ Revisão"
    else Revisor Aprova a Seção
        Reviewer->>Gantt: Clica em "Aprovar Tarefa"
        Gantt->>Gateway: POST /api/v1/tasks/:taskId/decision { decision: "APPROVED" }
        Gateway->>DB: Task.status = COMPLETED
        Gateway-->>Author: Notificação: "Seção aprovada pelo Revisor Oficial!"
    end
```

---

## 🧐 8. Fluxo 5: Revisão Geral do Artigo (Etapa 4 — Nível Macro)

Avaliação holística do manuscrito consolidado antes do envio ao NIT:

```mermaid
sequenceDiagram
    autonumber
    actor Reviewer as Revisor Oficial
    participant Platform as SCIA (Etapa 4: Revisão Geral)
    actor Author as Autores do Artigo
    participant NIT as Etapa 5 (NIT - Gatekeeper 1)

    Note over Platform: 100% das tarefas da Etapa 3 estão COMPLETED -> Etapa 4 Inicia
    Reviewer->>Platform: Acessa o artigo consolidado no Editor (Read-Only) e PDF
    Reviewer->>Platform: Confere limite de páginas, qualidade das figuras e coesão textual
    
    alt Revisor Encontra Inconformidades Macro
        Reviewer->>Platform: Clica em "Solicitar Ajustes Gerais" (Rodada 1)
        Reviewer->>Platform: Insere parecer geral (ex: "Condensar 2 páginas e ajustar resumo")
        Platform->>Platform: Etapa 4: status = CHANGES_REQUESTED (Rodada 1)
        Note over Platform: A Etapa 3 permanece intacta como COMPLETED
        Platform-->>Author: Notificação: "Ajustes gerais solicitados pelo orientador"
        
        Note over Author: Autores editam o LaTeX, resolvem pendências e clicam em "Reenviar Revisão Geral"
        Author->>Platform: POST /api/v1/projects/:id/stages/:stage4Id/resubmit
        Platform->>Platform: Etapa 4: status = UNDER_REVIEW (Rodada 2)
        Platform-->>Reviewer: Notificação: "Nova versão pronta para reavaliação geral"
    else Manuscrito Redondo e Conforme
        Reviewer->>Platform: Clica em "Aprovar Revisão Geral"
        Platform->>Platform: Etapa 4: status = COMPLETED
        Platform->>NIT: Destrava Etapa 5 (NIT passa de LOCKED 🔒 para READY 🔓)
        Platform-->>Author: Notificação: "Artigo aprovado na Revisão Geral! Liberado para o NIT."
    end
```

---

## 🏛️ 9. Fluxo 6: Gatekeeper 1 — Processo de Avaliação Institucional do NIT

```mermaid
sequenceDiagram
    autonumber
    actor Author as Autor / Pesquisador
    participant Frontend as ArticleDetailPage (SPA)
    participant Gateway as Fastify Backend
    participant DB as PostgreSQL (Prisma)
    actor NITReviewer as Parecerista NIT / Coordenador

    Note over Frontend: Etapa do NIT está inicialmente com status LOCKED 🔒

    alt Etapa 4 (Revisão Geral) Não Concluída
        Author->>Frontend: Tenta clicar no botão "Solicitar Análise do NIT"
        Frontend-->>Author: Ação bloqueada: "Aprovação na Etapa 4 de Revisão Geral obrigatória"
    else Etapa 4 Está COMPLETED
        Frontend-->>Author: Etapa NIT desbloqueia! 🔓 Botão habilitado
        Author->>Frontend: Clica em "Solicitar Análise do NIT" e preenche protocolo
        Frontend->>Gateway: POST /api/v1/projects/:id/nit/request { notes, protocol }
        Gateway->>DB: Atualiza NitProcess (status: WAITING_NIT)
        Gateway-->>Frontend: Protocolo registrado com sucesso!
        Frontend-->>Author: Badge "Em Análise pelo NIT" (Relógio Amarelo ⏳)
    end

    NITReviewer->>Frontend: Analisa artigo e emite parecer de propriedade intelectual
    alt Parecer Aprovado
        NITReviewer->>Frontend: Registra parecer "Aprovado" com número de patente/protocolo
        Frontend->>Gateway: POST /api/v1/projects/:id/nit/decision { status: "APPROVED_NIT", protocol }
        Gateway->>DB: Atualiza NitProcess (status: APPROVED_NIT) e Etapa 5 = COMPLETED
        Gateway->>DB: Desbloqueia Gatekeeper 2 (Submissão ao Congresso Alvo 🔓)
        Frontend-->>Author: Notificação: "NIT Aprovado! Submissão ao Congresso Alvo liberada."
    else Parecer com Inconformidades
        NITReviewer->>Frontend: Registra parecer "Rejeitado" com apontamentos de PI
        Frontend->>Gateway: POST /api/v1/projects/:id/nit/decision { status: "REJECTED_NIT" }
        Frontend-->>Author: Notificação de inconformidade; ajustes de propriedade intelectual necessários
    end
```

---

## 🎯 10. Fluxo 7: Gatekeeper 2 — Submissão Oficial ao Congresso Alvo

```mermaid
flowchart TD
    Start([Autor/Coordenador clica em 'Submeter ao Congresso Alvo']) --> CheckNIT{Etapa 5 NIT === COMPLETED?}
    
    CheckNIT -->|Não| Blocked[Ação 🔒 BLOQUEADA: Exige parecer favorável do NIT]
    CheckNIT -->|Sim| OpenModal[Abre Modal de Submissão Oficial]
    
    OpenModal --> FillData[Preenche data de submissão e anexa PDF oficial submetido]
    FillData --> SubmitReq[Fastify: POST /api/v1/projects/:id/submit-target]
    
    subgraph "Processamento de Submissão Oficial"
        SubmitReq --> CreateRC[Prisma: Cria ReleaseCandidate com versionTag 'v1.0-sub' e snapshotId]
        CreateRC --> UpdateProject[Prisma: Project.submissionStatus = SUBMITTED_TARGET]
        UpdateProject --> CompleteStage[Prisma: Etapa 6 'Submissão ao Congresso' = COMPLETED]
        CompleteStage --> AuditSubmission[AuditLog: Registra submissão oficial ao congresso]
    end
    
    AuditSubmission --> SSEEvent[SSE Hub: Notifica toda a equipe sobre a submissão]
    SSEEvent --> SuccessScreen([Artigo entra na Pós-Submissão<br/>Aguardando decisão da conferência])
```

---

## 🏆 11. Fluxo 8: Árvore de Decisão Pós-Submissão (Post-Submission Outcomes)

```mermaid
graph TD
    SubFinished[Artigo em SUBMITTED_TARGET / Pós-Submissão] --> ResultInput[Autor/Coordenador clica em 'Registrar Resultado da Conferência']
    
    ResultInput --> OutcomeDecision{Qual foi o resultado?}
    
    OutcomeDecision -->|1. ACEITO| ScenarioA[Cenário A: Artigo Aceito 🟢]
    OutcomeDecision -->|2. REVISÃO SOLICITADA| ScenarioB[Cenário B: Revisão Solicitada 🟡]
    OutcomeDecision -->|3. REJEITADO| ScenarioC[Cenário C: Artigo Rejeitado 🔴]

    subgraph "Cenário A: Publicação & Metadados Finais"
        ScenarioA --> ModalAccepted[Abre Formulário de Metadados Finais]
        ModalAccepted --> FillMetadata[Preenche DOI, URL de Publicação e Link do Dataset]
        FillMetadata --> SaveAccepted[POST /projects/:id/post-submission/accepted]
        SaveAccepted --> ReleasePub[Prisma: Cria Release final e status = COMPLETED_PUBLISHED]
        ReleasePub --> EndDone([Artigo Finalizado com Sucesso e Publicado 🎉])
    end

    subgraph "Cenário B: Correções para o Mesmo Congresso"
        ScenarioB --> ModalRevisions[Abre Formulário de Correções v2]
        ModalRevisions --> FillNotes[Insere prazos da banca e apontamentos dos revisores externos]
        FillNotes --> SaveRevisions[POST /projects/:id/post-submission/revision]
        SaveRevisions --> ReopenTasks[Prisma: submissionStatus = ACCEPTED_REVISION_REQUESTED<br/>Reabre tarefas de escrita para ajustes v2 na mesma conferência]
        ReopenTasks --> BackToReview([Retorna para a Etapa 4: Revisão Geral v2])
    end

    subgraph "Cenário C: Redirecionamento para Congresso Backup"
        ScenarioC --> ModalRejected[Abre Modal de Decisão de Rejeição]
        ModalRejected --> ChooseOption{Qual caminho seguir?}
        ChooseOption -->|Submeter ao Backup| RedirectBackup[POST /projects/:id/post-submission/redirect-backup]
        RedirectBackup --> ResetFlow[Redireciona para o Congresso Backup mantendo o histórico]
        ResetFlow --> BackToSubmission([Retorna para a Etapa 6 com novo prazo])
    end
```

---

## 📊 12. Fluxo 9: Governança do Coordenador e Gerente (Métricas de Revisão)

A Coordenação e a Gerência acompanham a saúde editorial através de métricas automáticas geradas pelo ciclo de revisão:

1. **Dashboard do Coordenador (`CoordinatorDashboardPage`):**
   - Matriz de Prazos por Equipe (🟢 No Prazo, 🟡 Atenção, 🔴 Atrasado).
   - Contador de Tarefas em `REVIEW_REQUESTED` aguardando ação de cada orientador.
   - Identificação precoce de gargalos antes que a data do congresso expire.
2. **Dashboard do Gerente (`ManagerDashboardPage`):**
   - Agrupamento por **Período Acadêmico** (ex: *Ciclo 2026/2027*).
   - Metas de submissão por equipe (`TeamAcademicGoal`).
   - Métrica de **Taxa de Retrabalho** (média de rodadas de ajustes necessárias na Etapa 4 por equipe).

---

## 🤖 13. Fluxo 10: Interação com a Inteligência Artificial Científica (SciAI Copilot)

```mermaid
sequenceDiagram
    autonumber
    actor Author as Pesquisador / Autor
    participant Chat as AIChatSidebar (Frontend)
    participant Gateway as Fastify Backend
    participant SciAI as Microserviço ai-service (Python/LangGraph)
    participant DB as PostgreSQL (Prisma)
    participant Editor as CodeMirror 6

    Author->>Chat: Digita prompt: "Recomende 3 trabalhos correlatos e sugira um parágrafo de comparação"
    Chat->>Gateway: POST /api/v1/ai/chat/message { prompt, currentFile, selection }
    Gateway->>SciAI: Envia requisição com contexto bibliográfico
    
    SciAI->>SciAI: Supervisor invoca Especialista de Busca (OpenAlex / Semantic Scholar)
    SciAI->>SciAI: Agente Curador valida e formata as entradas BibTeX
    SciAI-->>Gateway: Retorna resposta com texto gerado e referências sugeridas
    Gateway-->>Chat: Renderiza resposta estruturada com botão "Aplicar no Documento"
    
    Author->>Chat: Clica em "Aplicar no LaTeX"
    Chat->>Editor: Aplica transação de texto no CodeMirror
    Editor->>DB: Salva novo snapshot colaborativo
```

---

## 📋 14. Matriz Consolidada de Telas, Modais, Ações & Permissões RBAC

| Rota / Tela | Componente Principal | Modais e Painéis Associados | Ações Principais | Chamadas de API / Eventos | Papéis Autorizados |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `/login` | `LoginPage` | — | Autenticação via e-mail e senha | `POST /auth/login` | Pública |
| `/` | `AuthorArticlesPage` | `CreateProjectModal` | Listar artigos, filtrar por atuação (Autor / Revisor), criar artigo | `GET /projects`, `POST /projects` | `AUTHOR`, `REVIEWER` |
| `/articles/:projectId` | `ArticleDetailPage` | `CreateTaskModal`, `AddMemberModal`, `ProjectSettingsModal`, `ReleaseCandidatesModal`, `PostSubmissionModal` | Navegar no Gantt das 6 etapas fixas, gerenciar prazos, solicitar NIT e submissão | `GET /projects/:id`, `POST /tasks`, `POST /nit/request`, `POST /submit-target` | `AUTHOR`, `REVIEWER`, `COORDINATOR`, `MANAGER` |
| `/workspace/:projectId` | `EditorPage` | `SettingsModal`, `ReviewSidebar` | Escrever TeX (Autor), auditar em modo leitura e comentar (Revisor), compilar PDF | `WS /documents/:id/ws`, `POST /compiler/compile`, `POST /documents/:id/comments` | `AUTHOR` (Escrita), `REVIEWER` (Read-Only) |
| `/coordinator` | `CoordinatorDashboardPage` | `ProjectSettingsModal` | Visualizar matriz de prazos de todas as equipes (🟢/🟡/🔴), reatribuir revisores | `GET /coordinator/summary` | `COORDINATOR`, `MANAGER` |
| `/manager` | `ManagerDashboardPage` | `ManageTeamModal`, `CreateAcademicPeriodModal`, `CreateUserModal` | Filtrar por Ciclo Acadêmico, definir cotas por equipe (`TeamAcademicGoal`), analisar gargalos | `GET /manager/dashboard`, `POST /academic-periods`, `PATCH /teams/:id/goals` | `MANAGER`, `ADMIN` |

---

## 📚 15. Referências e Navegação

* 📄 **Documento de Requisitos do Produto:** [`PRD.md`](file:///home/gilson-russo/development/professional/sci-latex-vscode/docs/planning/PRD.md)
* ⚙️ **Documento de Requisitos Técnicos:** [`TRD.md`](file:///home/gilson-russo/development/professional/sci-latex-vscode/docs/planning/TRD.md)
* 🏛️ **Decisão Arquitetural do Workflow (6 Etapas):** [`adrs/adr-008-workflow-6-etapas-revisao-desacoplamento-git.md`](file:///home/gilson-russo/development/professional/sci-latex-vscode/docs/planning/adrs/adr-008-workflow-6-etapas-revisao-desacoplamento-git.md)
* 🔍 **Especificação da Visão do Revisor:** [`specs/reviewer-view-spec.md`](file:///home/gilson-russo/development/professional/sci-latex-vscode/docs/planning/specs/reviewer-view-spec.md)
* 📌 **Status Atual e Guia de Retomada:** [`STATUS.md`](file:///home/gilson-russo/development/professional/sci-latex-vscode/docs/planning/STATUS.md)
