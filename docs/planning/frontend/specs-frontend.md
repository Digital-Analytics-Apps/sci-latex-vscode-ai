# Especificação Técnica do Frontend (ReactJS + Redux Toolkit + TanStack Query)

**Projeto:** Plataforma Web de Escrita Científica Self-Hosted  
**Última Atualização:** 2026-09-05  
**Documento de Referência:** [`specs.md`](file:///home/gilson-russo/development/professional/sci-latex-vscode/docs/planning/specs.md)

---

## 1. Estrutura de Arquitetura do Frontend

O frontend é desenvolvido em **ReactJS + TypeScript**, utilizando **Redux Toolkit** para gerenciamento de estado local/UI (iframe, modal, notificações) e **TanStack Query (React Query)** para consumo e cache de APIs REST. Notificações e atualizações em tempo real usam **SSE (Server-Sent Events)** via API nativa `EventSource`.

```
src/
├── assets/                 # Logotipos, ícones e fontes
├── components/             # Componentes genéricos e reutilizáveis de UI (Button, Modal, Badge, Card, Table)
├── features/               # Módulos Funcionais e Telas por Domínio
│   ├── auth/               # Página de Login e componente de Proteção de Rota (RBAC)
│   ├── workspace/          # Workspace do Autor: Iframe code-server + Topbar de Ações + Status de Prazo
│   ├── reviewer/           # Dashboard do Revisor + Comparador Side-by-Side (Diff LaTeX + PDF Viewer) + Modal NIT
│   ├── coordinator/        # Dashboard do Coordenador: Matriz de Prazos da Equipe + Gestão de Cronograma
│   ├── manager/            # Dashboard do Gerente: Filtro de Período Acadêmico + Métricas Globais
│   └── post-submission/    # Modais Pós-Submissão: DOI/Links Camera-Ready & Seleção v2 (Backup/Novo Congresso)
├── hooks/                  # Hooks customizados (useAuth, useSSEEventSource, useIframeBridge)
├── layouts/                # Layouts principais (DashboardLayout, WorkspaceLayout, AuthLayout)
├── routes/                 # Definição de rotas do React Router DOM
├── services/               # Configuração do Axios/Fetch, SSE Client (/api/v1/events/stream) e API Endpoints
├── store/                  # Redux Store Toolkit (slices: auth, ui, workspace, notifications)
└── styles/                 # Estilos globais (Vanilla CSS / Design System Tokens)
```

---

## 2. Estrutura de Roteamento & Visões por Persona (RBAC Router)

| Rota | Permissão Exigida | Descrição da Tela |
| :--- | :--- | :--- |
| `/login` | Pública | Tela de Login com autenticação JWT. |
| `/workspace/:projectId/section/:sectionId` | `AUTHOR` | Workspace de escrita: Iframe do `code-server` + Botões "Salvar Progresso" / "Enviar p/ Revisão" / "Realizar Merge". |
| `/reviews` | `REVIEWER`, `COORDINATOR` | Dashboard de PRs pendentes para avaliação acadêmica. |
| `/reviews/:prId` | `REVIEWER`, `COORDINATOR` | Tela de avaliação lado a lado: Diff LaTeX + PDF compilado + Painel de Registro Manual do NIT. |
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
* O proxy Fastify valida o JWT do usuário e redireciona a stream da sessão do `code-server` com as `settings.json` minimalistas injetadas.

---

## 5. Backlog de Tarefas do Frontend (Divisão de Tarefas)

### 🎨 Sprint 1: Design System, Layouts, Auth & SSE Hook
- [ ] Configurar projeto ReactJS + TypeScript + Vite.
- [ ] Criar Design System base (`index.css`) com suporte a Dark Mode, cores HSL, botões, modais, badges e cards.
- [ ] Implementar Redux Store + Slices (`authSlice`, `uiSlice`, `notificationSlice`).
- [ ] Criar hook `useSSEEventSource` consumindo o stream `/api/v1/events/stream`.
- [ ] Criar página de Login e componente de Rota Protegida com base nas *Roles*.

### ✍️ Sprint 2: Workspace do Autor & Iframe VS Code
- [ ] Criar layout do Workspace do Autor (Topbar + Sidebar de Seções + Central Iframe).
- [ ] Implementar componente `<CodeServerIframe />` integrado ao proxy Fastify.
- [ ] Implementar botão "Salvar Progresso" (dispara mutação React Query para a API do Fastify).
- [ ] Implementar botão "Enviar para Revisão" (Abre modal de abertura de PR).

### 🔍 Sprint 3: Dashboard de Revisão, Diff & Registro NIT
- [ ] Criar Dashboard do Revisor (Cards de PRs pendentes).
- [ ] Criar visualizador de Comparação Side-by-Side (Diff LaTeX no lado esquerdo + PDF Viewer no lado direito).
- [ ] Criar painel de **Registro Manual do NIT** (Badge de status + Formulário de Input do parecer `APPROVED_NIT` / `REJECTED_NIT`).
- [ ] Implementar estado destravado do botão **"Realizar Merge / Concluir Entrega"** no painel do Autor.

### 📊 Sprint 4: Dashboards do Coordenador, Gerente & Pós-Submissão
- [ ] Criar Dashboard do Coordenador (Tabela de prazos das seções da equipe com indicadores 🟢/🟡/🔴 e modal de alteração de datas).
- [ ] Criar Dashboard do Gerente (Dropdown de filtro de **Período Acadêmico** e gráficos/cards de métricas da equipe).
- [ ] Criar modais pós-submissão (Cadastro de DOI/Links e Modal de Decisão dos Autores pós-rejeição).
