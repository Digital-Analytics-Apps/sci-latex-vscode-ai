# 📌 Status de Desenvolvimento & Guia de Retomada (`STATUS.md`)

**Projeto:** Plataforma Web de Escrita Científica Self-Hosted (`sci-latex-vscode`)  
**Última Atualização:** 26 de Setembro de 2026  
**Status Geral do Projeto:** 🟢 Fases 1 a 4 (GitHub-Native & Refatoração Frontend) Concluídas com Sucesso. Próxima etapa: **Bloco 4 (Live Admin Dashboard)** ou **Refinamentos de UX (`analisar.md`)**.

---

## ⚡ 1. Onde Parei & Como Retomar (Session Checkpoint)

> [!IMPORTANT]
> **Consulte esta seção sempre que iniciar ou retomar uma sessão de desenvolvimento.** Ela indica exatamente a última alteração realizada e qual o primeiro comando/tarefa a ser executado.

### 🔍 Estado Atual da Aplicação
* **Últimas Implementações Finalizadas:**
  * **Decomposição e Refatoração do Dashboard (`Dashboard Role-Based Architecture`):**
    * Criado [`AuthorDashboard.tsx`](file:///home/gilson-russo/development/professional/sci-latex-vscode/frontend/src/features/dashboard/components/AuthorDashboard.tsx) (fluxo de 2 níveis do autor, membros e DataGrid) e [`ManagementDashboard.tsx`](file:///home/gilson-russo/development/professional/sci-latex-vscode/frontend/src/features/dashboard/components/ManagementDashboard.tsx) (grid de KPIs para Coordenador/Gerente/Admin).
    * Refatorado [`DashboardPage.tsx`](file:///home/gilson-russo/development/professional/sci-latex-vscode/frontend/src/features/dashboard/DashboardPage.tsx) de 683 para ~230 linhas, tornando-o um orquestrador top-level de rota, estado e modais.
    * Registrada a especificação técnica Seção 6.5 em [`frontend-specs.md`](file:///home/gilson-russo/development/professional/sci-latex-vscode/docs/planning/specs/frontend-specs.md#L185).
  * **Correção de Navegação e Filtros via URL (`{ replace: true }`):**
    * Corrigido [`useUrlFilters.ts`](file:///home/gilson-russo/development/professional/sci-latex-vscode/frontend/src/hooks/useUrlFilters.ts) para aplicar `{ replace: true }` nas chamadas de `setSearchParams` em `setFilters` e `resetFilters`, impedindo acúmulo indesejado no histórico de navegação ao filtrar ou digitar.
    * Atualizado [`DashboardPage.tsx`](file:///home/gilson-russo/development/professional/sci-latex-vscode/frontend/src/features/dashboard/DashboardPage.tsx) para usar navegação atômica sem delay em `handleClearArticle` (`dispatch` + `navigate` com `{ replace: true }`) e sincronização bi-direcional no `useEffect`.
  * **Padrão Obrigatório DataGrid com Filtros via URL (`DataGrid URL-Filter Pattern`):**
    * **Especificação Técnica no Frontend (`frontend-specs.md#6.4`):** Formalizado a especificação obrigatória (Seção 6.4) que determina a arquitetura unificada de tabelas utilizando `useUrlFilters` para gravação de query params na URL, `placeholderData: keepPreviousData` para UX anti-piscadas (zero-flicker), `useDebounce` (400ms) para busca textual e o padrão de sincronização do React 19 durante a fase de render sem avisos de cascading render.
    * **Suporte a Filtros no Backend REST (`GET /api/v1/projects/:projectId/tasks`):**
      * Atualizados [`tasks.repository.ts`](file:///home/gilson-russo/development/professional/sci-latex-vscode/backend/src/repositories/tasks.repository.ts), [`tasks.service.ts`](file:///home/gilson-russo/development/professional/sci-latex-vscode/backend/src/modules/tasks/tasks.service.ts) e [`tasks.controller.ts`](file:///home/gilson-russo/development/professional/sci-latex-vscode/backend/src/modules/tasks/tasks.controller.ts) para aceitar os parâmetros de busca `status` e `search`, aplicando a filtragem no Prisma e nas projeções de Issues do GitHub.
    * **Integração na Tabela do Autor (`<AuthorTasksTable />`):**
      * Refatorado [`AuthorTasksTable.tsx`](file:///home/gilson-russo/development/professional/sci-latex-vscode/frontend/src/features/workspace/components/AuthorTasksTable.tsx) para consumir `useUrlFilters` e repassar os parâmetros limpos para `useTasksQuery(projectId, apiParams)`.
  * **Otimização do Componente de Status (`TaskStatusChip`):**
    * Refatorado [`TaskDataGridCells.tsx`](file:///home/gilson-russo/development/professional/sci-latex-vscode/frontend/src/features/workspace/components/TaskDataGridCells.tsx) utilizando a função auxiliar `getTaskStatusConfig(status)` (padrão equivalente a `getStatusColor` de `ReviewDetailPage.tsx`), eliminando duplicação de JSX.
* **Ambiente Ativo:** `docker compose up` ativo.
* **Status dos Testes & Build:** Backend com 16 arquivos e 51 suítes de testes passando (100% ok). TypeScript no backend e frontend com **0 erros** (`npx tsc --noEmit`). Build de produção do frontend compilado com **sucesso** (`npm run build`).

---

### 🚀 Próximas Atividades Imediatas (Escolha para Retomar)

#### 🎯 Opção 1 (Recomendada - Novo Recurso): Bloco 4 - Painel Admin em Tempo Real
1. **Atividade 4.1:** Criar endpoint SSE de administração `/api/v1/admin/events` no backend para transmitir status de conexões ativas, Pods K8s e rascunhos.
2. **Atividade 4.2:** Criar página/modal de Administração no frontend para visualizar usuários online, Pods (warm vs active), tempo de sessão e ações de desconexão.
3. *Arquivo de Referência:* [`docs/planning/ROADMAP.md`](file:///home/gilson-russo/development/professional/sci-latex-vscode/docs/planning/ROADMAP.md)

#### 🛠️ Opção 2 (Refinamentos de UX): Atender pendências de [`analisar.md`](file:///home/gilson-russo/development/professional/sci-latex-vscode/docs/planning/backlog/analisar.md)
1. **Tela do Autor Pós-Merge:** Permitir que o autor visualize o histórico de comentários e apontamentos da revisão mesmo após o PR ter sido mergeado.
2. **Movimentação Dinâmica de Tarefas (Kanban Auto-Move):** Mover cards dinamicamente na tabela/board com base no status real do PR (Draft -> Em Progresso, Mergeado -> Feito).
3. **Fluxo de Revisão Entre Pares (`PEER_REVIEW`):** Validar a experiência de co-autores revisando seções atribuídas aos pares.

---

## 📊 2. Visão Geral do Status por Bloco

| Bloco | Descrição | Status | Referência |
| :--- | :--- | :---: | :--- |
| **Bloco 1** | Estabilização Backend, Infra K8s & Zen Mode | 🟢 Concluído | [`ROADMAP.md#bloco-1`](file:///home/gilson-russo/development/professional/sci-latex-vscode/docs/planning/ROADMAP.md) |
| **Bloco 2** | Regras de Negócio de PRs, Revisão & Pods Isolados | 🟢 Concluído | [`ROADMAP.md#bloco-2`](file:///home/gilson-russo/development/professional/sci-latex-vscode/docs/planning/ROADMAP.md) |
| **Bloco 3** | Frontend ReactJS (Vite, Modais, Services Centralizados) | 🟢 Concluído | [`ROADMAP.md#bloco-3`](file:///home/gilson-russo/development/professional/sci-latex-vscode/docs/planning/ROADMAP.md) |
| **Fases 1-4** | Integração GitHub-Native, Projeções & SSE | 🟢 Concluído | [`reports/relatorio-fase-4.md`](file:///home/gilson-russo/development/professional/sci-latex-vscode/docs/planning/reports/relatorio-fase-4.md) |
| **Bloco 4** | Painel Admin em Tempo Real (Live SSE Admin) | 🟡 **A Iniciar** | [`ROADMAP.md#bloco-4`](file:///home/gilson-russo/development/professional/sci-latex-vscode/docs/planning/ROADMAP.md) |
| **Bloco 5** | Infraestrutura Futura (Hibernação de Pods & SSH Desktop) | ⚪ Backlog | [`ROADMAP.md#bloco-5`](file:///home/gilson-russo/development/professional/sci-latex-vscode/docs/planning/ROADMAP.md) |

---

## 🔄 3. Protocolo de Pausa e Atualização de Status

Toda vez que você pausar ou encerrar uma atividade:
1. Atualize a seção **1. Onde Parei & Como Retomar** deste arquivo ([`STATUS.md`](file:///home/gilson-russo/development/professional/sci-latex-vscode/docs/planning/STATUS.md)).
2. Descreva o que foi alterado na sessão e qual o primeiro passo para o próximo desenvolvedor / IA.
3. Se finalizar uma tarefa do Jira ou Roadmap, marque como `[x]` no [`ROADMAP.md`](file:///home/gilson-russo/development/professional/sci-latex-vscode/docs/planning/ROADMAP.md) e siga o fluxo de commit em [`WORKFLOW.md`](file:///home/gilson-russo/development/professional/sci-latex-vscode/docs/planning/WORKFLOW.md).
