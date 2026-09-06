# Especificação Técnica do Backend (Fastify + Prisma + RabbitMQ)

**Projeto:** Plataforma Web de Escrita Científica Self-Hosted  
**Última Atualização:** 2026-09-05  
**Documento de Referência:** [`specs.md`](file:///home/gilson-russo/development/professional/sci-latex-vscode/docs/planning/specs.md)

---

## 1. Estrutura de Arquitetura do Backend

O backend é construído em **Node.js + Fastify + TypeScript**, seguindo uma arquitetura modular por domínio (Modular Monolith).

```
src/
├── @types/                 # Definições de tipos globais Fastify e JWT
├── config/                 # Configurações do env (Zod), RabbitMQ, Prisma e Docker
├── db/                     # Instância do Prisma Client e Seeds
├── middlewares/            # Middlewares de Auth JWT, RBAC Guard e Audit Logger
├── queue/                  # Configuração do RabbitMQ, Exchanges e Channels
│   ├── producers/          # Disparadores de mensagens para as filas
│   └── workers/            # Consumidores das filas (Git, Docker TeX, Deadlines)
├── modules/                # Módulos de Domínio
│   ├── auth/               # Autenticação, Login, Refresh Token
│   ├── academic-periods/   # Gestão de Ciclos/Períodos Acadêmicos
│   ├── teams/              # Gestão de Equipes e Coordenadores
│   ├── projects/           # Projetos/Papers, Congressos Alvo/Backup e DOI
│   ├── sections/           # Seções do artigo, Prazos de etapas e Atribuição
│   ├── pull-requests/      # PRs, Fluxo de Revisão e Registro Manual do NIT
│   ├── git/                # Gerenciador de Repositórios e Servidor Bare
│   ├── events/             # Stream SSE (Server-Sent Events) para Notificações
│   └── compiler/           # Gerenciador de Compilação TeX Live em Docker (PRs & Release)
└── app.ts                  # Inicialização de plugins, rotas e servidor Fastify
```

---

## 2. Especificação do Modelo Duplo de Compilação LaTeX

1. **Compilação de Edição (Local no VS Code Iframe):**
   * Processada internamente no container do `code-server` do usuário com a extensão `LaTeX Workshop` e TeX Live. É acionada via auto-save / Ctrl+S para a pré-visualização instantânea do Autor.
2. **Compilação Oficial do Backend (Fila `latex.compilation`):**
   * Disparada quando um PR é aberto/atualizado ou quando o artigo completo é consolidado.
   * Executa em um container descartável Docker TeX Live para gerar o PDF limpo exibido na **tela do Revisor (`/reviews/:prId`)** e para gerar a versão oficial final em PDF para o **Coordenador**.

---

## 3. Especificação da API REST & Eventos (Endpoints & SSE)

### 3.1 Módulo `auth`
* `POST /api/v1/auth/login`
  * **Input:** `{ email, password }`
  * **Output:** `{ accessToken }` + Cookie `refreshToken` (httpOnly).
* `POST /api/v1/auth/refresh`
  * **Output:** `{ accessToken }` renovado via Refresh Token do cookie.
* `POST /api/v1/auth/logout`
  * Revoga o Refresh Token na tabela `Session`.

### 3.2 Módulo `events` (Server-Sent Events - SSE Stream)
* `GET /api/v1/events/stream`
  * **Headers:** `Accept: text/event-stream`, `Authorization: Bearer <JWT>`
  * **Eventos Emitidos:** `PDF_COMPILED`, `PR_REVIEWED`, `NIT_STATUS_UPDATED`, `MERGE_UNLOCKED`, `DEADLINE_ALERT`.

### 3.3 Módulo `projects` (Papers)
* `POST /api/v1/projects`
* `GET /api/v1/projects`
* `GET /api/v1/projects/:id`
* `PATCH /api/v1/projects/:id/post-submission`

### 3.4 Módulo `compiler` (PDF Oficial de PRs e Artigo Consolidado)
* `POST /api/v1/projects/:id/compile-master`
  * **Permissão:** `COORDINATOR`, `MANAGER`.
  * **Action:** Enfileira no RabbitMQ `latex.compilation` para compilar a versão oficial do artigo completo.
* `GET /api/v1/projects/:id/pdf`
  * **Action:** Retorna o PDF oficial gerado do artigo completo.

### 3.5 Controle de Acesso aos Repositórios do GitHub (ADR 001)
* **Modelo Atual (Opção A):** Abstração via Conta de Serviço (`GITHUB_TOKEN`). As permissões de acesso ao artigo são 100% gerenciadas pelo banco de dados (`ProjectMember`) e autenticadas via JWT. Os commits são assinados em nome do autor real. Os usuários finais não precisam de conta no GitHub.
* **Evolução Futura Registrada:** Ver documento [`adr-001-github-user-access.md`](file:///home/gilson-russo/development/professional/sci-latex-vscode/docs/planning/backend/adr-001-github-user-access.md) para detalhes das Opções B (Convite automático via API) e C (Modelo Híbrido).

---

## 4. Especificação dos Workers do RabbitMQ

1. **Worker `git.operations`:**
   * Recebe mensagens do tipo `COMMIT_PROGRESS` e `EXECUTE_MERGE`.
   * Executa comandos `git` no sistema de arquivos local usando o `GIT_SERVICE_TOKEN` e assinando com o e-mail do autor.
2. **Worker `latex.compilation`:**
   * Dispara container Docker TeX Live (`texlive/texlive:latest`) com parâmetros `--network none --cpus=2 -m 2g`.
   * Retorna o arquivo PDF oficial gerado e salva em `/storage/pdf/<project_id>/`. Emite evento `PDF_COMPILED` via SSE.
3. **Worker `deadlines.checker`:**
   * Cron executado a cada 1 hora. Verifica seções com vencimento próximo (48h) ou atrasadas. Emite evento `DEADLINE_ALERT` via SSE.
4. **Worker `notifications.events`:**
   * Recebe eventos de negócio e os despacha para a rota de stream SSE (`/api/v1/events/stream`).

---

## 5. Backlog de Tarefas do Backend (Divisão de Tarefas)

### 🧱 Sprint 1: Fundação, Autenticação & Stream SSE
- [X] Configurar projeto Fastify + TypeScript + ESLint.
- [X] Configurar conexão Prisma ORM e PostgreSQL (Docker Compose + Bind Mount).
- [X] Implementar migrations do Prisma com o schema oficial (`User`, `Team`, `AcademicPeriod`, `Project`, etc.) e script de seed.
- [X] Implementar módulo `auth` (Login JWT, Refresh Token em Cookie `httpOnly`, Middleware de Auth).
- [X] Implementar módulo `events` (Stream Server-Sent Events - SSE para notificações em tempo real).

### 📁 Sprint 2: Provisionamento Git & Módulo de Projetos
- [X] Implementar serviço de criação de repositórios no GitHub via API REST (`GITHUB_TOKEN`) com fallback local.
- [X] Implementar rotas de CRUD de `projects` (Paper) e cadastro de congressos (Target/Backup).
- [X] Configurar RabbitMQ (Exchanges e Fila `git.operations`).
- [X] Implementar Worker de Git (Commit silencioso no GitHub/remote com `--author` e Merge).

### 🔍 Sprint 3: Fluxo de Revisão, NIT e Compilação TeX
- [ ] Configurar Fila `latex.compilation` e Worker Docker TeX Live para compilações de PR e PDF Master.
- [ ] Implementar módulo `pull-requests` (Abertura de PR, Aprovação do Revisor).
- [ ] Implementar rota de registro manual do **NIT** (`WAITING_NIT`, `APPROVED_NIT`).
- [ ] Implementar trava de segurança para rota `POST /pull-requests/:id/merge` (exige Revisor Aprovado + NIT Aprovado).

### 📊 Sprint 4: Pós-Submissão, Gestão de Prazos & Auditoria
- [ ] Implementar rotas pós-submissão (Aceito + DOI, Pedido de Ajustes no mesmo congresso, Rejeitado + Decisão v2).
- [ ] Implementar Fila `deadlines.checker` para alertas de cronograma (🟢/🟡/🔴).
- [ ] Implementar middleware e Worker `audit.logger` gravando na tabela `AuditLog`.
- [ ] Implementar rotas do dashboard do Gerente (filtros por `AcademicPeriod`).
