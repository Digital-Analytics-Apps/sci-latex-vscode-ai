# 📌 Status de Desenvolvimento & Guia de Retomada (`STATUS.md`)

**Projeto:** SCIA — Scientific Collaboration and Intelligent Assistance (`sci-latex-vscode`)  
**Última Atualização:** 24 de Outubro de 2026  
**Status Geral do Projeto:** 🟢 **Arquitetura do Editor Colaborativo Consolidada (ADR-007) & Camada de IA Científica (`ai-service`).** Finalizada a implementação completa da ADR-007 para escalabilidade horizontal do editor colaborativo CodeMirror 6, eliminando I/O desnecessário no Redis, blindando a persistência com debounce híbrido e transações atômicas no PostgreSQL, e estabilizando a sincronização multi-arquivo.

---

## ⚡ 1. Onde Parei & Como Retomar (Session Checkpoint)

> [!IMPORTANT]
> **Consulte esta seção sempre que iniciar ou retomar uma sessão de desenvolvimento.** Ela indica exatamente a última alteração realizada e qual o primeiro comando/tarefa a ser executado.

### 🔍 Estado Atual da Aplicação
  * **Branch Ativa:** `feature/sciai-integration-layer`
  * **Refatoração e Blindagem do Editor Colaborativo (ADR-007 Implementada e Aprovada):**
    * **Limpeza do Hot Path no Redis:** Removido o `rpush` de deltas de texto no Redis em `documents.service.ts`. A digitação opera em memória RAM do Pod dono com latência < 2ms.
    * **Debounce Híbrido Multi-Critério:** Implementado timer de inatividade (3s), teto máximo contínuo (15s) e corte por volume (50 ops) para garantir checkpoints regulares no PostgreSQL sem risco de perda sob digitação ininterrupta.
    * **Graceful Shutdown (`server.ts`):** Tratamento de `SIGTERM`/`SIGINT` para persistir todos os documentos ativos de `activeDocs` no PostgreSQL antes de encerrar o processo.
    * **Concorrência Otimista & Transação Atômica (`documents.repository.ts`):** `saveCheckpoint` unifica a atualização da versão do projeto, `ProjectFile.content` (`main.tex`), arquivos secundários (`filesCollab`) e `DocumentSnapshot` em uma única chamada `prisma.$transaction`, com validação de `expectedOldVersion`.
    * **Coordenação de Posse (Document Ownership Lease):** Primitivas `acquireDocumentLease` e `renewDocumentLease` no Redis (`editor:document:<docId>:owner`, TTL 10s renovado a cada 3s) garantindo autoridade Single-Writer por documento para orquestração multi-pod em Kubernetes.
    * **Estabilização do WebSocket no Frontend (`useCollabWebSocket.ts`):** Removido `activeFile` das dependências do socket para eliminar reconexões indesejadas ao alternar abas, e adicionada fila de retry offline (`messageQueueRef`).
    * **Sincronização Multi-Arquivo em Tempo Real:** O backend expõe `getAllCollabVersions` no `SYNC_INIT` e une o estado em memória quente em `listProjectFiles`. O frontend rastreia `fileCollabVersions` de forma isolada, corrigindo a propagação de alterações entre arquivos secundários.
  * **Estruturação da Nova Camada de IA (`ai-service/`):**
    * **Triagem Limpa do `sci-project`**: Descartados códigos legados e complexidade acidental (compilador Docker síncrono bloqueante, WebSockets colaborativos YRoom com vazamento de memória, autenticação duplicada e CRUDs SQLModel locais).
    * **Extração do Núcleo de Agentes LangGraph**:
      * `ai-service/app/agents/state.py`: Estado compartilhado tipado (`OnboardingState`, `Article`, `TaskItem`).
      * `ai-service/app/agents/sub_agents/supervisor.py`: Orquestrador geral do fluxo guiado de 4 estágios.
      * `ai-service/app/agents/sub_agents/idea_refiner.py`: Guia de Exploração para refinamento de hipóteses e tema de pesquisa.
      * `ai-service/app/agents/sub_agents/search_specialist.py`: Especialista de busca bibliográfica com `interrupt` Human-in-the-Loop.
      * `ai-service/app/agents/sub_agents/curation.py`: Curadoria de artigos e roadmap preliminar (limpo de acoplamentos locais com banco).
      * `ai-service/app/agents/writer.py`: Redator acadêmico LaTeX.
    * **Ferramentas de Pesquisa Científica com Connection Pooling**:
      * `ai-service/app/agents/tools/openalex.py`: Conector com semáforo de concorrência e reaproveitamento de conexões TCP.
      * `ai-service/app/agents/tools/semantic_scholar.py`: Conector Semantic Scholar com retries e exponential backoff.
      * `ai-service/app/agents/tools/academic_search.py`: Facade unificada com fallback resiliente (S2 ➡️ OpenAlex).
      * `ai-service/app/agents/tools/tavily_search.py`: Busca web com Tavily.
    * **APIs e Streaming SSE**:
      * `ai-service/app/api/v1/endpoints/chat.py`: Endpoints `/chat/stream` e `/chat/resume` para o chat interativo.
      * `ai-service/app/api/v1/endpoints/runs.py`: Endpoints M2M assíncronos (`POST /runs`, `/resume`, `/cancel`) com autenticação `X-Internal-Service-Key`.
      * `ai-service/app/streaming/stream_processor.py`: Formatador enxuto de eventos Server-Sent Events.
    * **ADR 009 Proposta (Em Discussão):** Documentada em [`docs/planning/adrs/adr-009-sciai-api-first-experimentation-and-service-enablement.md`](file:///home/gilson-russo/development/professional/sci-latex-vscode/docs/planning/adrs/adr-009-sciai-api-first-experimentation-and-service-enablement.md) a estratégia de experimentação headless via API, sem acoplamento ao frontend, cobrindo o harness CLI, injeção de `MemorySaver` para suportar `interrupt()`, alinhamento do Ollama local (`qwen3.5:4b`) e rota para o redator LaTeX (`writer.py`).
  * **Referências de Chat Copilot & Onboarding no Frontend (`frontend/references-ai-chat/`):**
    * Copiados como modelo de implementação: `OnboardingChat.reference.tsx`, `onboardingApi.reference.ts` e `AIChatSidebar.reference.tsx`.
    * Criado `frontend/references-ai-chat/README.md` com diretrizes para adaptação ao design system do SCIA, tipagens e proxy Fastify.
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
| **Fase V** | Persistência Relacional de Apontamentos (`ReviewComment`) | 🟢 Concluído | [`ADR-010`](file:///home/gilson-russo/development/professional/sci-latex-vscode/docs/planning/adrs/adr-010-review-comment-persistence-and-db-alignment.md) |
| **Fase VI** | Camada de IA Científica Multi-Agente (`ai-service` / SciAI) | 🟡 **Em Execução** | [`ADR-009`](file:///home/gilson-russo/development/professional/sci-latex-vscode/docs/planning/adrs/adr-009-sciai-api-first-experimentation-and-service-enablement.md) |
| **Fase VII**| Painel Admin em Tempo Real & Observabilidade Live SSE | ⚪ **Prioridade Próxima** | [`IMPLEMENTATION_PLAN.md`](file:///home/gilson-russo/development/professional/sci-latex-vscode/docs/IMPLEMENTATION_PLAN.md) |
---

## 🔄 3. Protocolo de Pausa e Atualização de Status

Toda vez que pausar ou encerrar uma atividade:
1. Atualize a seção **1. Onde Parei & Como Retomar** deste arquivo ([`STATUS.md`](STATUS.md)).
2. Descreva o que foi alterado na sessão e qual o primeiro passo para o próximo desenvolvedor / IA.
3. Se finalizar uma tarefa, marque como `[x]` no [`ROADMAP.md`](ROADMAP.md).
