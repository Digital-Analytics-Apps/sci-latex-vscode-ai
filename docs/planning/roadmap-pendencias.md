# 🗺️ Master Roadmap & Checklist de Tarefas Pendentes

**Projeto:** Plataforma Web de Escrita Científica Self-Hosted (`sci-latex-vscode`)  
**Data de Consolidação:** 15 de Setembro de 2026  
**Objetivo:** Guia completo e estruturado de todas as pendências (Backend, K8s, Frontend, UX e Arquitetura). Cada tarefa pode ser executada e marcada como concluída `[x]` individualmente.

---

## 🟢 Bloco 1: Estabilização do Backend & Infraestrutura K8s

- [ ] **1.1 Atualização de Status `TERMINATED`/`DELETED` na Tabela `Workspace`**
  - *Descrição*: No `events.manager.ts` e no `k8s-pod-manager.service.ts`, garantir que ao encerrar ou destruir um Pod por timeout/deleção, o repositório `IWorkspacesRepository` atualize o status no banco de dados para `TERMINATED` ou `DELETED`.
- [ ] **1.2 Redirecionamento Sincronizado do Workspace**
  - *Descrição*: Ajustar o endpoint `/api/v1/editor-proxy/claim` e o controller para só retornar status `READY` quando o Pod do K8s responder com HTTP 200 no proxy reverso, eliminando telas brancas e retries desnecessários no cliente.
- [ ] **1.3 Injeção Automática de `settings.json` no `code-server`**
  - *Descrição*: No provisionamento do Pod, injetar em `/home/coder/.local/share/code-server/User/settings.json` as configurações padrão: auto-build do TeX ao salvar (`latex-workshop.latex.autoBuild.run: "onSave"`), tema escuro e desativação de telemetria.
- [ ] **1.4 Limpeza e `.gitignore` Estrito de Arquivos Temporários TeX**
  - *Descrição*: Garantir a cópia de um `.gitignore` padrão na inicialização do repositório TeX ignorando `*.aux`, `*.log`, `*.out`, `*.toc`, `*.fls`, `*.fdb_latexmk`, evitando commits de arquivos gerados temporariamente no GitHub.

---

## 🔵 Bloco 2: Regras de Negócio de Tarefas & Fluxo de Revisão (ADR-003)

- [ ] **2.1 Checagem de Alterações Pendentes (`hasUncommittedChanges`)**
  - *Descrição*: Implementar método no backend que executa `git status --porcelain` no repositório do projeto/usuário para retornar se há rascunhos não commitados.
- [ ] **2.2 Habilitação Reativa do Botão "Salvar Progresso"**
  - *Descrição*: Habilitar o botão de salvar progresso apenas quando `hasUncommittedChanges === true`.
- [ ] **2.3 Validação Estrita do Fluxo "Enviar para Revisão"**
  - *Descrição*: Se houver arquivos não salvos ao clicar em *Enviar para Revisão*, exibir alerta solicitando o salvamento. Se tudo estiver commitado, transicionar status da Task para `UNDER_REVIEW` e abrir o Pull Request na branch `dev`.
- [ ] **2.4 Pod e Workspace Isolados para o Revisor**
  - *Descrição*: Garantir que o Revisor ao clicar em `[Revisar Tarefa]` receba um Pod e subdiretório isolados (`review/*` ou `users/${reviewerId}`) sem sobrescrever nem concorrer com a pasta de trabalho ativa do Autor.
- [ ] **2.5 Bloqueio Visual e Badge "Em Revisão"**
  - *Descrição*: Bloquear alterações diretas do Autor na tarefa enquanto a mesma estiver sob análise (`UNDER_REVIEW`).

---

## 🟣 Bloco 3: Desenvolvimento do Frontend ReactJS (Sprints 1 a 4)

### 🎨 3.1 Setup Base, Design System & Auth (Sprint 1 Frontend)
- [ ] Criar projeto ReactJS + TypeScript + Vite com Redux Toolkit e TanStack Query.
- [ ] Implementar Design System Base (`index.css`) com suporte a Dark Mode, botões, modais, cards e badges.
- [ ] Implementar página de Login com autenticação JWT e hook `useSSEEventSource` para escutar notificações SSE.

### ✍️ 3.2 Dashboard do Autor, Onboarding "Spinning Up" & Iframe (Sprint 2 Frontend)
- [ ] Criar Dashboard do Autor ("Minhas Tarefas") listando os cards de trabalho por projeto.
- [ ] Criar tela de transição *Spinning Up Stepper* (exibindo passo-a-passo a prontidão do Pod no K8s antes de abrir o editor).
- [ ] Criar componente `<CodeServerIframe />` integrado ao proxy Fastify `/api/v1/editor-proxy/app`.
- [ ] Implementar Topbar do Workspace com botões *Salvar Progresso*, *Enviar p/ Revisão* e contador do prazo da tarefa.

### 🔍 3.3 Dashboard do Revisor, Diff Side-by-Side & Registro NIT (Sprint 3 Frontend)
- [ ] Criar Dashboard do Revisor listando tarefas e PRs pendentes de avaliação.
- [ ] Criar visualizador de Comparação Side-by-Side (Diff LaTeX + PDF Viewer embutido).
- [ ] Criar Drawer de Comentários por linha e painel de **Registro do Parecer / NIT** (`APPROVED`, `CHANGES_REQUESTED`).

### 📊 3.4 Dashboards do Coordenador, Gerente & Pós-Submissão (Sprint 4 Frontend)
- [ ] Criar Dashboard do Coordenador (Matriz de prazos das seções da equipe com badges coloridos 🟢/🟡/🔴).
- [ ] Criar Dashboard do Gerente com filtro por Período Acadêmico e métricas globais da organização.
- [ ] Criar modais pós-submissão para cadastro de DOI, links camera-ready e seleção de submissão backup / v2.

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
