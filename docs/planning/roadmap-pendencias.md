# 🗺️ Master Roadmap & Checklist de Tarefas Pendentes

**Projeto:** Plataforma Web de Escrita Científica Self-Hosted (`sci-latex-vscode`)  
**Data de Consolidação:** 15 de Setembro de 2026  
**Objetivo:** Guia completo e estruturado de todas as pendências (Backend, K8s, Frontend, UX e Arquitetura). Cada tarefa pode ser executada e marcada como concluída `[x]` individualmente.

---

## 🟢 Bloco 1: Estabilização do Backend, Infraestrutura K8s & Customização Zen Mode

- [x] **1.1 Atualização de Status `TERMINATED`/`DELETED` na Tabela `Workspace`**
  - *Descrição*: No `events.manager.ts` e no `k8s-pod-manager.service.ts`, garantido que ao encerrar ou destruir um Pod por timeout/deleção, o repositório `IWorkspacesRepository` atualiza o status no banco de dados para `TERMINATED` e limpa o `podName`.
- [x] **1.2 Redirecionamento Sincronizado do Workspace**
  - *Descrição*: Endpoint/controller `/api/v1/editor-proxy/app` registra `PROVISIONING` quando o Pod está subindo e `READY` apenas quando HTTP 200 no proxy reverso é confirmado, com tela de transição e auto-reload automático.
- [x] **1.3 Fonte Única de Verdade de Configuração do VS Code (`settings.json`)**
  - *Descrição*: Centralização de 100% das configurações do editor em `docker/code-server/settings.json` (auto-build do TeX ao salvar, tema escuro, telemetria desativada), eliminando duplicidade de arquivos `.vscode/settings.json` na workspace.
- [x] **1.4 Limpeza e `.gitignore` Estrito de Arquivos Temporários TeX**
  - *Descrição*: Cópia automática de um `.gitignore` padrão na inicialização do repositório TeX ignorando `*.aux`, `*.log`, `*.out`, `*.toc`, `*.fls`, `*.fdb_latexmk`, evitando commits de arquivos gerados temporariamente no GitHub.
- [x] **1.5 Ambiente de Edição Zen Mode Distraction-Free**
  - *Descrição*: Remoção das extensões de IA/Copilot no Dockerfile do `code-server`, remoção de atalhos de terminal no `keybindings.json` e ocultação de barras/menus (`workbench.activityBar.location: "hidden"`, `statusBar`, `menuBar`, `panel`) e ocultação de arquivos auxiliares TeX no `files.exclude`.

---

## 🔵 Bloco 2: Regras de Negócio de Tarefas & Fluxo de Revisão (ADR-003)

- [x] **2.1 Habilitação de Botões Guiada por Estado de Domínio (Substituição de Dirty Checks)**
  - *Descrição*: Substituída a sondagem de dirty state no sistema de arquivos por habilitação reativa baseada exclusivamente nos status de negócio do Pull Request (`DRAFT`, `UNDER_REVIEW`, `APPROVED`, `MERGED`). Remoção de código morto do endpoint `/git-status`.
- [x] **2.2 Suporte Nativo ao Git no Workspace do Pod**
  - *Descrição*: Preservação da pasta `.git` na workspace do usuário (`users/:userId`), permitindo calhas de diff e comparador side-by-side nativos do VS Code. Adicionadas configurações `git config core.fileMode false` e `safe.directory "*"` no container para eliminar alertas de permissão.
- [x] **2.3 Validação Estrita do Fluxo "Enviar para Revisão"**
  - *Descrição*: Transição controlada para `UNDER_REVIEW` no `PullRequestsService`, bloqueando envios em estados inválidos e emitindo notificação SSE (`PR_OPENED`).
- [x] **2.4 Pod e Workspace Isolados para o Revisor**
  - *Descrição*: Garantido que o Revisor receba um Pod e subdiretório isolados (`users/${reviewerId}`) via `claimPodForProject` e `ensureGitRepositoryWorkspace`, mantendo a pasta do Autor 100% intacta.
- [x] **2.5 Bloqueio Visual e Badge "Em Revisão"**
  - *Descrição*: A transição de status para `UNDER_REVIEW` é exposta em tempo real e bloqueia rascunhos até a conclusão do parecer.
- [x] **2.6 Destruição de Pod K8s e Limpeza do PVC após o Merge de Sucesso**
  - *Descrição*: Após a conclusão do merge no `PullRequestsService` (`mergePR`), o backend aciona `releasePodForProject` e `cleanProjectPVC` no `K8sPodManagerService`, encerrando o Pod isolado do usuário, removendo o PVC temporário e definindo o status da tabela `Workspace` no banco como `TERMINATED`.

---

## 🟣 Bloco 3: Desenvolvimento do Frontend ReactJS (Sprints 1 a 4)

### 🎨 3.1 Setup Base, Design System & Auth (Sprint 1 Frontend)
- [x] Criar projeto ReactJS + TypeScript + Vite com Redux Toolkit e TanStack Query.
- [x] Implementar Design System Base (`index.css`) com suporte a Dark Mode, botões, modais, cards e badges.
- [x] Implementar página de Login com autenticação JWT e hook `useSSEEventSource` para escutar notificações SSE.

### ✍️ 3.2 Dashboard do Autor, Onboarding "Spinning Up" & Iframe (Sprint 2 Frontend)
- [x] Criar Dashboard do Autor ("Minhas Tarefas") listando os cards de trabalho por projeto.
- [x] Criar tela de transição *Spinning Up Stepper* (exibindo passo-a-passo a prontidão do Pod no K8s antes de abrir o editor).
- [x] Criar componente `<CodeServerIframe />` integrado ao proxy Fastify `/api/v1/editor-proxy/app`.
- [x] Implementar Topbar do Workspace com botões *Salvar Progresso*, *Enviar p/ Revisão* e contador do prazo da tarefa.

### 🔍 3.3 Dashboard do Revisor, Diff Side-by-Side & Registro NIT (Sprint 3 Frontend)
- [x] Criar Dashboard do Revisor listando tarefas e PRs pendentes de avaliação.
- [x] Criar visualizador de Comparação Side-by-Side (Diff LaTeX + PDF Viewer embutido).
- [x] Criar Drawer de Comentários por linha e painel de **Registro do Parecer / NIT** (`APPROVED`, `CHANGES_REQUESTED`).
- [x] **3.3.4 Visão de Revisão entre Pares para Autores (`PEER_REVIEW`)**
  - *Descrição*: Habilitar a tela de revisão (`/reviews`) para co-autores com papel `AUTHOR` avaliarem Pull Requests de seus pares atribuídos no modal com tipo `PEER_REVIEW`, reutilizando a interface side-by-side e o painel de apontamentos.

### 📊 3.4 Dashboards do Coordenador, Gerente & Pós-Submissão (Sprint 4 Frontend)
- [x] Criar Dashboard do Coordenador (Matriz de prazos das seções da equipe com badges coloridos 🟢/🟡/🔴).
- [x] Criar Dashboard do Gerente com filtro por Período Acadêmico e métricas globais da organização.
- [x] Criar modais pós-submissão para cadastro de DOI, links camera-ready e seleção de submissão backup / v2.

### 🏗️ 3.5 Camada Centralizada de Serviços e Padronização de Tipos & Constantes
- [x] **Centralização dos Serviços HTTP em `src/services/`**:
  - Encapsulamento completo de chamadas REST (`projectsService`, `managementService`, `tasksService`, `releasesService`, `articlesService`) separando requisições HTTP dos hooks do React Query (`useProjectQueries`, `useManagementQueries`, `useReviewQueries`).
- [x] **Padronização de Constantes de Status & Roles em `src/constants/`**:
  - `status.ts`: Definição centralizada de `TaskStatus`, `DeadlineStatus`, `PRStatus`, `NITStatus`, `ReleaseStatus`.
  - `roles.ts`: Definição de `Role`, `ROLE_LABELS` e `SYSTEM_ROLES` garantindo conformidade com a biblioteca e eliminação de strings hardcoded.
- [x] **Qualidade e Estilo de Código**:
  - Ausência total de `React.FC` e arquivos de re-exportação barril (`index.ts`).
  - Utilização de `as const` compatível com `erasableSyntaxOnly` (sem `enum`s do TypeScript).
  - 0 avisos no ESLint e 0 erros no TypeScript (`npx tsc --noEmit`).

---

## 🟠 Bloco 4: Painel Admin em Tempo Real (Live Dashboard via SSE)

- [ ] **4.1 Canal SSE de Administração (`/api/v1/admin/events`)**
  - *Descrição*: Criar endpoint SSE exclusivo para administradores transmitindo status de conexões ativas, Pods K8s e rascunhos em tempo real.
- [ ] **4.2 Tela de Administração de Sessões Ativas**
  - *Descrição*: Criar tela no frontend exibindo tabela de usuários online, Pods em uso (warm vs active), tempo de sessão e botões para recarregar ou derrubar sessões inativas.

---

## 🟡 Bloco 5: Evolução Futura de Infraestrutura (Parecer Técnico)

- [ ] **5.1 Hibernação de Pods com Retenção de PVC**
  - *Descrição*: Implementar rotina de hibernação que destrói o Pod em caso de inatividade longa mantendo o volume (PVC) pronto para reativação.
- [ ] **5.2 Suporte a Conexão Remota via VS Code Desktop (SSH)**
  - *Descrição*: Expor porta SSH segura para pesquisadores avançados se conectarem via VS Code Desktop nativo.
