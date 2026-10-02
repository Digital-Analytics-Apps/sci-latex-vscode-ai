# Especificação Técnica do Frontend (ReactJS + Redux Toolkit + TanStack Query)

**Projeto:** Plataforma Web de Escrita Científica Self-Hosted  
**Última Atualização:** 2026-09-27  
**Documento de Referência:** [`specs.md`](file:///home/gilson-russo/development/professional/sci-latex-vscode/docs/planning/specs.md)

---

## 1. Estrutura de Arquitetura do Frontend

O frontend é desenvolvido em **ReactJS + TypeScript**, utilizando **Redux Toolkit** para gerenciamento de estado local/UI (iframe, modal, notificações) e **TanStack Query (React Query)** para consumo e cache de APIs REST. Notificações e atualizações em tempo real usam **SSE (Server-Sent Events)** via API nativa `EventSource`.

```
src/
├── assets/                 # Logotipos, ícones e fontes
├── components/             # Componentes genéricos e reutilizáveis de UI
│   └── common/             # GenericDataGrid (AutoSizer), dataGridColumns, StatusChips (PR/NIT/Deadline), Selectors e Cards
├── constants/              # Fontes únicas da verdade para tipos/enumerações (status.ts, roles.ts)
├── features/               # Módulos Funcionais e Telas por Domínio
│   ├── auth/               # Página de Login e componente de Proteção de Rota (RBAC)
│   ├── dashboard/          # Dashboard principal unificado com navegação por persona e seletor de projetos
│   ├── workspace/          # Workspace do Autor: Iframe code-server + Topbar de Ações + Status de Prazo + Modais
│   ├── reviewer/           # Dashboard do Revisor (ReviewDataGridCells) + Comparador Side-by-Side (Diff LaTeX + PDF Viewer) + Modal NIT
│   ├── coordinator/        # Dashboard do Coordenador: Matriz de Prazos da Equipe + Gestão de Cronograma
│   ├── manager/            # Dashboard do Gerente: Filtro de Período Acadêmico + Métricas Globais
│   └── post-submission/    # Modais Pós-Submissão: DOI/Links Camera-Ready & Seleção v2 (Backup/Novo Congresso)
├── hooks/                  # Hooks customizados (useAuth, useUrlFilters, useSSEEventSource, useProjectQueries, useManagementQueries)
├── layouts/                # Layouts principais (DashboardLayout, WorkspaceLayout, AuthLayout, RoleLayoutResolver)
├── routes/                 # Definição de rotas do React Router DOM
├── services/               # Serviços REST centralizados (api, projectsService, managementService, tasksService, releasesService, articlesService)
├── store/                  # Redux Store Toolkit (slices: auth, ui, workspace, notifications)
├── utils/                  # Utilitários puros (urlParamsUtils, dateUtils, memberUtils)
└── styles/                 # Estilos globais (Vanilla CSS / Design System Tokens)
```

---

## 2. Estrutura de Roteamento & Visões por Persona (RBAC Router)

| Rota | Permissão Exigida | Descrição da Tela |
| :--- | :--- | :--- |
| `/login` | Pública | Tela de Login com autenticação JWT. |
| `/workspace/:projectId/task/:taskId` | `AUTHOR` | Workspace de escrita: Iframe do `code-server` + Botões "Salvar Progresso" / "Enviar p/ Revisão" / "Realizar Merge". |
| `/reviews` | `REVIEWER`, `COORDINATOR`, `AUTHOR` | Dashboard de PRs pendentes para avaliação acadêmica (inclui modal `PEER_REVIEW`). |
| `/reviews/:prId` | `REVIEWER`, `COORDINATOR`, `AUTHOR` | Tela de avaliação lado a lado: Diff LaTeX + PDF compilado + Painel de Registro Manual do NIT. |
| `/coordinator` | `COORDINATOR`, `MANAGER` | Dashboard da Equipe: Tabela de papers, seções e prazos com indicadores coloridos (🟢/🟡/🔴). |
| `/manager` | `MANAGER`, `ADMIN` | Dashboard executivo com filtro por **Período Acadêmico** (ex: *Ciclo 2026/2027*) e relatórios globais. |

---

## 3. Integração em Tempo Real via Server-Sent Events (SSE) & Heartbeat via Web Worker

### Hook `useSSEEventSource`
Notificações enviadas pelo servidor (conclusão de PDF, aprovação do NIT, liberação do botão de Merge) são escutadas nativamente via `EventSource`. Além disso, o hook gerencia o batimento cardíaco (Heartbeat) da workspace ativa:

1. **Batimento Resiliente via Web Worker (Blob inline)**:
   - Para contornar o estrangulamento/suspensão de timers (`setInterval`) imposto por navegadores quando a aba perde o foco, o hook instancia um **Blob Web Worker** executando em uma thread separada.
   - O worker dispara requisições HTTP `POST /api/v1/events/heartbeat` a cada 20 segundos fornecendo a tríade `{ projectId, userId, taskId }`.
   - Como o Web Worker roda em thread própria, o heartbeat continua ativo sem interrupções mesmo quando o usuário navega para outras abas.

2. **Reativação por Foco na Janela (`visibilitychange`)**:
   - Escuta eventos `visibilitychange` no objeto `document`. Ao recuperar o foco (`visibilityState === 'visible'`), dispara imediatamente um heartbeat síncrono no backend para garantir renovação imediata do TTL no Redis.

---

## 4. Integração com o Editor VS Code (`code-server`) em Iframe

### 4.1 Proxy & Carregamento Seguro
* O componente `<CodeServerIframe />` renderiza um `<iframe>` apontando para o proxy do Fastify:
  `src="/api/v1/editor-proxy/:projectId?token=<JWT>"`
* O proxy Fastify valida o JWT do usuário e redireciona a stream da sessão do `code-server` com o ambiente customizado Zen Mode.
* **Habilitação de Botões por Estado de Domínio:** A Topbar do Workspace habilita e bloqueia ações com base única e exclusivamente no estado de negócio do Pull Request (`activePR.status`):
  - *Salvar Progresso*: Ativo quando `status` for `DRAFT` ou `CHANGES_REQUESTED`.
  - *Enviar p/ Revisão*: Ativo quando houver rascunho salvo e transiciona para `UNDER_REVIEW`.
  - *Realizar Merge*: Ativo quando o PR estiver aprovado (`APPROVED`).
  - *Sondagem de Dirty State Desativada*: O frontend não faz polling em rotas de sistema de arquivos local (`/git-status`), garantindo performance e ausência de falsos bloqueios.

### 4.2 Modal "Salvar Progresso" & Tradução de Diffs Acadêmicos (`SaveProgressModal.tsx`)
* **Consumo de API (`useQuery`)**: Ao abrir o modal, o frontend consome a rota `GET /api/v1/projects/:id/tasks/:taskId/diff-summary`.
* **Visualização Acadêmica Traduzida**: Exibe lista formatada de arquivos alterados organizados por rótulos amigáveis de domínio ("Seção Introdução", "Referências Bibliográficas", "Figuras e Ilustrações", "Estrutura Principal do Artigo", etc.).
* **Linha do Tempo Contextual**: Exibe o cabeçalho temporal dinâmico: *"Desde o último salvamento em [data/hora] por [autor]"* (ou *"Nenhum salvamento anterior nesta tarefa"* no primeiro checkpoint).
* **Campo de Descrição Opcional**: Fornece um campo de texto opcional para o escritor descrever a evolução. Se deixado em branco, utiliza a descrição sintetizada pelo backend sem falhas de estado no React (sem chamadas síncronas de `setState` em efeitos).
* **Informativo de Alterações Fora de Escopo**: Apresenta banner informativo factual quando `hasChangesInOtherFiles` for `true`, mantendo o botão "Salvar Progresso" 100% ativo e desobstruído.

### 4.3 Indicadores de Ocupação & Trava Visual no Card de Tarefas
* **Consumo de Presença**: Ao consultar a lista de tarefas do artigo (`useTasksQuery`), o frontend recebe os metadados de presença ativa `isOccupied: boolean` e `occupiedBy: { id, name }`.
* **Badge de Ocupação**: Se a tarefa possuir uma sessão ativa com outro usuário, exibe a badge informativa `🔒 Ocupada por [Nome]`.
* **Bloqueio do Botão de Workspace**: Se a tarefa estiver ocupada por outro usuário (`occupiedBy.id !== currentUser.id`), o botão de acionamento do workspace é desativado exibindo o rótulo `🔒 Em uso por [Nome]`, prevenindo concorrência na mesma branch Git.

---

## 5. Backlog de Tarefas do Frontend (Divisão de Tarefas)

### 🎨 Sprint 1: Design System, Layouts, Auth & SSE Hook
- [x] Configurar projeto ReactJS + TypeScript + Vite.
- [x] Criar Design System base (`index.css`) com suporte a Dark Mode, cores HSL, botões, modais, badges e cards.
- [x] Implementar Redux Store + Slices (`authSlice`, `uiSlice`, `notificationSlice`).
- [x] Criar hook `useSSEEventSource` consumindo o stream `/api/v1/events/stream`.
- [x] Criar página de Login e componente de Rota Protegida com base nas *Roles*.

### ✍️ Sprint 2: Workspace do Autor & Iframe VS Code
- [x] Criar layout do Workspace do Autor (Topbar + Sidebar de Seções + Central Iframe).
- [x] Implementar componente `<CodeServerIframe />` integrado ao proxy Fastify.
- [x] Implementar botão "Salvar Progresso" (dispara mutação React Query para a API do Fastify).
- [x] Implementar botão "Enviar para Revisão" (Abre modal de abertura de PR com seletor de revisor e tipo `PEER_REVIEW` ou `FULL_REVIEW`).

### 🔍 Sprint 3: Dashboard de Revisão, Diff & Registro NIT
- [x] Criar Dashboard do Revisor (Cards de PRs pendentes).
- [x] Criar visualizador de Comparação Side-by-Side (Diff LaTeX no lado esquerdo + PDF Viewer no lado direito).
- [x] Criar painel de **Registro Manual do NIT** (Badge de status + Formulário de Input do parecer `APPROVED_NIT` / `REJECTED_NIT`).
- [x] Implementar estado destravado do botão **"Realizar Merge / Concluir Entrega"** no painel do Autor (com redirecionamento automático para `/` e bloqueio de "Salvar Progresso" pós-aprovação/merge).
- [x] **Visão de Tarefas Concluídas no Dashboard**: Exibição da badge `Concluída (Merged)` com botão de workspace desabilitado e rotulado como `Tarefa Concluída`.

### 📊 Sprint 4: Dashboards do Coordenador, Gerente & Pós-Submissão
- [x] Criar Dashboard do Coordenador (Tabela de prazos das seções da equipe com indicadores 🟢/🟡/🔴 e modal de alteração de datas).
- [x] Criar Dashboard do Gerente (Dropdown de filtro de **Período Acadêmico** e gráficos/cards de métricas da equipe).
- [x] Criar modais pós-submissão (Cadastro de DOI/Links e Modal de Decisão dos Autores pós-rejeição).

### 🏗️ Sprint 5: Refatoração da Camada de Serviços, Tipagem & Arquitetura
- [x] **Camada de Serviços HTTP (`src/services/`)**: Centralização de `projectsService`, `managementService`, `tasksService`, `releasesService` e `articlesService`.
- [x] **Constantes Globais (`src/constants/`)**: `status.ts` e `roles.ts` estruturados com `as const` (compatível com `erasableSyntaxOnly`).
- [x] **Regras de Qualidade**: 0 warnings no ESLint e 0 erros no TypeScript. Componentes funcionais sem `React.FC` ou exportações barril (`index.ts`).
- [x] **MUI DataGrid & Paginação Nativa (`@mui/x-data-grid`)**: Migração de tabelas legadas para `<DataGrid />` com internacionalização em Português (`ptBR`), paginação embutida (5, 10, 25 linhas) e integração com painéis de filtros externos.

### 6.2 Hook Reutilizável de Métricas de KPI do Dashboard (`useDashboardSummaryQuery`)
* **Localização:** `src/hooks/useDashboardQueries.ts`
* **Descrição:** Consome o endpoint único cirúrgico `GET /api/v1/dashboard/summary` e fornece métricas agregadas do banco de dados (Prisma) adaptadas dinamicamente à Role extraída do token JWT do usuário autenticado.
* **Comportamento Anti-Piscadas:** Configurado com `placeholderData: keepPreviousData` para manter as métricas visíveis durante a transição de filtros de projetos ou equipes.
* **Retorno:** `{ role: string, metrics: Record<string, any> }`

---

## 6. Padronização de Tabelas com MUI DataGrid (`@mui/x-data-grid`)

### 6.1 Diretrizes de Implementação
* **Zero Contaminação de Filtros Internos**: O DataGrid recebe o conjunto de dados filtrados (`rows`) diretamente de seletores e inputs externos (`searchQuery`, `selectedProjectId`, `selectedPRStatus`, etc.), mantendo os filtros externos superiores.
* **Paginação Nativa**: Todas as instâncias utilizam a prop `pageSizeOptions={[5, 10, 25]}` com modelo inicial configurado em `initialState.pagination.paginationModel`.
* **Internacionalização**: Importação nativa de `ptBR` do pacote `@mui/x-data-grid` para textos de controle de página e rodapés em Português.
* **Renderização Customizada de Células (`renderCell`)**: Utilização de renderizadores fortemente tipados via `GridColDef[]` para exibição de Avatares, Chips de status (`PRStatus`, `NITStatus`), badges de branch e botões de ação contextuais.

### 6.2 Helpers de Definição de Colunas DataGrid (`src/components/common/dataGridColumns.tsx`)
Para evitar código redundante e garantir coerência visual em toda a aplicação, a definição de colunas deve utilizar os helpers de fábrica exportados por `dataGridColumns.tsx`:
* **`createBoldColumn(config)`**: Constrói colunas com tipografia em negrito (`fontWeight: 700`), ideal para Nomes de Equipes, Projetos ou Títulos de Artigos.
* **`createChipColumn(config, getChipProps)`**: Constrói colunas estilizadas com o componente `<Chip size="small" />` (para Status da Submissão, Papéis de Usuário, Badges de Contagem).
* **`createDateColumn(config)`**: Constrói colunas com formatação automática de datas para o padrão Português (`pt-BR`).

### 6.3 DataGrid de Tarefas do Autor (`<AuthorTasksTable />`)
* **Localização:** `src/features/workspace/components/AuthorTasksTable.tsx` & `src/features/workspace/components/TaskDataGridCells.tsx`
* **Descrição:** Tabela padronizada para a visão do Autor com `<GenericDataGrid<TaskItem>>` e `<AutoSizer>`.
* **Filtros com Debounce & REST API:** Integração direta com `useUrlFilters` e `useDebounce` (400ms), repassando parâmetros filtrados (`search`, `status`) para a API REST sem realizar filtragem em memória no cliente.
* **Células Especializadas:**
  - `TaskTitleBranchCell`: Título em destaque e tag com a branch Git (`code`).
  - `TaskAssigneeCell`: Nome e avatar do responsável pela tarefa ou indicação `⚠️ Sem Responsável`.
  - `TaskDueDateCell`: Prazo formatado em data pt-BR.
  - `TaskStatusChip`: Status visual utilizando helper `getTaskStatusConfig` (cor MUI e rótulo) e indicador de bloqueio por outro autor (`🔒`).
  - `TaskActionCell`: Botões de governança **"✍️ Assinar"** (atribui a tarefa ao usuário logado) e **"🔓 Desassinar"** (libera a tarefa), além do botão "🚀 Iniciar Workspace" / "🔒 Em uso por X".
  - **Estado Inicial Vazio:** Ao criar um novo artigo, as Etapas de Escrita são instanciadas como estruturas, e a tabela/seções iniciam **vazias de tarefas**. O Autor adiciona sub-tarefas vinculadas às etapas conforme a necessidade.
  - **Gestão Dinâmica de Etapas (Features):** Modais e ações para criar, editar, reordenar e remover etapas de escrita customizadas.
  - **Restrição do Modal de PR:** O modal de solicitação de revisão (`CreatePRModal`) permite selecionar apenas a **Feature Branch** da Etapa (`feature/<stage-slug>` $\rightarrow$ `dev`) para revisão entre pares ou revisor principal. Sub-tarefas são integradas diretamente pelo autor na Feature Branch sem exigir PR formal.

### 6.5 Régua de Etapas & Linha do Tempo Compacta (`<ArticleTimelineHeader />`)
* **Localização:** `src/components/common/ArticleTimelineHeader.tsx`
* **Descrição:** Componente de governança das etapas de escrita e gatekeepers do artigo.
* **Redesign Enxuto de 1 Linha (Stepper Ribbon)**:
  - Substitui cards empilhados por uma fita horizontal compacta de nós conectados.
  - **Semântica Visual dos Nós**: `✓` Concluída (Verde Emerald), `●` Em Andamento (Azul Cyan Glow), `○` Pendente (Slate), `🔒` Gatekeeper Bloqueado (Amber/Slate), `⚑` Gatekeeper Liberado.
* **Padrão Master-Detail (Painel de Etapa Selecionada)**:
  - Clique em qualquer nó da régua seleciona a etapa (`selectedStageId`).
  - Painel de detalhes compacto renderizado diretamente abaixo (~100px) com progresso real baseado no percentual de tarefas concluídas vinculadas àquela etapa.
* **Modos Dual (`[ ░ Fluxo ]` vs `[ 📊 Timeline ]`)**:
  - **Modo Fluxo**: Focado na ordem sequencial, D&D com `@dnd-kit` e avanço dos gatekeepers (NIT e Congresso).
  - **Modo Timeline**: Gantt temporal horizontal relativo por prazos de entrega com indicador `▲ Hoje`.

### 6.6 Modal de Configurações do Projeto & Governança (`<ProjectSettingsModal />`)
* **Localização:** `src/features/workspace/ProjectSettingsModal.tsx`
* **Descrição:** Encapsula todo o gerenciamento de etapas de escrita e metadados do artigo em uma caixa de diálogo dedicada, mantendo a tela principal limpa e desobstruída.
* **Abas do Modal**:
  - **Aba 1 (Etapas de Escrita & Drag & Drop)**: Permite reordenar a sequência de etapas customizadas via drag and drop (`@dnd-kit`), alterar status, excluir etapas sem tarefas e acionar a criação de novas etapas (`+ Nova Etapa`).
  - **Aba 2 (Metadados & Congresso)**: Formulário para atualização do título do artigo, resumo executivo, nome da conferência-alvo e data prevista de submissão via `projectsService.updateProject`.

---

### 6.4 Especificação Obrigatória do Padrão DataGrid com Filtros de URL (`DataGrid URL-Filter Pattern`)

Todas as tabelas de listagem da plataforma que possuam filtros (busca textual, seletores de status, filtros por projeto) **DEVEM** seguir rigorosamente a especificação abaixo para garantir consistência visual, comportamento anti-piscadas e compartilhamento de links:

1. **Sincronização de Filtros via URL (`useUrlFilters`):**
   - Todos os parâmetros de filtro devem ser mantidos na Query String da URL utilizando o hook [`useUrlFilters`](file:///home/gilson-russo/development/professional/sci-latex-vscode/frontend/src/hooks/useUrlFilters.ts).
   - O objeto `apiParams` gerado por `useUrlFilters` deve ser passado diretamente para o hook TanStack Query (ex: `useTasksQuery(projectId, apiParams)`).

2. **Prevenção de Piscadas na Tela & Indicador de Re-busca (Zero-Flicker UX):**
   - O hook TanStack Query correspondente **DEVE** declarar `placeholderData: keepPreviousData` e desestruturar `isFetching`.
   - A prop `loading` da tabela DataGrid **DEVE** ser configurada como `loading={isLoading || isFetching}` para acionar a barra de progresso visual da MUI DataGrid enquanto novas requisições de filtro ocorrem em segundo plano.

3. **Busca Textual com Debounce (400ms) & React 19 Render Sync:**
   - O input de busca deve manter um estado local (`searchTerm`) que é atualizado instantaneamente ao digitar.
   - O hook `useDebounce(searchTerm, 400)` dispara a atualização dos filtros na URL (`setFilters({ search: debouncedSearch })`).
   - Para evitar avisos de *cascading render* no React 19, a sincronização entre a URL e o estado local deve ser feita durante a fase de render usando o padrão de comparação prévia (`prevUrlSearch`):
     ```tsx
     if (prevUrlSearch !== filters.search) {
       setPrevUrlSearch(filters.search);
       setSearchTerm(filters.search);
     }
     ```

4. **Botão "Limpar Filtros":**
   - Quando qualquer filtro estiver ativo (diferente do padrão), um botão "Limpar Filtros" deve ser exibido, disparando `resetFilters()` e limpando os estados locais de busca.

5. **Responsividade com `<AutoSizer>`:**
   - O container da tabela deve utilizar `<AutoSizer renderProp={({ height, width }) => <GenericDataGrid ... />}>` para ajuste fluido ao tamanho do viewport.

---

### 6.5 Arquitetura Orientada a Personas & Eliminação de Pasta Genérica (`Persona Feature-Driven Architecture`)

A aplicação adota uma organização estritamente modular por **Feature/Persona** em `src/features/`, eliminando pastas de dashboard acopladas:

1. **`src/features/author/` (Persona Autor):**
   - **`AuthorArticlesPage.tsx`**: Tabela DataGrid de Artigos Científicos (`/` e `/articles`).
   - **`ArticleDetailPage.tsx`**: Painel Interno do Artigo Selecionado com régua Stepper/Timeline (`ArticleTimelineHeader`), lista de membros e `<AuthorTasksTable />` (`/articles/:projectId`).
2. **`src/features/reviewer/` (Persona Revisor):**
   - **`ReviewsListPage.tsx`**: Fila de solicitações de revisão (`/reviews`).
   - **`ReviewDetailPage.tsx`**: Leitor comparativo de Diffs TeX e visualizador PDF (`/reviews/:prId`).
3. **`src/features/manager/` (Persona Gerente):**
   - **`ManagerDashboardPage.tsx`**: Visão executiva de metas, cotas por time e gargalos (`/manager`).
4. **`src/features/coordinator/` (Persona Coordenador):**
   - **`CoordinatorDashboardPage.tsx`**: Matriz de prazos e atribuições da equipe de pesquisa (`/coordinator`).
5. **Componentes Compartilhados (`src/components/common/`):**
   - Todos os componentes genéricos ou compartilhados entre personas (ex: `ManagementDashboard.tsx`, `GenericDataGrid.tsx`, `dataGridColumns.tsx`, `StatusChips.tsx`) residem exclusivamente em `src/components/common/`.
6. **Roteamento & Resolvedores de Layout (`src/layouts/RoleLayoutResolver.tsx` & `src/routes/`):**
   - O roteador principal em `src/routes/index.tsx` utiliza o `<RoleLayoutResolver />` para envolver as rotas da persona logada no seu layout correspondente (`AuthorLayout`, `ManagerLayout`, `CoordinatorLayout`, `ReviewerLayout`), dispensando containers/dashboard intermedios.

---

### 6.6 Componentes de Timeline de Etapas Paralelas & Indicador Visual de Gatekeepers

1. **Régua de Timeline Paralela (`<ArticleTimelineHeader />`):**
   - Exibe visualmente as etapas de escrita de conteúdo rodando em paralelo, indicando a porcentagem de conclusão de cada uma baseada no progresso das tarefas agrupadas (`stageId`).
   - **Reordenação Drag & Drop (`@dnd-kit/core` + `@dnd-kit/sortable`):** Permite que autores reordenem as etapas de escrita dinamicamente arrastando os cards via alça de arrasto (`DragIndicatorIcon`).
   - **Trava dos Gatekeepers (NIT e Congresso):** As duas últimas etapas de gatekeeper (NIT e Congresso Alvo) permanecem **fixas no final da timeline** e não podem ser reordenadas nem arrastadas para trás de etapas de escrita.
   - **Restrição de Exclusão:** Etapas de escrita só podem ser excluídas se não houver nenhuma tarefa vinculada a elas (`tasks.length === 0`).
   - **Modal de Criação de Etapa (`CreateStageModal.tsx`):** Permite aos autores adicionar novas etapas de escrita de conteúdo antes das etapas fixas de gatekeeper.

---

### 6.7 Padronização Visual Obrigatória de Cards e Tabelas DataGrid por Persona (`Persona DataGrid & Card Design Standard`)

Em conformidade com as regras de UI/UX da plataforma, **100% das telas de listagem e acompanhamento das personas DEVEM seguir rigorosamente o Padrão de Cards e Tabelas DataGrid com Filtros via URL** ([`Seção 6.4`](#64-especificação-obrigatória-do-padrão-datagrid-com-filtros-de-url-datagrid-url-filter-pattern)):

1. **Visão do Gerente (`Role.MANAGER`):**
   - **Cards de Métricas:** `<Card variant="outlined">` para Meta Global do Ciclo, Cotas Totais e Pareceres NIT.
   - **Tabela DataGrid de Cotas por Time (`<ManagerTeamsDataGrid />`):** Envelopada em `<AutoSizer>` + `useUrlFilters`, listando os times sob gestão, cotas atribuídas, artigos produzidos e a badge visual 🚀 `Over-achievement`.
   - **Tabela DataGrid de Gargalos (`<ManagerBottlenecksDataGrid />`):** Envelopada em `<AutoSizer>` + `useUrlFilters`, listando artigos retidos em etapas específicas.

2. **Visão do Coordenador (`Role.COORDINATOR`):**
   - **Cards de Métricas:** Resumo dos times coordenados.
   - **Tabela DataGrid de Artigos do Time (`<CoordinatorArticlesDataGrid />`):** Envelopada em `<AutoSizer>` + `useUrlFilters`, listando os artigos do time, etapas ativas, status de prazo (🟢/🟡/🔴) e indicação de trava dos Gatekeepers (`🔒 LOCKED`).

3. **Visão do Revisor (`Role.REVIEWER`):**
   - **Tabela DataGrid da Fila de Revisões (`<ReviewerQueueDataGrid />`):** Envelopada em `<AutoSizer>` + `useUrlFilters`, listando os PRs pendentes de parecer (`UNDER_REVIEW`), autor, branch e ação `"🔍 Avaliar Diff"`.

4. **Visão do Autor (`Role.AUTHOR`):**
   - **Nível 1:** Tabela DataGrid de Meus Artigos Científicos (`<GenericDataGrid<ArticleItem>>`) em `src/features/author/AuthorArticlesPage.tsx` envelopada em `<AutoSizer>` com busca textual e filtro por papel.
   - **Nível 2:** Painel do Artigo + Tabela DataGrid de Tarefas em `src/features/author/ArticleDetailPage.tsx` utilizando `<GenericDataGrid>`, `<AutoSizer>`, `useUrlFilters` e botões relacionais de workspace.

---

### 6.8 Utilitários e Helpers de Fábrica para Colunas de DataGrid (`src/components/common/dataGridColumns.tsx`)

Para garantir reutilização de código, padronização visual e legibilidade declarativa das colunas em DataGrids de todas as personas, o módulo `dataGridColumns.tsx` fornece funções de fábrica tipadas:

- **`createTitleSubtitleColumn`**: Renderiza título principal em destaque (`subtitle2`), subtítulo em tom suave (`caption`) e ícone contextual/emoji opcional (ex: ícones de tarefas ou artigos).
- **`createProgressColumn`**: Renderiza barra de progresso linear (`LinearProgress`) com rótulo descritivo e percentual numérico formatado (`X%`).
- **`createChipColumn`**: Renderiza Chips estilizados (`Chip`) para status e papéis com suporte a variantes (`filled`/`outlined`) e esquema de cores temáticas (`primary`, `secondary`, `success`, `info`).
- **`createAvatarStackColumn`**: Renderiza uma pilha sobreposta de Avatares (`Avatar`) com Tooltips contendo nome e papel dos membros da equipe ou autores.
- **`createActionsColumn`**: Suporta a passagem de uma função de renderização JSX ou um array flexível de definições de ação (`DataGridActionItem[]`), renderizando automaticamente um agrupamento `<Stack>` de botões com controle de visibilidade, desativação, variante e rotas.
- **`createDateColumn` & `createBoldColumn`**: Utilitários para formatação de datas no padrão PT-BR e destaques em negrito.

---

### 6.9 Diretriz Técnica & Skill de Criação de Tabelas (`datagrid-table-standard`)

Todas as tabelas de listagem da plataforma devem aderir estritamente ao padrão estabelecido na skill `datagrid-table-standard`:

1. **Tipagem Estrita e Zero `any`**:
   - É **estritamente proibido** utilizar `any` no mapeamento de dados ou nas funções auxiliares de renderização (ex: `(m: any)`, `(row: any)`).
   - O parâmetro genérico do modelo de dados (`TRow`) deve ser explicitamente fornecido em cada chamada aos utilitários (`createTitleSubtitleColumn<ArticleItem>`, `createAvatarStackColumn<ArticleItem>`).
   - Evitar fallbacks desnecessários (como `|| []` ou `|| "Membro"`) quando a propriedade da interface TypeScript já for garantida como não-nula.

2. **Dimensionamento Responsivo com `<AutoSizer>`**:
   - Toda `<GenericDataGrid>` deve ser envelopada por `<AutoSizer>` dentro de um container com altura definida (`<CardContent sx={{ p: 0, height: 600, width: "100%" }}>`).
   - As dimensões `height` e `width` providas por `<AutoSizer renderProp={({ height, width }) => ... }>` devem ser obrigatoriamente repassadas à grid.

3. **Sincronização de Filtros via URL (`useUrlFilters`)**:
   - Os parâmetros de busca textual, seletores de papel/status e paginação devem obrigatoriamente sincronizar seus estados com a URL, permitindo compartilhamento direto de links filtrados.

4. **Componentes Reutilizáveis de Filtro (`src/components/common/tableFilters.tsx`)**:
   - Toda barra de filtros de tabelas deve utilizar os componentes padronizados: `<TableFilterBar>` (container grid), `<TableSearchInput>` (campo de busca com ícone), `<TableSelectFilter>` (dropdown de seleção por papel/status/ciclo) e `<ClearFiltersButton>` (botão de reset com ícone `<FilterListOffIcon>`).








