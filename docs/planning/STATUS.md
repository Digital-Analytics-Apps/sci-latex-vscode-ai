# 📌 Status de Desenvolvimento & Guia de Retomada (`STATUS.md`)

**Projeto:** SCIA — Scientific Collaboration + AI (`sci-latex-vscode`)  
**Última Atualização:** 12 de Outubro de 2026  
**Status Geral do Projeto:** 🟢 **Criação da Camada de IA Científica (`ai-service`) & Triagem Arquitetural.** Criação da branch `feature/sciai-integration-layer` e estruturação da nova camada independente `ai-service/` (Python 3.12, FastAPI, LangGraph, OpenAlex e Semantic Scholar), filtrando e eliminando todo o código legado e complexidade desnecessária do `sci-project`.

---

## ⚡ 1. Onde Parei & Como Retomar (Session Checkpoint)

> [!IMPORTANT]
> **Consulte esta seção sempre que iniciar ou retomar uma sessão de desenvolvimento.** Ela indica exatamente a última alteração realizada e qual o primeiro comando/tarefa a ser executado.

### 🔍 Estado Atual da Aplicação
  * **Branch Ativa:** `feature/sciai-integration-layer`
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
  * **Referências de Chat Copilot & Onboarding no Frontend (`frontend/references-ai-chat/`):**
    * Copiados como modelo de implementação: `OnboardingChat.reference.tsx`, `onboardingApi.reference.ts` e `AIChatSidebar.reference.tsx`.
    * Criado `frontend/references-ai-chat/README.md` com diretrizes para adaptação ao design system do SCIA, tipagens e proxy Fastify.
  * **Resolução Dinâmica de Tokens Git & Sincronização de Workspace:**
    * **Simplificação e Clone Direto da Branch (`EditorProxyService`)**: Refatorado o método `ensureTaskWorkspace` eliminando tentativas aninhadas e fallbacks desnecessários. O Git clona diretamente a branch remota da tarefa (`git clone --branch <branchName>`) em um único comando e só executa a criação de templates genéricos se o arquivo `main.tex` não existir, preservando integralmente os arquivos da branch remota.
    * **Ajuste de Escopo do JWT no Reverse Proxy (`editorProxyRoutes`)**: O middleware `verifyJwt` foi aplicado especificamente à rota de entrada `GET /:projectId`, liberando o Reverse Proxy `/app/*` para servir sub-recursos estáticos (HTML, JS, CSS) e conexões WebSocket do VS Code sem ser travado com erros 401 Unauthorized.
    * **Normalização Dinâmica de `STORAGE_PATH` (`backend/src/config/env.ts`)**: Corrigida a resolução do caminho base de armazenamento quando o backend é executado diretamente via terminal no host (`process.cwd()` em `/backend`). O caminho `STORAGE_PATH` é resolvido para a raiz do monorepo (`../storage`), alinhando com o volume montado pelo Kind (`/home/coder/storage`) e garantindo que arquivos TeX (`main.tex`, `sections/`) fiquem instantaneamente disponíveis no container `code-server` do Pod Kubernetes.
    * **Validação Dinâmica de `subPath` do Pod (`K8sPodManagerService`)**: Adicionada verificação do `volumeMounts[0].subPath` do Pod `activePod` em execução no Kubernetes. Caso o Pod em execução esteja apontando para um subcaminho desatualizado (ex: `stages/general/...` em vez de `stages/:stageId/...`), o Pod antigo é destruído e recriado automaticamente com o alinhamento correto.
    * **Propagação de `stageId` no Iframe do VS Code (`CodeServerIframe` & `WorkspacePage`)**: Atualizado o componente `CodeServerIframe` e a `WorkspacePage` no frontend para enviar `stageId` na URL do iframe (`/editor-proxy/:projectId?stageId=...`).
    * **Fallback de Autenticação (`GitService`)**: Adicionado helper `getEffectiveToken()` em `git.service.ts` com fallback para `gh auth token` quando `GITHUB_TOKEN` for dummy ou inválido no ambiente local de desenvolvimento.
  * **Encapsulamento Arquitetural de Frontend (SOC & TanStack Query Hooks):**
    * **Hooks de Mutação Reutilizáveis**: Modais (`CreateTaskModal`, `AddMemberModal`, `CreateStageModal`, `ProjectSettingsModal`) desprovidos de chamadas diretas a `api.post`/`tasksService` ou `queryClient.invalidateQueries`. Mutação e invalidação de cache centralizadas em `frontend/src/hooks/` (`useTaskQueries.ts`, `useProjectQueries.ts`).
    * **Promises Assíncronas no `onSuccess`**: Callbacks `onSuccess` configurados como `async () => { await queryClient.invalidateQueries(...); }` eliminando avisos do ESLint (`@typescript-eslint/no-floating-promises`).
  * **Qualidade de Código, Padrões React & Desempenho:**
    * **Exclusividade de Named Exports**: Removidos todos os `export default` dos componentes React (`ProjectSettingsModal`, `ReleaseCandidatesModal`, `GanttTimelineView`, `GanttHeaderStats`, `GanttChartGrid`). Padrão `export const ComponentName = ...` adotado em 100% dos componentes.
    * **Refatoração DRY & Eliminação de Ternários Complexos**: Criados sub-componentes auxiliares reutilizáveis (`EmptyStateCard`, `LoadingStateSpinner`) e helpers utilitários (`getGatekeeperStatusChipProps`, `getRcStatusChipProps`, `getStagePlannedDateString`) no `ProjectSettingsModal.tsx`.
    * **Processamento Paralelo (`Promise.all`)**: Substituídas as repetições sequenciais `for (const x of arr) { await ... }` por requisições paralelas via `Promise.all(...)`, resolvendo o aviso `no-await-in-loop` e otimizando a resposta ao salvar configurações.
    * **Remoção de Mocked Fallbacks**: Removidas URLs hardcoded do repositório (`sci-paper-detecao-com-agentes...`), exibindo diretamente a propriedade do modelo de dados real (`projectDetails?.repo || projectDetails?.gitRepoPath`).
  * **Validação de Compilação, Linter & Formatação:**
    * Monorepo Lint: 0 erros e 0 warnings no ESLint do backend e frontend (`npm run lint`).
    * Monorepo Prettier: `npm run format` executado e `npm run format:check` passando com 100% dos arquivos ajustados.
    * Backend Unit Tests: 18/18 suítes de teste passando (63/63 testes unitários aprovados).
    * Backend & Frontend Build: Compilação TypeScript e Vite estática concluída com 0 erros (`npm run build`).

---

### 🚀 Próximas Atividades Imediatas (Escolha para Retomar)

#### 🎯 Opção 1 (Recomendada - Novo Recurso): Bloco 4 - Painel Admin em Tempo Real
1. **Atividade 4.1:** Criar endpoint SSE de administração `/api/v1/admin/events` no backend para transmitir status de conexões ativas, Pods K8s e rascunhos.
2. **Atividade 4.2:** Criar página/modal de Administração no frontend para visualizar usuários online, Pods (warm vs active), tempo de sessão e ações de desconexão.
3. *Arquivo de Referência:* [`docs/planning/ROADMAP.md`](file:///home/gilson-russo/development/professional/sci-latex-vscode/docs/planning/ROADMAP.md)

#### 🛠️ Opção 2 (Refinamentos de UX): Atender pendências de [`analisar.md`](file:///home/gilson-russo/development/professional/sci-latex-vscode/docs/planning/backlog/analisar.md)
1. **Fluxo de Revisão Entre Pares (`PEER_REVIEW`):** Validar a experiência de co-autores revisando seções atribuídas aos pares na visão Gantt.
2. **Integração com Modais Pós-Submissão:** Disparo automático do modal pós-submissão quando o artigo atingir a etapa de Gatekeeper 2 (Congresso Alvo).

---

## 📊 2. Visão Geral do Status por Bloco

| Bloco | Descrição | Status | Referência |
| :--- | :--- | :---: | :--- |
| **Bloco 1** | Estabilização Backend, Infra K8s & Zen Mode | 🟢 Concluído | [`ROADMAP.md#bloco-1`](file:///home/gilson-russo/development/professional/sci-latex-vscode/docs/planning/ROADMAP.md) |
| **Bloco 2** | Regras de Negócio de PRs, Revisão & Pods Isolados | 🟢 Concluído | [`ROADMAP.md#bloco-2`](file:///home/gilson-russo/development/professional/sci-latex-vscode/docs/planning/ROADMAP.md) |
| **Bloco 3** | Frontend ReactJS (Vite, Gantt Unificado, Services) | 🟢 Concluído | [`ROADMAP.md#bloco-3`](file:///home/gilson-russo/development/professional/sci-latex-vscode/docs/planning/ROADMAP.md) |
| **Fases 1-4** | Integração GitHub-Native, Projeções & SSE | 🟢 Concluído | [`reports/relatorio-fase-4.md`](file:///home/gilson-russo/development/professional/sci-latex-vscode/docs/planning/reports/relatorio-fase-4.md) |
| **Bloco 6.7** | Etapas Dinâmicas, Branches 4-Level, Gantt UI & Trava Sequencial | 🟢 Concluído | [`ROADMAP.md#bloco-67`](file:///home/gilson-russo/development/professional/sci-latex-vscode/docs/planning/ROADMAP.md) |
| **Bloco 4** | Painel Admin em Tempo Real (Live SSE Admin) | 🟡 **A Iniciar** | [`ROADMAP.md#bloco-4`](file:///home/gilson-russo/development/professional/sci-latex-vscode/docs/planning/ROADMAP.md) |
| **Bloco 5** | Infraestrutura Futura (Hibernação de Pods & SSH Desktop) | ⚪ Backlog | [`ROADMAP.md#bloco-5`](file:///home/gilson-russo/development/professional/sci-latex-vscode/docs/planning/ROADMAP.md) |

---

## 🔄 3. Protocolo de Pausa e Atualização de Status

Toda vez que você pausar ou encerrar uma atividade:
1. Atualize a seção **1. Onde Parei & Como Retomar** deste arquivo ([`STATUS.md`](file:///home/gilson-russo/development/professional/sci-latex-vscode/docs/planning/STATUS.md)).
2. Descreva o que foi alterado na sessão e qual o primeiro passo para o próximo desenvolvedor / IA.
3. Se finalizar uma tarefa do Jira ou Roadmap, marque como `[x]` no [`ROADMAP.md`](file:///home/gilson-russo/development/professional/sci-latex-vscode/docs/planning/ROADMAP.md) e siga o fluxo de commit em [`WORKFLOW.md`](file:///home/gilson-russo/development/professional/sci-latex-vscode/docs/planning/WORKFLOW.md).
