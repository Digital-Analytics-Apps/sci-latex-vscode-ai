# 🗺️ Master Roadmap & Checklist de Entregas SCIA

> **Projeto:** SCIA — Scientific Collaboration and Intelligent Assistance (`sci-latex-vscode`)  
> **Versão:** 3.0.0 (Consolidada com ADRs 007, 007.1, 008 e 010)  
> **Última Atualização:** Outubro de 2026  
> **Objetivo:** Guia completo de status das frentes de engenharia (Concluídas vs. Em Andamento vs. Planejadas).

---

## 🟢 Fase 1: Fundação Relacional, Auth JWT & Governança por Ciclo Acadêmico

- [x] **1.1 Modelagem Relacional no PostgreSQL via Prisma 7 (`@prisma/adapter-pg`)**
  - Mapeamento das 14 entidades canônicas do sistema (`User`, `Session`, `AuditLog`, `AcademicPeriod`, `Project`, `ProjectMember`, `ProjectStage`, `Task`, `ReleaseCandidate`, `Release`, `NitProcess`, `ProjectFile`, `DocumentSnapshot`, `ReviewComment`).
- [x] **1.2 Autenticação Segura OWASP & Sessões**
  - Implementação de cookies HTTP-Only (`accessToken` e `refreshToken`), rotação segura de refresh tokens na tabela `Session` e controle RBAC em rotas Fastify.
- [x] **1.3 Gestão de Ciclos Acadêmicos e Metas Globais (`/api/v1/academic-periods`)**
  - Cadastro de períodos acadêmicos (`AcademicPeriod`) com meta global de artigos (`targetArticlesCount`), acompanhamento de progresso e filtragem executiva para a Gerência (`Role.MANAGER`).
- [x] **1.4 Setup do Frontend React 19 + Vite & SCIA Design System**
  - Aplicação SPA com TypeScript estrito, Material UI com tema customizado Soft UI (Light/Dark sem pretos absolutos), fontes auto-hospedadas (`@fontsource`), TanStack Query e Redux Toolkit.

---

## 🟢 Fase 2: Editor Colaborativo Web-Nativo CodeMirror 6 & OT (ADR-007)

- [x] **2.1 Motor de Transformação Operacional Single-Leader (`@codemirror/collab`)**
  - Implementação de OT centralizado no backend Fastify com `rebaseUpdates`, versionamento monotônico de inteiros e canal WebSocket `/ws/documents/:projectId`.
- [x] **2.2 Otimização do Hot Path na Memória RAM**
  - Remoção de I/O desnecessário de deltas de digitação no Redis. Edições operam na memória do processo com latência local <16ms e <2ms no servidor.
- [x] **2.3 Mecanismo de Debounce Híbrido Multi-Critério**
  - Persistência no PostgreSQL acionada por inatividade (3s), teto contínuo sob digitação ininterrupta (15s), volume acumulado (50 ops) ou encerramento da sala WebSocket.
- [x] **2.4 Graceful Shutdown & Transações Atômicas de Checkpoint**
  - Persistência de todos os documentos ativos de `activeDocs` em `SIGTERM`/`SIGINT`. Transação atômica única no Prisma unificando `Project.currentVersion`, `ProjectFile.content` e `DocumentSnapshot`.

---

## 🟢 Fase 3: Fencing Monotônico de Posse & Resiliência Multi-Pod (ADR-007.1)

- [x] **3.1 Leases de Dono Único no Redis (Single-Writer)**
  - Chave atômica `editor:document:<documentId>:owner` com TTL de 15s renovado a cada 2s via heartbeat enquanto houver conexões ativas na sala.
- [x] **3.2 Fencing Token Monotônico (`ownerGeneration`) no PostgreSQL**
  - Proteção com dupla barreira no banco impedindo que Pods zumbis ou pausados por Garbage Collection sobrescrevam checkpoints de novos Pods donos.
- [x] **3.3 Reconciliação Automática no Cliente CodeMirror 6**
  - Reconexão transparente do cliente retendo operações pendentes em `sendableUpdates` e rebaseando contra a nova autoridade sem duplicação de texto.

---

## 🟢 Fase 4: Workflow em 6 Etapas Fixas & Modelo de Revisão em Dois Níveis (ADR-008)

- [x] **4.1 Versionamento Relacional Nativo**
  - Histórico de versões mantido por snapshots e deltas no banco relacional, garantindo integridade e restauração pontual.
- [x] **4.2 Régua Institucional das 6 Etapas Fixas**
  - Todo artigo nasce com as etapas obrigatórias:
    1. *Planejamento e Pesquisa*
    2. *Desenvolvimento e Experimentos*
    3. *Escrita do Artigo (Tarefas Paralelas)*
    4. *Revisão Técnica e Científica (Geral)*
    5. *Parecer do NIT (Gatekeeper 1 🔒)*
    6. *Submissão Final ao Congresso (Gatekeeper 2 🔒)*
  - Deleção e reordenação bloqueadas na API (`DELETE /stages/:id -> 400 Bad Request`); desinstalação integral de `@dnd-kit`.
- [x] **4.3 Modelo de Revisão em Dois Níveis**
  - *Nível Micro (Etapa 3):* Bate e volta por tarefas de escrita entre coautores e orientador (`REVIEW_REQUESTED`, `IN_REVIEW`, `CHANGES_REQUESTED`, `COMPLETED`).
  - *Nível Macro (Etapa 4):* Revisão Geral do manuscrito compilado antes do NIT, operando em rodadas iterativas sem reabrir a Etapa 3.
- [x] **4.4 Persona do Revisor Acadêmico**
  - CodeMirror configurado em `EditorState.readOnly.of(true)` prevenindo corrupção do LaTeX, com capacidade total de comentários e emissão de pareceres via `ReviewSidebar`.
- [x] **4.5 Travas Rígidas de Gatekeepers**
  - Trava do NIT liberada estritamente após a conclusão da Etapa 4; trava de submissão externa liberada apenas com parecer `APPROVED_NIT`.

---

## 🟢 Fase 5: Persistência Durável de Apontamentos (`ReviewComment`) & Saneamento do Schema (ADR-010)

- [x] **5.1 Tabela Relacional `ReviewComment` no Prisma**
  - Persistência ACID de anotações com ancoragem por caracteres (`from`, `to`), texto selecionado, autor, status (`open` / `resolved`) e threads de respostas em JSONB.
- [x] **5.2 Saneamento de Entidades Fantasmas**
  - Remoção definitiva de tabelas legadas (`Team`, `TeamAcademicGoal`, `Workspace`, `GithubWebhookEvent`), unificando a governança em `coordinatorId` e `managerId` diretamente em `Project`.
- [x] **5.3 Blindagem Zero-Keystrokes**
  - Remoção de escritas síncronas a cada tecla no caminho quente de digitação.

---

## 🟡 Fase 6: Camada de Inteligência Científica (`ai-service` / SciAI)

- [x] **6.1 Microserviço FastAPI e Núcleo de Agentes LangGraph (`ai-service/`)**
  - Grafo multi-agente tipado com `Supervisor`, `IdeaRefiner`, `SearchSpecialist` (com `interrupt` Human-in-the-Loop), `CurationAgent` e `WriterAgent`.
- [x] **6.2 Ferramentas de Pesquisa Científica com Connection Pooling**
  - Conectores OpenAlex e Semantic Scholar com semáforo de concorrência, retries com exponential backoff e Tavily search.
- [x] **6.3 Endpoints M2M e Streaming SSE**
  - Rotas `/api/v1/chat/stream`, `/api/v1/runs` autenticadas por `X-Internal-Service-Key` e formatador SSE enxuto.
- [x] **6.4 Harness CLI de Testes e ADR-009**
  - Scripts de smoke test (`scripts/test_chat_cli.py`, `scripts/smoke_llm.py`) e especificação de experimentação headless via API.
- [ ] **6.5 Integração da Gaveta SciAI Chat no Frontend (`<AIChatSidebar />`)**
  - Transpor os componentes de referência (`frontend/references-ai-chat/`) para o layout oficial do editor no frontend, consumindo `/api/v1/ai/chat/stream`.
- [ ] **6.6 Onboarding Wizard Guiado para Criação de Artigos**
  - Diálogo guiado com o `IdeaRefiner` instanciando novos projetos com as 6 etapas fixas no PostgreSQL.

---

## ⚪ Fase 7: Painel Admin em Tempo Real & Métricas de Governança Institucional

- [ ] **7.1 Endpoint SSE de Administração (`/api/v1/admin/events`)**
  - Transmissão em tempo real de contagem de conexões WebSocket ativas, taxa de checkpoints/minuto e saúde do cluster.
- [ ] **7.2 Página Administrativa no Frontend (`/admin`)**
  - Tabela de usuários online, tempo de sessão ativa e ações de desconexão preventiva.
- [ ] **7.3 Dashboard Analítico de Desempenho de Metas por Ciclo**
  - Painéis consolidados de tempo médio de revisão por etapa e taxas de aceitação nos congressos alvo vs. backup.

---

*Consulte [`docs/planning/STATUS.md`](STATUS.md) para verificar o estado operacional em tempo real.*
