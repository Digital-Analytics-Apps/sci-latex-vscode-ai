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
- [x] **6.2 Ferramentas de Pesquisa Científica com Connection Pooling & Rate-Limiting**
  - Conector oficial do arXiv (primário) com semáforo unitário (`Semaphore(1)`), throttle mandatório de 3 segundos (ToU), timeout de 12s e fail-fast em 429.
  - Conectores OpenAlex e Semantic Scholar como fallback em 3 níveis e Tavily search.
- [x] **6.3 Endpoints M2M e Streaming SSE**
  - Rotas `/api/v1/chat/stream`, `/api/v1/runs` autenticadas por `X-Internal-Service-Key` e formatador SSE enxuto.
- [x] **6.4 Harness CLI de Testes e ADR-009**
  - Scripts de smoke test (`scripts/test_chat_cli.py`, `scripts/smoke_llm.py`) e especificação de experimentação headless via API.
- [ ] **6.5 Integração da Gaveta SciAI Chat no Frontend (`<AIChatSidebar />`)**
  - Transpor os componentes de referência (`frontend/references-ai-chat/`) para o layout oficial do editor no frontend, consumindo `/api/v1/ai/chat/stream`.
- [ ] **6.6 Onboarding Wizard Guiado para Criação de Artigos**
  - Diálogo guiado com o `IdeaRefiner` instanciando novos projetos com as 6 etapas fixas no PostgreSQL.

---

## 🟡 Fase 7: Painel Unificado de Gestão da Produção Científica (`Role.MANAGER` / `Role.COORDINATOR`)

- [x] **7.1 Diretrizes e Modelo de Governança por Escopo**
  - Formalizado em [`docs/DIRETRIZES_GESTAO_PRODUCAO_CIENTIFICA_SCIA.md`](../DIRETRIZES_GESTAO_PRODUCAO_CIENTIFICA_SCIA.md) o modelo de visualização única compartilhada para Gerente e Coordenador, com filtro estrito de artigos/subordinados sob responsabilidade, Kanban como visualização pura (Read-Only) e isolamento do Admin técnico.
- [ ] **7.2 Portfólio Científico com Semáforos de Risco**
  - Tabela e cards de artigos com indicadores de No Prazo, Em Atenção, Atrasado (>15 dias de estagnação) e Bloqueado no NIT.
- [ ] **7.3 Visualizador Kanban Read-Only de Tarefas da Etapa 3**
  - Painel de colunas para acompanhamento do progresso das tarefas de escrita sem permitir movimentações arbitrárias de etapas.
- [ ] **7.4 Painel de Carga e Capacidade de Equipe (Workload)**
  - Distribuição de artigos por orientador e volume de revisões pendentes por revisor técnico.

---

## 🟡 Fase 8: Observabilidade On-Premise Licença Zero & LLMOps (ADR-013)

- [x] **8.1 Arquitetura & Especificação Técnica da Stack On-Premise (ADR-013 & Spec)**
  - Formalização da stack livre (Prometheus, Loki, Tempo, OpenTelemetry, Opik e GlitchTip) em `docs/planning/adrs/adr-013-observabilidade-on-premise-licenca-zero.md` e `docs/planning/specs/observability-spec.md`.
  - Elaboração do tutorial prático e didático de operação das 5 camadas em `docs/TUTORIAL_OBSERVABILIDADE_ON_PREMISE.md`.
- [ ] **8.2 Infraestrutura On-Premise em Docker & Kubernetes**
  - Configuração do compose `infra/observability/docker-compose.observability.yml` com Grafana, Prometheus, Loki, Tempo, Opik e GlitchTip.
- [ ] **8.3 Instrumentação de Métricas no Backend e AI Service**
  - Exposição de `/metrics` via `fastify-metrics` e `prometheus-fastapi-instrumentator`.
- [ ] **8.4 Rastreabilidade de LLMs com Opik no LangGraph**
  - Integração do `OpikTracer` nos fluxos de `graph.astream` e `graph.ainvoke` no `ai-service` para captura de tokens, custos e nós de agentes.
- [ ] **8.5 Centralização de Logs Estruturados (Loki) & Crash Reporting (GlitchTip)**
  - Padronização de logs JSON via `pino` e `loguru`, ingestão no Loki e captura de exceções do frontend e backend no GlitchTip.

---

## 🟢 Fase 9: SCIA Admin Center — Observabilidade, Operação e Governança Científica (`Role.ADMIN` - ADR-014)

- [x] **9.1 Decisão Arquitetural e Especificação Técnica (ADR-014 & Spec)**
  - Formalização do **SCIA Admin Center** com as 5 áreas especializadas (Visão Geral, Fluxo Científico das 6 Etapas, Infraestrutura, Colaboração em Tempo Real e Atividade/Auditoria) em `docs/planning/adrs/adr-014-painel-admin-saude-e-metricas-aplicacao.md` e `docs/planning/specs/system-admin-health-dashboard-spec.md`.
- [x] **9.2 Backend BFF & Rotas REST + Streaming SSE (`/api/v1/admin/dashboard/*`)**
  - Implementação do módulo `backend/src/modules/admin/` com agregação do PostgreSQL, leases do Redis, métricas Prometheus/Opik e canal Server-Sent Events (`/events`).
- [x] **9.3 Frontend React do SCIA Admin Center (`/admin`)**
  - Desenvolvimento de `src/features/admin/` com layout mestre, 5 abas integradas, gráficos de atividade horária, funil das 6 etapas e links contextuais para o Grafana.
- [x] **9.4 Blindagem de Rota e RBAC Estrito**
  - Bloqueio de acesso a qualquer perfil que não seja `Role.ADMIN` via `ProtectedRoute` no React e validação de token JWT no backend Fastify.

---

## 🟢 Fase 10: SCIA Literature Intelligence — Ficha Científica e Mapa Mental com React Flow (ADR-016)

- [x] **10.1 Decisão Arquitetural e Especificação Técnica (ADR-016 & Spec)**
  - Formalização da arquitetura em [`docs/planning/adrs/adr-016-scia-literature-intelligence-paper-analysis-and-react-flow.md`](file:///home/gilson-russo/development/professional/sci-latex-vscode/docs/planning/adrs/adr-016-scia-literature-intelligence-paper-analysis-and-react-flow.md) e especificação em [`docs/planning/specs/literature-intelligence-spec.md`](file:///home/gilson-russo/development/professional/sci-latex-vscode/docs/planning/specs/literature-intelligence-spec.md).
  - Homologação corporativa da biblioteca `@xyflow/react` sob licença MIT livre e sem royalties para uso comercial.
- [x] **10.2 Skill Acadêmica e Subagente `methodology-reviewer` no `ai-service`**
  - Importação da skill `scientific-article-analysis` (6 etapas de auditoria metodológica).
  - Implementação do subagente `methodology-reviewer` com saída estruturada Pydantic (`ScientificPaperAnalysis`), auditando pontos fortes, limitações declaradas e ameaças à validade interna/externa.
  - Endpoints FastAPI no `ai-service` (`/internal/v1/papers/analyze` e `/analyze-batch`).
  - Cobertura com testes automatizados aprovados (`tests/test_paper_analysis.py`).
- [ ] **10.3 Backend BFF Fastify & Persistência em Cache no PostgreSQL**
  - Mapeamento de entidade de literatura acadêmica (`ProjectLiteraturePaper`) com deduplicação por DOI e armazenamento de PDFs no MinIO.
- [ ] **10.4 Frontend React — Mapa Mental Interativo com React Flow (`@xyflow/react`)**
  - Desenvolvimento do canvas de mapa mental com `@xyflow/react`, Custom Nodes para artigos (chips de pontos fortes/fracos), Custom Edges com tipos semânticos (`convergent`, `divergent`, `complementary`) e auto-layout Dagre.
- [ ] **10.5 Drawer da Ficha Científica & Alinhamento com o Manuscrito LaTeX**
  - Drawer detalhado do artigo selecionado, botão de 1 clique para inclusão no arquivo `.bib` e semáforo de cobertura das seções TeX do autor.

---

## 🟢 Fase 11: Governança de Templates LaTeX Oficiais, MinIO & Bootstrap Mínimo (ADR-017)

- [x] **11.1 Decisão Arquitetural Aprovada (ADR-017)**
  - Formalização de governança para templates de conferências e periódicos científicos em [`docs/planning/adrs/adr-017-latex-templates-governance-and-storage-architecture.md`](adrs/adr-017-latex-templates-governance-and-storage-architecture.md).
  - Regra de ouro: preservação incondicional dos nomes de arquivos originais (`.cls`, `.sty`, `.bst`, `.tex` raiz sem forçar `main.tex`).
  - Padrão semântico de slugs e paths no MinIO: `[ANO]-[CONGRESSO]-[FORMATO]` (ex: `2026-sbc-artigo`, `2027-ieee-conference`).
  - Política de repositório leve: apenas 1 baseline seed essencial em `latex-templates/` para subir a aplicação pronta para uso, deixando a expansão para uploads pós-deploy pelos pesquisadores.
- [x] **11.2 Limpeza de Mocks Falsos no Backend & MinIO**
  - Expurgar o array `SYSTEM_TEMPLATES` e strings TeX hardcoded em `templates.service.ts`.
  - Remover execução em tempo de execução de `ensureSystemTemplates` em rotas de listagem (`listTemplates`).
  - Deletar templates fictícios legados no banco de dados e no MinIO.
- [x] **11.3 Baseline Seed Dinâmico a partir de `latex-templates/`**
  - Refatorar o `seed.ts` para ler os pacotes `.zip` reais da pasta `latex-templates/`, extrair metadados e persistir intactos no MinIO (`templates/{slug}/bundle.zip`) e PostgreSQL.
- [x] **11.4 Propagação do `mainEntryPath` no Compilador TeXLive e Editor Colaborativo**
  - Ajustar `projects.service.ts`, `documents.service.ts`, `documents.websocket.ts` e o frontend para operar dinamicamente com base no `mainEntryPath` original do template sem forçar `main.tex` nem fallbacks mascaradores de erro.

---

## 🟢 Fase 12: AIOps Copilot, Servidores MCP e Diagnóstico de Causa-Raiz (ADR-018)

- [x] **12.1 Decisão Arquitetural e Especificação Técnica (ADR-018 & Spec)**
  - Formalização do ecossistema AIOps em [`docs/planning/adrs/adr-018-aiops-copilot-mcp-root-cause-analysis-admin-center.md`](adrs/adr-018-aiops-copilot-mcp-root-cause-analysis-admin-center.md) e especificação técnica em [`docs/planning/specs/aiops-copilot-implementation-plan.md`](specs/aiops-copilot-implementation-plan.md).
- [x] **12.2 Modelagem de Dados no Prisma e PostgreSQL (`Aiops*`)**
  - Criação das entidades `AiopsIncident`, `AiopsRcaReport`, `AiopsChatMessage` e `AiopsActionAuditLedger` no `backend/prisma/schema.prisma` com migração aplicada no PostgreSQL.
- [x] **12.3 MCP Gateway Service (`backend/src/infra/mcp/`)**
  - Implementação do `McpGatewayService` integrando de forma tipada e segura os servidores MCP de Kubernetes, Prometheus, Loki, GlitchTip e Opik (LLMOps).
- [x] **12.4 Regras de Negócio, Motor RCA e Auditoria Imutável (Fastify BFF)**
  - Criação do `AiopsService` com matriz determinística de classificação (Infraestrutura vs. Aplicação vs. Mista) e `ActionAuditService` com Allowlist segura e execução Human-in-the-Loop.
  - Exposição das rotas `/api/v1/admin/aiops/*` protegidas por `Role.ADMIN`.
- [x] **12.5 Frontend React no SCIA Admin Center (`/admin`)**
  - Implementação de tipos estritos (`aiops.types.ts`), serviço Axios (`aiopsApi.ts`), custom hooks com TanStack Query (`useAIOps.ts`), card de aprovação (`AIOpsActionCard.tsx`), drawer interativo (`AIOpsChatDrawer.tsx`) e botões de atalho em `InfrastructureTab.tsx` e `AdminCenterPage.tsx`. Estritamente sem `React.FC` e com named exports.
- [x] **12.6 Testes Automatizados e Homologação**
  - 4 novos testes unitários do backend aprovados (76/76 total), 1 novo teste de componente no frontend aprovado (6/6 total) e 0 erros de compilação TypeScript/Vite.

---

## 🟢 Fase 13: Topologia de Microsserviços e Comunicação em Tempo Real no Admin Center (ADR-019)

- [x] **13.1 Decisão Arquitetural e Especificação Técnica (ADR-019 & Spec)**
  - Formalização da arquitetura em [`docs/planning/adrs/adr-019-service-topology-visualizer-real-time-inter-service-telemetry-react-flow.md`](adrs/adr-019-service-topology-visualizer-real-time-inter-service-telemetry-react-flow.md) e especificação técnica em [`docs/planning/specs/service-topology-visualizer-spec.md`](specs/service-topology-visualizer-spec.md).
- [x] **13.2 Barramento de Telemetria Inter-Serviços no Backend (`telemetryBus`)**
  - Implementação de `backend/src/infra/telemetry-bus.ts` com transmissão via SSE em `/api/v1/admin/dashboard/events`.
  - Instrumentação real de compilação TeX Live e chat com Agente Belisa.
- [x] **13.3 Frontend React Flow & AutoSizer (Aba 6 do Admin Center)**
  - Implementação de `src/features/admin/tabs/ServiceTopologyTab.tsx` e componentes em `src/features/admin/components/topology/` sem alterar as 5 abas pré-existentes.
  - Arestas dinâmicas SVG vibrantes com partículas animadas sob demanda (`LiveCommunicationEdge.tsx`) e nós informativos limpos (`ServiceTopologyNode.tsx`).
- [x] **13.4 Persistência de Nós Ativos & Suporte a Múltiplos Pods (HPA)**
  - Sustentação contínua de iluminação de nós em processamento (`processingNodeIds`) e detecção dinâmica de réplicas de Pods Kubernetes baseada em leases do Redis.
- [x] **13.5 Resiliência Fail-Open no AI Service**
  - Flush do Opik desacoplado em worker thread (`asyncio.to_thread` com timeout de 2.0s) em `ai-service/app/api/v1/endpoints/chat.py`, impedindo bloqueios no event loop do Uvicorn ou nas probes `/health`.

---

*Consulte [`docs/planning/STATUS.md`](STATUS.md) para verificar o estado operacional em tempo real.*
