# 📌 Status de Desenvolvimento & Guia de Retomada (`STATUS.md`)

**Projeto:** SCIA — Scientific Collaboration and Intelligent Assistance (`sci-latex-vscode`)  
**Última Atualização:** 13 de Novembro de 2026  
**Status Geral do Projeto:** 🟢 **SCIA Literature Intelligence, Paper Analysis e ADR-016 Formalizados e Integrados.** Skill científica importada, subagente `methodology-reviewer` com saída estruturada Pydantic implementado no `ai-service`, endpoints FastAPI operacionais com 10/10 testes passando, homologação jurídica do React Flow (`@xyflow/react`) sob licença MIT livre e documentação arquitetural consolidada (ADR-016 e `literature-intelligence-spec.md`).

---

## ⚡ 1. Onde Parei & Como Retomar (Session Checkpoint)

> [!IMPORTANT]
> **Consulte esta seção sempre que iniciar ou retomar uma sessão de desenvolvimento.** Ela indica exatamente a última alteração realizada e qual o primeiro comando/tarefa a ser executado.

### 🔍 Estado Atual da Aplicação
  * **Branch Ativa:** `dev`
  * **SCIA Literature Intelligence & Ficha Científica (ADR-016 Integrada):**
    * **Decisão Arquitetural e Especificações Formais:**
      * Registrada a [`ADR-016`](file:///home/gilson-russo/development/professional/sci-latex-vscode/docs/planning/adrs/adr-016-scia-literature-intelligence-paper-analysis-and-react-flow.md) cobrindo os 4 pilares: Skill de auditoria em 6 etapas, subagente em quarentena de contexto (`methodology-reviewer`), mapa mental com `@xyflow/react` sob licença MIT livre e cache relacional com deduplicação por DOI.
      * Criada a especificação técnica em [`docs/planning/specs/literature-intelligence-spec.md`](file:///home/gilson-russo/development/professional/sci-latex-vscode/docs/planning/specs/literature-intelligence-spec.md).
      * Atualizado o [`docs/planning/ROADMAP.md`](file:///home/gilson-russo/development/professional/sci-latex-vscode/docs/planning/ROADMAP.md) com a Fase 10.
    * **Skill Acadêmica Especializada (`scientific-article-analysis`):**
      * Importada para `ai-service/skills/scientific-article-analysis/SKILL.md`, `ai/skills/` e `~/.gemini/config/skills/`.
    * **Subagente e Schemas Pydantic no `ai-service`:**
      * `app/schemas/paper_analysis.py`: Contrato tipado da Ficha Científica (`ScientificPaperAnalysis`) com pontos fortes, limitações declaradas, ameaças de validade interna/externa e aderência ao artigo do autor.
      * `app/agents/sub_agents/methodology_reviewer.py`: Subagente com saída estruturada via LLM (`with_structured_output`) e fallback resiliente.
      * `app/api/v1/endpoints/paper_analysis.py`: Rotas `POST /internal/v1/papers/analyze` e `/analyze-batch` registradas no roteador oficial.
      * `tests/test_paper_analysis.py`: Suíte de testes automatizados com 10/10 testes aprovados (`uv run pytest`).
      * Teste prático gerado em `ai-service/reports/exemplo_analise_artigo.md` comprovando extração empírica de métricas, pontos fortes e limitações.
  * **Implementação Completa do SCIA Admin Center (ADR-014):**
    * **Backend BFF Fastify (`backend/src/modules/admin/`):**
      * Zod Schemas tipados (`admin.schemas.ts`) para os 5 domínios operacionais e streaming SSE.
      * Serviço agregador analítico (`admin.service.ts`) coletando métricas ativas de `activeDocs`, salas WebSocket, distribuição de artigos nas 6 etapas do funil oficial, gargalos (atrasos, estagnações, travas NIT), saúde dos 5 serviços com links profundos para Grafana e Opik, autoridade Single-Writer dos pods donos e logs de auditoria imutáveis.
      * Controller Fastify (`admin.controller.ts`) com handlers REST e streaming Server-Sent Events (`GET /dashboard/events`) com heartbeat a cada 5 segundos.
      * Rotas registradas (`admin.routes.ts` e `app.ts`) em `/api/v1/admin/dashboard/*` protegidas rigorosamente por JWT e RBAC `requireAdmin` (`Role.ADMIN`).
      * Testes unitários com Vitest (`admin.service.test.ts`): 6/6 testes passando com sucesso.
    * **Frontend React 19 (`frontend/src/features/admin/`):**
      * Cliente HTTP tipado (`adminCenterApi.ts`) e hooks com TanStack Query v5 (`useAdminCenterQueries.ts`) com suporte a auto-refresh parametrizado.
      * Master Page (`AdminCenterPage.tsx`) com navegação fluida em 5 abas, botão de atualização manual forçada e alternador de auto-refresh.
      * 5 Abas independentes em conformidade com o Design System:
        * `OverviewTab.tsx`: KPIs executivos (usuários ativos, artigos em produção, salas WebSocket, erros/hora) e taxa horária de requisições e OT.
        * `WorkflowTab.tsx`: Gargalos institucionais (atrasos, estagnações, travas NIT) e funil visual das 6 etapas com tempo médio.
        * `InfrastructureTab.tsx`: Semáforos operacionais de Backend Fastify, SciAI Engine, Compilador LaTeX, PostgreSQL e Redis, com deep-links para Grafana e Opik.
        * `CollaborationTab.tsx`: Métricas de Transformação Operacional em memória, latência RAM e tabela de pods com contagem de documentos e status de checkpoints ACID.
        * `ActivityTab.tsx`: Linha do tempo de auditoria com filtros por categoria (`EDITORIAL`, `COLLABORATION`, `COMPILER`, `SECURITY`).
      * Layout e Roteamento Exclusivo (`AdminLayout.tsx`, `RoleLayoutResolver.tsx`, `PersonaRootResolver.tsx` e `routes/index.tsx`): Isolamento total da persona `ADMIN`, sem misturar com a visão de autores, coordenadores ou gerentes.
      * Compilação Frontend e Backend com 0 erros (`tsc -b && vite build` e `tsc` no backend aprovados).
  * **Refatoração e Blindagem do Editor Colaborativo (ADR-007 Implementada e Aprovada):**
    * **Limpeza do Hot Path no Redis:** Removido o `rpush` de deltas de texto no Redis em `documents.service.ts`. A digitação opera em memória RAM do Pod dono com latência < 2ms.
    * **Debounce Híbrido Multi-Critério:** Implementado timer de inatividade (3s), teto máximo contínuo (15s) e corte por volume (50 ops) para garantir checkpoints regulares no PostgreSQL sem risco de perda sob digitação ininterrupta.
    * **Graceful Shutdown (`server.ts`):** Tratamento de `SIGTERM`/`SIGINT` para persistir todos os documentos ativos de `activeDocs` no PostgreSQL antes de encerrar o processo.
    * **Concorrência Otimista & Transação Atômica (`documents.repository.ts`):** `saveCheckpoint` unifica a atualização da versão do projeto, `ProjectFile.content` (`main.tex`), arquivos secundários (`filesCollab`) e `DocumentSnapshot` em uma única chamada `prisma.$transaction`, com validação de `expectedOldVersion`.
    * **Coordenação de Posse (Document Ownership Lease):** Primitivas `acquireDocumentLease` e `renewDocumentLease` no Redis (`editor:document:<docId>:owner`, TTL 10s renovado a cada 3s) garantindo autoridade Single-Writer por documento para orquestração multi-pod em Kubernetes.
    * **Estabilização do WebSocket no Frontend (`useCollabWebSocket.ts`):** Removido `activeFile` das dependências do socket para eliminar reconexões indesejadas ao alternar abas, e adicionada fila de retry offline (`messageQueueRef`).
    * **Sincronização Multi-Arquivo em Tempo Real:** O backend expõe `getAllCollabVersions` no `SYNC_INIT` e une o estado em memória quente em `listProjectFiles`. O frontend rastreia `fileCollabVersions` de forma isolada, corrigindo a propagação de alterações entre arquivos secundários.
  * **Auditoria de Segurança Inter-Serviços e Planejamento de Hardening:**
    * **ADR-012 Refinada (Identidade de Serviço e Delegação):** Documentada em [`docs/planning/adrs/adr-012-m2m-security-evolution.md`](file:///home/gilson-russo/development/professional/sci-latex-vscode/docs/planning/adrs/adr-012-m2m-security-evolution.md) a separação estrita das 4 dimensões (Autenticação, Autorização, Delegação e Auditoria), modelo `AuthenticatedPrincipal` (`type: 'USER' | 'SERVICE'`) e tokens de delegação verificáveis.
    * **Relatório Geral de Comunicação Inter-Serviços Revisado:** Consolidado em [`docs/RELATORIO_COMUNICACAO_INTER_SERVICOS_E_SEGURANCA.md`](file:///home/gilson-russo/development/professional/sci-latex-vscode/docs/RELATORIO_COMUNICACAO_INTER_SERVICOS_E_SEGURANCA.md) cobrindo requisitos de Sandbox Real do Compiler (usuário não privilegiado, limits cgroups, zero rede no TeX), privacidade estrita do MinIO (URLs pré-assinadas com sanitização de logs e anti-SSRF), separação de responsabilidades do Redis e roadmap em 4 fases por redução de risco.
    * **Guia de Defesa do Banco de Dados para Especialistas:** Consolidado em [`docs/FAQ_BANCO_DE_DADOS_ESPECIALISTAS.md`](file:///home/gilson-russo/development/professional/sci-latex-vscode/docs/FAQ_BANCO_DE_DADOS_ESPECIALISTAS.md) contendo respostas executivas e técnicas para sabatinas de DBAs sobre Capacidade, PgBouncer, CloudNativePG, Read Replicas e Fencing Tokens.
    * **ADR-015 Consolidada (Estratégia de Banco de Dados PostgreSQL 16):** Documentada em [`docs/planning/adrs/adr-015-postgresql-scalability-ha-pgbouncer-and-read-replicas.md`](file:///home/gilson-russo/development/professional/sci-latex-vscode/docs/planning/adrs/adr-015-postgresql-scalability-ha-pgbouncer-and-read-replicas.md) a decisão formal de topologia de alta disponibilidade (CloudNativePG 1 Primário + 2 Standbys com failover automático em 10-15s), gestão de conexões com PgBouncer na porta 6543 e o adiamento deliberado de Read Replicas com gatilho objetivo de CPU > 75%.
  * **Estruturação da Nova Camada de IA (`ai-service/`):**
    * **Triagem Limpa do `sci-project`**: Descartados códigos legados e complexidade acidental (compilador Docker síncrono bloqueante, WebSockets colaborativos YRoom com vazamento de memória, autenticação duplicada e CRUDs SQLModel locais).
    * **Extração do Núcleo de Agentes LangGraph**:
      * `ai-service/app/agents/state.py`: Estado compartilhado tipado (`OnboardingState`, `Article`, `TaskItem`).
      * `ai-service/app/agents/sub_agents/supervisor.py`: Orquestrador geral do fluxo guiado de 4 estágios.
      * `ai-service/app/agents/sub_agents/idea_refiner.py`: Guia de Exploração para refinamento de hipóteses e tema de pesquisa.
      * `ai-service/app/agents/sub_agents/search_specialist.py`: Especialista de busca bibliográfica prioritária no arXiv com fallback para Semantic Scholar e OpenAlex (`interrupt` Human-in-the-Loop).
      * `ai-service/app/agents/sub_agents/curation.py`: Curadoria de artigos e cálculo proporcional de datas nas 6 etapas fixas institucionais (sem criação artificial de tarefas por IA e respeitando o template do MinIO).
      * `ai-service/app/agents/writer.py`: Redator acadêmico LaTeX.
    * **Ferramentas de Pesquisa Científica com Connection Pooling & Rate-Limiting**:
      * `ai-service/app/agents/tools/arxiv.py`: Conector oficial do arXiv com semáforo unitário (`Semaphore(1)`), throttle mandatório de 3 segundos (ToU), timeout de 12s, fail-fast e parser nativo Atom 1.0 (XML).
      * `ai-service/app/agents/tools/openalex.py`: Conector com semáforo de concorrência e reaproveitamento de conexões TCP.
      * `ai-service/app/agents/tools/semantic_scholar.py`: Conector Semantic Scholar com retries e exponential backoff.
      * `ai-service/app/agents/tools/academic_search.py`: Facade unificada com contingência em 3 níveis (arXiv ➡️ S2 ➡️ OpenAlex).
      * `ai-service/app/agents/tools/tavily_search.py`: Busca web com Tavily.
    * **APIs e Streaming SSE**:
      * `ai-service/app/api/v1/endpoints/chat.py`: Endpoints `/chat/stream` e `/chat/resume` para o chat interativo.
      * `ai-service/app/api/v1/endpoints/runs.py`: Endpoints M2M assíncronos (`POST /runs`, `/resume`, `/cancel`) com autenticação `X-Internal-Service-Key`.
      * `ai-service/app/streaming/stream_processor.py`: Formatador enxuto de eventos Server-Sent Events.
    * **ADR 009 Proposta (Em Discussão):** Documentada em [`docs/planning/adrs/adr-009-sciai-api-first-experimentation-and-service-enablement.md`](file:///home/gilson-russo/development/professional/sci-latex-vscode/docs/planning/adrs/adr-009-sciai-api-first-experimentation-and-service-enablement.md) a estratégia de experimentação headless via API, sem acoplamento ao frontend, cobrindo o harness CLI, injeção de `MemorySaver` para suportar `interrupt()`, alinhamento do Ollama local (`qwen3.5:4b`) e rota para o redator LaTeX (`writer.py`).
  * **Referências de Chat Copilot & Onboarding no Frontend (`frontend/references-ai-chat/`):**
    * Copiados como modelo de implementação: `OnboardingChat.reference.tsx`, `onboardingApi.reference.ts` e `AIChatSidebar.reference.tsx`.
    * Criado `frontend/references-ai-chat/README.md` com diretrizes para adaptação ao design system do SCIA, tipagens e proxy Fastify.
  * **Arquitetura de Observabilidade Open Source e Soberania Institucional (ADR-013 Consolidada Definitiva):**
    * **ADR-013 Aprovada e Consolidada:** Documentada em [`docs/planning/adrs/adr-013-observabilidade-on-premise-licenca-zero.md`](file:///home/gilson-russo/development/professional/sci-latex-vscode/docs/planning/adrs/adr-013-observabilidade-on-premise-licenca-zero.md) a consolidação final de engenharia: rate-limiting distribuído do arXiv via Redis, topologia de tail-sampling em 2 camadas com atributos canônicos, fail-open assíncrono do Opik com `${__trace.traceId}`, GlitchTip desacoplado (Web + Celery Worker), dimensionamento estático de workers do compilador TeX (KEDA formalmente postergado para fase futura sob demanda de carga real), sanitização universal nos 4 emissores (incluindo Compiler) e pipeline self-monitoring.
    * **Especificação Técnica & WBS em 5 Fases:** Documentada em [`docs/planning/specs/observability-spec.md`](file:///home/gilson-russo/development/professional/sci-latex-vscode/docs/planning/specs/observability-spec.md) com compose completo e contratos de código.
    * **Tutorial Técnico Didático:** Atualizado em [`docs/TUTORIAL_OBSERVABILIDADE_ON_PREMISE.md`](file:///home/gilson-russo/development/professional/sci-latex-vscode/docs/TUTORIAL_OBSERVABILIDADE_ON_PREMISE.md).
  * **Diretrizes Oficiais de Gestão da Produção Científica no SCIA:**
    * Consolidado em [`docs/DIRETRIZES_GESTAO_PRODUCAO_CIENTIFICA_SCIA.md`](file:///home/gilson-russo/development/professional/sci-latex-vscode/docs/DIRETRIZES_GESTAO_PRODUCAO_CIENTIFICA_SCIA.md) o modelo de gestão por escopo unificado para Gerente (`Role.MANAGER`) e Coordenador (`Role.COORDINATOR`), o papel futuro do Diretor (visão global) e a separação estrita do Administrador (`Role.ADMIN`).
    * **Kanban como Visualização Pura (Read-Only):** Formalizado que o Kanban no SCIA é estritamente uma lente visual para acompanhamento de tarefas da Etapa 3, sem drag-and-drop de etapas nem quebra dos Gatekeepers (NIT e Congresso).
  * **SCIA Admin Center: Painel Administrativo de Observabilidade, Operação e Governança Científica (ADR-014 Consolidada):**
    * **ADR-014 Aprovada e Consolidada:** Documentada em [`docs/planning/adrs/adr-014-painel-admin-saude-e-metricas-aplicacao.md`](file:///home/gilson-russo/development/professional/sci-latex-vscode/docs/planning/adrs/adr-014-painel-admin-saude-e-metricas-aplicacao.md) a concepção do **SCIA Admin Center** (`/admin`), exclusivo para `Role.ADMIN`, estruturado em 5 áreas fundamentais: (1) Visão Geral ao vivo, (2) Fluxo Científico (6 etapas, atrasos, NIT), (3) Infraestrutura com semáforos e links Grafana, (4) Colaboração em Tempo Real (Pods donos, OT/s, leases) e (5) Atividade & Auditoria (timeline ao vivo).
    * **Especificação Técnica & WBS em 4 Fases:** Detalhada em [`docs/planning/specs/system-admin-health-dashboard-spec.md`](file:///home/gilson-russo/development/professional/sci-latex-vscode/docs/planning/specs/system-admin-health-dashboard-spec.md) com contratos REST (`/api/v1/admin/dashboard/*`), canal SSE em tempo real (`/events`) e componentização no React 19.
  * **Workflow Editorial & Persistência ACID (ADR-008 & ADR-010):**
    * **Versionamento Relacional Nativo:** Toda colaboração é gerenciada por Transformação Operacional e snapshots no PostgreSQL.
    * **Régua Institucional de 6 Etapas Fixas:** Imutabilidade da ordem 1 a 6 e travas invioláveis de Gatekeepers (Etapa 5 NIT 🔒 e Etapa 6 Congresso Alvo 🔒).
    * **Persistência Durável de Apontamentos (`ReviewComment`):** Anotações inline ancoradas no TeX, respostas e resoluções salvas com atomicidade relacional no PostgreSQL.
  * **Encapsulamento Arquitetural de Frontend (SOC & TanStack Query Hooks):**
    * **Hooks de Mutação Reutilizáveis**: Modais (`CreateTaskModal`, `AddMemberModal`, `CreateStageModal`, `ProjectSettingsModal`) desprovidos de chamadas diretas a `api.post`/`tasksService` ou `queryClient.invalidateQueries`. Mutação e invalidação de cache centralizadas em `frontend/src/hooks/` (`useTaskQueries.ts`, `useProjectQueries.ts`).
    * **Promises Assíncronas no `onSuccess`**: Callbacks `onSuccess` configurados como `async () => { await queryClient.invalidateQueries(...); }` eliminando avisos do ESLint (`@typescript-eslint/no-floating-promises`).
  * **Qualidade de Código, Padrões React & Desempenho:**
    * **Exclusividade de Named Exports**: Removidos todos os `export default` dos componentes React (`ProjectSettingsModal`, `ReleaseCandidatesModal`, `GanttTimelineView`, `GanttHeaderStats`, `GanttChartGrid`). Padrão `export const ComponentName = ...` adotado em 100% dos componentes.
    * **Refatoração DRY & Eliminação de Ternários Complexos**: Criados sub-componentes auxiliares reutilizáveis (`EmptyStateCard`, `LoadingStateSpinner`) e helpers utilitários (`getGatekeeperStatusChipProps`, `getRcStatusChipProps`, `getStagePlannedDateString`) no `ProjectSettingsModal.tsx`.
    * **Processamento Paralelo (`Promise.all`)**: Substituídas as repetições sequenciais `for (const x of arr) { await ... }` por requisições paralelas via `Promise.all(...)`, resolvendo o aviso `no-await-in-loop` e otimizando a resposta ao salvar configurações.
    * **Remoção de Mocked Fallbacks**: Removidos valores hardcoded de testes, exibindo diretamente as propriedades do modelo de dados real.
  * **Validação de Compilação, Linter & Formatação:**
    * Monorepo Lint: 0 erros e 0 warnings no ESLint do backend e frontend (`npm run lint`).
    * Monorepo Prettier: `npm run format` executado e `npm run format:check` passando com 100% dos arquivos ajustados.
    * Backend Unit Tests: 18/18 suítes de teste passando (63/63 testes unitários aprovados).
    * Backend & Frontend Build: Compilação TypeScript e Vite estática concluída com 0 erros (`npm run build`).

---

### 🚀 Próximas Atividades Imediatas (Escolha para Retomar)

#### 🎯 Opção 1 (Recomendada - Camada de IA): Integração da Gaveta SciAI no Frontend
1. **Atividade 1.1:** Transpor os componentes de referência (`frontend/references-ai-chat/`) para o layout oficial do editor no frontend, criando a `<AIChatSidebar />`.
2. **Atividade 1.2:** Conectar a gaveta ao endpoint de streaming SSE do backend Fastify `/api/v1/ai/chat/stream`.
3. *Arquivo de Referência:* [`docs/planning/specs/sciai-chat-copilot-spec.md`](file:///home/gilson-russo/development/professional/sci-latex-vscode/docs/planning/specs/sciai-chat-copilot-spec.md)

#### 🛠️ Opção 2 (Novo Recurso): Painel Admin em Tempo Real
1. **Atividade 2.1:** Criar endpoint SSE de administração `/api/v1/admin/events` no backend para transmitir status de conexões WebSocket ativas, taxa de checkpoints e métricas do cluster.
2. **Atividade 2.2:** Desenvolver página `/admin` no frontend para visualização de usuários online e duração de sessões ativas.

## 📊 2. Visão Geral do Status por Bloco

| Bloco | Descrição | Status | Referência |
| :--- | :--- | :---: | :--- |
| **Fase I** | Modelagem Relacional Prisma 7, Autenticação JWT e RBAC | 🟢 Concluído | [`DATABASE.md`](file:///home/gilson-russo/development/professional/sci-latex-vscode/docs/DATABASE.md) |
| **Fase II** | Editor Colaborativo CodeMirror 6, OT e Debounce Híbrido | 🟢 Concluído | [`ADR-007`](file:///home/gilson-russo/development/professional/sci-latex-vscode/docs/planning/adrs/adr-007-collaborative-editor-architecture-scaling.md) |
| **Fase III** | Fencing Monotônico de Posse e Resiliência Multi-Pod | 🟢 Concluído | [`ADR-007.1`](file:///home/gilson-russo/development/professional/sci-latex-vscode/docs/planning/adrs/adr-007.1-document-ownership-fencing-and-routing.md) |
| **Fase IV** | Workflow em 6 Etapas Fixas e Modelo de Revisão em 2 Níveis | 🟢 Concluído | [`ADR-008`](file:///home/gilson-russo/development/professional/sci-latex-vscode/docs/planning/adrs/adr-008-workflow-6-etapas-revisao-desacoplamento-git.md) |
| **Fase V** | Persistência Relacional de Apontamentos (`ReviewComment`) | 🟢 Concluído | [`ADR-010`](adrs/adr-010-review-comment-persistence-and-db-alignment.md) |
| **Fase VI** | Camada de IA Científica Multi-Agente (`ai-service` / SciAI) | 🟡 **Em Execução** | [`ADR-009`](adrs/adr-009-sciai-api-first-experimentation-and-service-enablement.md) |
| **Fase VII**| Painel Admin em Tempo Real & Observabilidade Live SSE | 🟢 **Concluído** | [`ADR-014`](adrs/adr-014-painel-admin-saude-e-metricas-aplicacao.md) |
| **Fase VIII**| Arquitetura de Evidências de Tarefas & Upload Direto MinIO | 🟢 Concluído | [`ADR-011`](adrs/adr-011-task-evidences-storage-architecture.md) |
---

## 🔄 3. Protocolo de Pausa e Atualização de Status

Toda vez que pausar ou encerrar uma atividade:
1. Atualize a seção **1. Onde Parei & Como Retomar** deste arquivo ([`STATUS.md`](STATUS.md)).
2. Descreva o que foi alterado na sessão e qual o primeiro passo para o próximo desenvolvedor / IA.
3. Se finalizar uma tarefa, marque como `[x]` no [`ROADMAP.md`](ROADMAP.md).
