# 📌 Status de Desenvolvimento & Guia de Retomada (`STATUS.md`)

**Projeto:** SCIA — Scientific Collaboration + AI (`sci-latex-vscode`)  
**Última Atualização:** 03 de Outubro de 2026  
**Status Geral do Projeto:** 🟢 **Arquitetura Orientada a Personas (`src/features/author`, `src/features/reviewer`, `src/features/manager`, `src/features/coordinator`), Organização DDD do Domínio de Autor (`src/features/author/components` & `src/features/author/modals`), Desacoplamento Estrito do Módulo Workspace (`src/features/workspace` focado 100% na Sessão IDE), Padronização DataGrid + Filtros com `useTableFilters` e Correção do Flashing/Re-render.** 100% dos testes Vitest (18 suítes / 63 testes) e compilações TypeScript (backend & frontend) passando com 0 erros.

---

## ⚡ 1. Onde Parei & Como Retomar (Session Checkpoint)

> [!IMPORTANT]
> **Consulte esta seção sempre que iniciar ou retomar uma sessão de desenvolvimento.** Ela indica exatamente a última alteração realizada e qual o primeiro comando/tarefa a ser executado.

### 🔍 Estado Atual da Aplicação
  * **Reorganização DDD por Domínio de Autor & Padronização de Componentes Comuns:**
    * **Criação do Componente Reutilizável de Topbar (`AppHeaderBar.tsx`)**:
      * Criado [`src/components/common/AppHeaderBar.tsx`](file:///home/gilson-russo/development/professional/sci-latex-vscode/frontend/src/components/common/AppHeaderBar.tsx) encapsulando o padrão visual do `AuthorLayout`: marca clicável com navegação `/`, chip de status SSE em tempo real, alternador de tema claro/escuro (`useColorMode`), avatar do usuário com iniciais e menu dropdown de perfil e logout.
      * Refatorados todos os layouts de persona ([`AuthorLayout.tsx`](file:///home/gilson-russo/development/professional/sci-latex-vscode/frontend/src/layouts/AuthorLayout.tsx), [`CoordinatorLayout.tsx`](file:///home/gilson-russo/development/professional/sci-latex-vscode/frontend/src/layouts/CoordinatorLayout.tsx), [`ManagerLayout.tsx`](file:///home/gilson-russo/development/professional/sci-latex-vscode/frontend/src/layouts/ManagerLayout.tsx), [`ReviewerLayout.tsx`](file:///home/gilson-russo/development/professional/sci-latex-vscode/frontend/src/layouts/ReviewerLayout.tsx)) para utilizar `<AppHeaderBar />` eliminando duplicidade de código.
    * **Criação dos Containers Reutilizáveis de Layout (`PageContainer` & `TableContainer`)**:
      * Criados [`src/components/common/PageContainer.tsx`](file:///home/gilson-russo/development/professional/sci-latex-vscode/frontend/src/components/common/PageContainer.tsx) e [`src/components/common/TableContainer.tsx`](file:///home/gilson-russo/development/professional/sci-latex-vscode/frontend/src/components/common/TableContainer.tsx) para padronizar o layout flexbox coluna e medição exata do `<AutoSizer>`.
    * **Limpeza Cirúrgica do Módulo `workspace`**: A pasta `src/features/workspace/` foi isolada para concentrar **exclusivamente** os componentes da sessão ativa do editor IDE (`WorkspacePage.tsx`, `CodeServerIframe.tsx`, `SaveProgressModal.tsx`, `CreatePRModal.tsx`).
    * **Migração das Células & Tabela de Tarefas para Autor (`src/features/author/components/`)**:
      * `AuthorTasksTable.tsx` e `TaskDataGridCells.tsx` foram movidos para `src/features/author/components/`, alinhando-se à governança do artigo do autor.
    * **Migração dos Modais de Governança para Autor (`src/features/author/modals/`)**:
      * `AddMemberModal.tsx`, `CreateProjectModal.tsx`, `CreateStageModal.tsx`, `CreateTaskModal.tsx`, `ProjectSettingsModal.tsx` e `ReleaseCandidatesModal.tsx` foram reestruturados sob `src/features/author/modals/`.
    * **Atualização Geral de Importações**: Todas as referências em `ArticleDetailPage.tsx`, `AuthorArticlesPage.tsx` e `ManagerDashboardPage.tsx` foram atualizadas.
  * **Estabilização de Desempenho & Resolução de Re-renders / Flashing nos Filtros:**
    * **Correção do Loop Layout/Feedback no `AutoSizer`**: Refatorado o container `<GenericDataGrid>` para utilizar layout Flexbox (`height: height`, `flex: "0 0 auto"` no header, `flex: 1, minHeight: 0` no `CardContent`), prevenindo que a adição de `headerToolbarContent` altere recursivamente o cálculo de altura do `AutoSizer`.
    * **Correção do Flashing no Reset de Busca (`useTableFilters`)**: Ajustado o hook `useTableFilters.ts` para ignorar timers de debounce pendentes quando `searchTerm === ""`, limpando instantaneamente a URL sem repassar valores defasados.
    * **Estabilização de Referência `apiParams` (`useUrlFilters`)**: Implementada comparação em memória via `useRef` e `JSON.stringify` no `useUrlFilters.ts`, garantindo que o objeto `apiParams` mantenha igualdade referencial e não dispare re-execuções desnecessárias no TanStack Query.
  * **Padrão Declarativo de Filtros (`TableHeaderFilterToolbar` & `useTableFilters`):**
    * Refatorado o componente `TableHeaderFilterToolbar<TFilterState>` em `src/components/common/TableFilters.tsx` para tipagem genérica forte e suporte a slots declarativos (`search`, `selectFilters`, `actions`, `clearFilters`).
    * Atualizado o standard em `~/.gemini/config/skills/datagrid-table-standard/SKILL.md`.
  * **Qualidade, Linter e Testes Automatizados:**
    * **Backend (`npm run build` / `npx tsc`):** 0 erros de compilação.
    * **Backend (`npm test`):** 100% das 18 suítes e 63 testes unitários/integração aprovados.
    * **Frontend (`npx tsc --noEmit` & `npm run lint`):** 0 erros de compilação ou linter em todo o projeto.

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
| **Bloco 6.7** | Etapas Dinâmicas, Branches 4-Level & Claim/Unclaim | 🟢 Concluído | [`ROADMAP.md#bloco-67`](file:///home/gilson-russo/development/professional/sci-latex-vscode/docs/planning/ROADMAP.md) |
| **Bloco 4** | Painel Admin em Tempo Real (Live SSE Admin) | 🟡 **A Iniciar** | [`ROADMAP.md#bloco-4`](file:///home/gilson-russo/development/professional/sci-latex-vscode/docs/planning/ROADMAP.md) |
| **Bloco 5** | Infraestrutura Futura (Hibernação de Pods & SSH Desktop) | ⚪ Backlog | [`ROADMAP.md#bloco-5`](file:///home/gilson-russo/development/professional/sci-latex-vscode/docs/planning/ROADMAP.md) |

---

## 🔄 3. Protocolo de Pausa e Atualização de Status

Toda vez que você pausar ou encerrar uma atividade:
1. Atualize a seção **1. Onde Parei & Como Retomar** deste arquivo ([`STATUS.md`](file:///home/gilson-russo/development/professional/sci-latex-vscode/docs/planning/STATUS.md)).
2. Descreva o que foi alterado na sessão e qual o primeiro passo para o próximo desenvolvedor / IA.
3. Se finalizar uma tarefa do Jira ou Roadmap, marque como `[x]` no [`ROADMAP.md`](file:///home/gilson-russo/development/professional/sci-latex-vscode/docs/planning/ROADMAP.md) e siga o fluxo de commit em [`WORKFLOW.md`](file:///home/gilson-russo/development/professional/sci-latex-vscode/docs/planning/WORKFLOW.md).
