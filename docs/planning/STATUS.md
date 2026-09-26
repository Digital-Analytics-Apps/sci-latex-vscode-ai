# 📌 Status de Desenvolvimento & Guia de Retomada (`STATUS.md`)

**Projeto:** Plataforma Web de Escrita Científica Self-Hosted (`sci-latex-vscode`)  
**Última Atualização:** 26 de Setembro de 2026  
**Status Geral do Projeto:** 🟢 Fases 1 a 4 (GitHub-Native & Refatoração Frontend) Concluídas com Sucesso. Próxima etapa: **Bloco 4 (Live Admin Dashboard)** ou **Refinamentos de UX (`analisar.md`)**.

---

## ⚡ 1. Onde Parei & Como Retomar (Session Checkpoint)

> [!IMPORTANT]
> **Consulte esta seção sempre que iniciar ou retomar uma sessão de desenvolvimento.** Ela indica exatamente a última alteração realizada e qual o primeiro comando/tarefa a ser executado.

### 🔍 Estado Atual da Aplicação
* **Última Implementação Finalizada:**
  * **Robustez e Normalização nos Filtros da Tabela de Revisões:**
    * Atualizada a página [`ReviewsListPage.tsx`](file:///home/gilson-russo/development/professional/sci-latex-vscode/frontend/src/features/reviewer/ReviewsListPage.tsx) para tratar de forma robusta todos os campos de filtro (`projectId`, `status`, `nitStatus` e `search`):
      * **Filtro de Projetos:** Adicionada verificação dinâmica de fallback (`Projeto (ID...)`) caso o `projectId` na URL ainda não exista no mapa de projetos disponíveis, garantindo que o MUI Select nunca fique em branco.
      * **Filtros de Status do PR e Parecer NIT:** Incluídos todos os enums válidos do domínio (`DRAFT`, `CANCELLED`, `NOT_REQUIRED`) nas opções de `<MenuItem>` e adicionada normalização de caixa (case-insensitivity) com fallback automático para valores desconhecidos.
      * **Eliminação de Piscadas na Tela (Zero-Flicker Filtering):** Adicionado `placeholderData: keepPreviousData` no hook [`usePendingReviews`](file:///home/gilson-russo/development/professional/sci-latex-vscode/frontend/src/hooks/useReviewQueries.ts) e removido o bloco de unmount completo da página em `ReviewsListPage.tsx`. Agora, ao digitar ou alterar filtros, o layout (cabeçalho, métricas e formulário de busca) permanece 100% montado e o foco do teclado não é perdido; apenas o indicador interno de carregamento do DataGrid é acionado (`loading={isLoading || isFetching}`).
      * **Ajuste de Estado no Render (React 19 / Anti-Cascading Render):** Substituído o `useEffect` síncrono de atualização do `searchTerm` pelo padrão oficial do React ("Adjusting state during render" com `prevUrlSearch`), eliminando avisos de renderização em cascata e mantendo 100% de conformidade com as diretrizes do React.
      * **Botão "Limpar Filtros":** Adicionada ação visual para redefinir rapidamente todos os parâmetros de filtro para os valores padrões usando `resetFilters()`.
  * **Uso da Prop Nativa `renderProp` no `<AutoSizer>`:**
    * Atualizada a página [`ReviewsListPage.tsx`](file:///home/gilson-russo/development/professional/sci-latex-vscode/frontend/src/features/reviewer/ReviewsListPage.tsx) para utilizar a prop nativa `renderProp={({ height, width }) => ...}` do `<AutoSizer>`.
  * **Tabela Genérica MUI DataGrid (`<GenericDataGrid<T> />`) & Hook de URL Genérico:**
    * Componente [`GenericDataGrid.tsx`](file:///home/gilson-russo/development/professional/sci-latex-vscode/frontend/src/components/common/GenericDataGrid.tsx) desacoplado + utilitários genéricos em [`urlParamsUtils.ts`](file:///home/gilson-russo/development/professional/sci-latex-vscode/frontend/src/utils/urlParamsUtils.ts) e [`useUrlFilters.ts`](file:///home/gilson-russo/development/professional/sci-latex-vscode/frontend/src/hooks/useUrlFilters.ts).
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
