# 📌 Status de Desenvolvimento & Guia de Retomada (`STATUS.md`)

**Projeto:** Plataforma Web de Escrita Científica Self-Hosted (`sci-latex-vscode`)  
**Última Atualização:** 01 de Outubro de 2026  
**Status Geral do Projeto:** 🟢 **Arquitetura 100% Orientada a Personas (`src/features/author`, `src/features/reviewer`, `src/features/manager`, `src/features/coordinator`), Eliminação Completa da Pasta Genérica `src/features/dashboard/`, Componentes Compartilhados em `src/components/common/`, Tabela DataGrid de Artigos do Autor e Rotas Declarativas Concluídos com Sucesso.** 100% dos testes Vitest (18 suítes / 63 testes) e compilações TypeScript (backend & frontend) passando com 0 erros.

---

## ⚡ 1. Onde Parei & Como Retomar (Session Checkpoint)

> [!IMPORTANT]
> **Consulte esta seção sempre que iniciar ou retomar uma sessão de desenvolvimento.** Ela indica exatamente a última alteração realizada e qual o primeiro comando/tarefa a ser executado.

### 🔍 Estado Atual da Aplicação
  * **Arquitetura Orientada a Personas em `src/features/` & Eliminação da Pasta `dashboard/`:**
    * **Remoção da pasta `src/features/dashboard/`**: Eliminada a pasta genérica `dashboard/` e o orquestrador acoplado `DashboardPage.tsx`.
    * **Estruturação por Persona em `src/features/`**:
      1. `src/features/author/`: Contém `AuthorArticlesPage.tsx` (Nível 1 - Listagem DataGrid de Artigos) e `ArticleDetailPage.tsx` (Nível 2 - Detalhes do Artigo e Tarefas).
      2. `src/features/reviewer/`: Contém `ReviewsListPage.tsx` e `ReviewDetailPage.tsx`.
      3. `src/features/manager/`: Contém `ManagerDashboardPage.tsx` e suas seções.
      4. `src/features/coordinator/`: Contém `CoordinatorDashboardPage.tsx`.
    * **Centralização de Componentes Comuns em `src/components/common/`**: Cartões e gráficos reutilizados entre personas (ex: `ManagementDashboard.tsx`) agora residem exclusivamente em `src/components/common/`.
    * **Roteador com Resolvedor por Persona (`PersonaRootResolver.tsx`)**: O roteamento nativo em `src/routes/index.tsx` utiliza o `<RoleLayoutResolver />` e o `<PersonaRootResolver />` para renderizar diretamente a página da persona logada.
  * **Regras de Negócio de Atribuição de Tarefa, Branch & Workspace (`TaskDataGridCells.tsx`):**
    * **Inicialização Exclusiva por Autor Assinado:** Apenas o autor atualmente assinado na tarefa (`assignedToId === currentUserId`) visualiza e aciona o botão **"🚀 Iniciar Workspace"**.
    * **Checkout Automático da Branch Remota (`branchName`):** Quando um novo autor assume a tarefa (via "Assinar") e inicia o workspace, o backend/pod provisiona o ambiente e executa o `checkout`/`fetch` da branch exata da tarefa (`task.branchName`), baixando todo o trabalho remoto acumulado.
    * **Indicador de Sessão Ativa (`isOccupied` / Redis Presence):** A indicação `🔒 Em uso por [Nome]` foi movida para a coluna de **Ação**, substituindo o texto *"Aguardando atribuição"* quando o workspace estiver aberto ao vivo por outro autor. Na coluna de autor, o botão "Assinar" permanece desabilitado enquanto a sessão estiver ativa.
  * **Transformação da Tabela Principal do Autor (Nível 1) & Skill `datagrid-table-standard`:**
    * **Tabela `GenericDataGrid` & `AutoSizer`**: Exibição dos artigos padronizada em `AuthorArticlesPage.tsx` com renderização declarativa usando `createTitleSubtitleColumn`, `createChipColumn`, `createProgressColumn`, `createAvatarStackColumn` e `createActionsColumn`.
    * **Suíte de Filtros Reutilizáveis (`TableFilters.tsx`)**: Criados componentes genéricos em `src/components/common/TableFilters.tsx` (`TableFilterBar`, `TableSearchInput`, `TableSelectFilter`, `ClearFiltersButton`) que estendem nativamente as interfaces MUI (`TextFieldProps`, `SelectProps`, `ButtonProps`, `PaperProps`) repassando `...restProps`.
    * **Desacoplamento de Métricas (`MetricCard.tsx`)**: Criado `src/components/common/MetricCard.tsx` com `<MetricCard />` e `<DeadlineStatusChip />`. Removido o orquestrador legados `ManagementDashboard.tsx` e refatorada a visão do gerente (`OverviewSection.tsx`).
    * **Criação da Skill `datagrid-table-standard`**: Criada a skill obrigatória em `~/.gemini/config/skills/datagrid-table-standard/SKILL.md` e documentada na especificação do frontend (`frontend-specs.md` Seções 6.8 e 6.9) com regras de tipagem estrita (zero `any`, extensão de props MUI e generics `<TRow extends GridValidRowModel>`).
  * **Tratamento Estrito de Promessas (`@typescript-eslint/no-floating-promises`):**
    * Aplicado o operador `void` em chamadas `navigate(...)` e callbacks de eventos de clique (`void onClaimTask(...)`, `void onUnclaimTask(...)`, `void onStartWorkspace(...)`).
  * **Qualidade, Linter e Testes Automatizados:**
    * **Backend (`npm run build` / `npx tsc`):** 0 erros de compilação.
    * **Backend (`npm test`):** 100% das 18 suítes e 63 testes unitários/integração aprovados.
    * **Frontend (`npx tsc -b` & `npm run lint`):** 0 erros de compilação ou linter.

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
