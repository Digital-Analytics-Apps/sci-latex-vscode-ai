# Especificação Técnica do Frontend (ReactJS + Redux Toolkit + TanStack Query)

**Projeto:** Plataforma Web de Escrita Científica Self-Hosted  
**Última Atualização:** 2026-09-22  
**Documento de Referência:** [`specs.md`](file:///home/gilson-russo/development/professional/sci-latex-vscode/docs/planning/specs.md)

---

## 1. Estrutura de Arquitetura do Frontend

O frontend é desenvolvido em **ReactJS + TypeScript**, utilizando **Redux Toolkit** para gerenciamento de estado local/UI (iframe, modal, notificações) e **TanStack Query (React Query)** para consumo e cache de APIs REST. Notificações e atualizações em tempo real usam **SSE (Server-Sent Events)** via API nativa `EventSource`.

```
src/
├── assets/                 # Logotipos, ícones e fontes
├── components/             # Componentes genéricos e reutilizáveis de UI (Button, Modal, Badge, Card, Table)
│   └── common/             # Selectors e Cards modularizados (ReviewerSelector, ReviewTypeSelector, ActiveTaskCard)
├── constants/              # Fontes únicas da verdade para tipos/enumerações (status.ts, roles.ts)
├── features/               # Módulos Funcionais e Telas por Domínio
│   ├── auth/               # Página de Login e componente de Proteção de Rota (RBAC)
│   ├── dashboard/          # Dashboard principal unificado com navegação por persona e seletor de projetos
│   ├── workspace/          # Workspace do Autor: Iframe code-server + Topbar de Ações + Status de Prazo + Modais
│   ├── reviewer/           # Dashboard do Revisor + Comparador Side-by-Side (Diff LaTeX + PDF Viewer) + Modal NIT
│   ├── coordinator/        # Dashboard do Coordenador: Matriz de Prazos da Equipe + Gestão de Cronograma
│   ├── manager/            # Dashboard do Gerente: Filtro de Período Acadêmico + Métricas Globais
│   └── post-submission/    # Modais Pós-Submissão: DOI/Links Camera-Ready & Seleção v2 (Backup/Novo Congresso)
├── hooks/                  # Hooks customizados (useAuth, useSSEEventSource, useProjectQueries, useManagementQueries)
├── layouts/                # Layouts principais (DashboardLayout, WorkspaceLayout, AuthLayout, RoleLayoutResolver)
├── routes/                 # Definição de rotas do React Router DOM
├── services/               # Serviços REST centralizados (api, projectsService, managementService, tasksService, releasesService, articlesService)
├── store/                  # Redux Store Toolkit (slices: auth, ui, workspace, notifications)
├── utils/                  # Utilitários puros (memberUtils)
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

## 3. Integração em Tempo Real via Server-Sent Events (SSE)

### Hook `useSSEEventSource`
Notificações enviadas pelo servidor (como conclusão de PDF, aprovação do NIT, liberação do botão de Merge) são escutadas nativamente pelo navegador:

```ts
// src/hooks/useSSEEventSource.ts
export function useSSEEventSource() {
  const dispatch = useDispatch();

  useEffect(() => {
    const eventSource = new EventSource('/api/v1/events/stream', {
      withCredentials: true,
    });

    eventSource.addEventListener('MERGE_UNLOCKED', (event) => {
      const data = JSON.parse(event.data);
      dispatch(showNotification({ message: 'Merge liberado!', type: 'success' }));
    });

    return () => eventSource.close();
  }, []);
}
```

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
