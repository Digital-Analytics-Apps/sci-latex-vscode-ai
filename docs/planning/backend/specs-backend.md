# Especificação Técnica do Backend (Fastify + Prisma + TypeScript)

**Projeto:** Plataforma Web de Escrita Científica Self-Hosted  
**Última Atualização:** 2026-09-08  
**Documento de Referência:** [`specs.md`](file:///home/gilson-russo/development/professional/sci-latex-vscode/docs/planning/specs.md)

---

## 1. Estrutura de Arquitetura do Backend

O backend é construído em **Node.js + Fastify + TypeScript**, seguindo uma arquitetura modular por domínio (Modular Monolith) **Ultra-Leve (Sem Broker / Sem RabbitMQ)**. Para produção, os workspaces de edição são orquestrados via Kubernetes Pods sob demanda (Ver [`adr-002-kubernetes-on-demand-pods.md`](file:///home/gilson-russo/development/professional/sci-latex-vscode/docs/planning/backend/adr-002-kubernetes-on-demand-pods.md)).

```
src/
├── @types/                 # Definições de tipos globais Fastify e JWT
├── config/                 # Configurações do env (Zod), Prisma e Docker
├── db/                     # Instância do Prisma Client e Seeds
├── middlewares/            # Middlewares de Auth JWT, RBAC Guard e Audit Logger
├── modules/                # Módulos de Domínio
│   ├── auth/               # Autenticação, Login, Refresh Token
│   ├── academic-periods/   # Gestão de Ciclos/Períodos Acadêmicos
│   ├── teams/              # Gestão de Equipes e Coordenadores
│   ├── projects/           # Projetos/Papers, Congressos Alvo/Backup e DOI
│   ├── sections/           # Seções do artigo, Prazos de etapas e Atribuição
│   ├── pull-requests/      # PRs, Fluxo de Revisão e Registro Manual do NIT
│   ├── git/                # Gerenciador de Repositórios e SDK Octokit
│   ├── events/             # Stream SSE (Server-Sent Events) para Notificações
│   └── compiler/           # Gerenciador de Compilação TeX Live em Docker (PRs & Release)
└── app.ts                  # Inicialização de plugins, rotas e servidor Fastify
```

---

## 2. Especificação do Modelo Duplo de Compilação LaTeX

1. **Compilação de Edição (Local no VS Code Iframe):**
   * Processada internamente no container do `code-server` do usuário com a extensão `LaTeX Workshop` e TeX Live. É acionada via auto-save / Ctrl+S para a pré-visualização instantânea do Autor.
2. **Compilação Oficial do Backend:**
   * Disparada quando um PR é consolidado ou quando o artigo completo é solicitado.
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
  * **Action:** Compila a versão oficial do artigo completo.
* `GET /api/v1/projects/:id/pdf`
  * **Action:** Retorna o PDF oficial gerado do artigo completo.

### 3.5 Controle de Acesso aos Repositórios do GitHub (ADR 001 & Segurança)
* **SDK Oficial GitHub Octokit:** Todas as chamadas para a API REST/GraphQL do GitHub (criação de repositórios, Pull Requests, revisões técnicas e solicitações de merge) utilizam a biblioteca oficial `@octokit/rest`.
* **Autenticação Segura no Git CLI:** Comandos do Git em linha de comando (`git clone`, `git fetch`, `git push`, `git merge`) não embutem tokens nas URLs HTTPS (`x-access-token:`). A autenticação é transmitida de forma efêmera e segura via `-c http.extraHeader="Authorization: Basic <base64>"`, evitando o armazenamento de senhas/tokens no `.git/config` ou vazamento em logs.
* **Modelo Atual (Opção A):** Abstração via Conta de Serviço (`GITHUB_TOKEN`). As permissões de acesso ao artigo são 100% gerenciadas pelo banco de dados (`ProjectMember`) e autenticadas via JWT. Os commits são assinados em nome do autor real. Os usuários finais não precisam de conta no GitHub.
* **Evolução Futura Registrada:** Ver documento [`adr-001-github-user-access.md`](file:///home/gilson-russo/development/professional/sci-latex-vscode/docs/planning/backend/adr-001-github-user-access.md) para detalhes das Opções B (Convite automático via API) e C (Modelo Híbrido).

### 3.6 Matriz Oficial de Permissões (RBAC) & Regras de Prazos/Timeline

#### 🔐 Matriz de Permissões de Cadastro e Ações (RBAC)
| Ação / Recurso | ADMIN | MANAGER (Gerente) | COORDINATOR (Coordenador) | REVIEWER (Revisor) | AUTHOR (Autor) |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **Criar Artigo e associar Autores** | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Deletar Artigo** | ✅ | ✅ | ✅ | ❌ | ❌ |
| **Remover Autor ou Revisor de Artigo** | ✅ | ✅ | ✅ | ❌ | ❌ |
| **Associar/Designar Revisor a Artigo** | ✅ | ✅ | ✅ | ❌ | ❌ |
| **CRUD de Gerentes (`MANAGER`)** | ✅ | ❌ | ❌ | ❌ | ❌ |
| **CRUD de Coordenadores (`COORDINATOR`)**| ✅ | ✅ | ❌ | ❌ | ❌ |
| **CRUD de Autores (`AUTHOR`)** | ✅ | ✅ | ✅ | ❌ | ❌ |
| **CRUD de Revisores (`REVIEWER`)** | ✅ | ✅ | ✅ | ❌ | ❌ |
| **CRUD de Equipes (`Team`)** | ✅ | ✅ | ❌ | ❌ | ❌ |

#### 👥 Estrutura de Equipes e Restrição de Integrantes de Artigos
1. **Composição da Equipe (`Team`):** Uma equipe possui estritamente no máximo **1 Gerente** (`managerId`) e exatamente **1 Coordenador** (`coordinatorId`).
2. **Vinculação do Projeto/Artigo à Equipe:** Todo artigo/projeto está associado a uma Equipe (`teamId`), herdando o seu Gerente e Coordenador.
3. **Restrição de Revisor por Artigo:** Um artigo pode possuir **somente 1 Revisor** (`role: REVIEWER`) atribuído em `ProjectMember`. A inclusão de um 2º revisor é bloqueada com erro HTTP 400 Bad Request (`PROJECT_ALREADY_HAS_REVIEWER`).
4. **Múltiplos Autores:** Um artigo/projeto pode possuir **múltiplos Autores** (`role: AUTHOR`).

#### 📅 Regras de Prazos, Alterações e Timeline Rastreável
1. **Definição Inicial de Etapas:** Ao criar o artigo, o Autor define as datas limite para cada etapa/seção do artigo. O cadastro das conferências (Target/Backup) pode ser informado ou atualizado posteriormente.
2. **Obrigatoriedade de Justificativa:** Toda alteração de data (etapa, prazo de seção ou data de submissão) **exige obrigatoriamente uma justificativa legível (`justification`)**.
3. **Imutabilidade da Data de Início:** A data de início do artigo (`createdAt` / `startDate`) é **estritamente imutável** e não pode ser modificada por nenhuma persona.
4. **Timeline Rastreável:** Todo o histórico de prazos, alterações com justificativa, revisões de PR e status é gravado no histórico imutável (`AuditLog`), permitindo rastreio completo do processo do artigo.

---

### 3.7 Arquitetura Modular LaTeX & Trava Preventiva de Seção (`SLV-9`)

1. **Estrutura Modular de Repositório (`sections/*.tex`):**
   - Repositórios LaTeX inicializados pelo backend contêm um diretório `sections/` com os arquivos individuais (`01-introduction.tex`, `02-methodology.tex`, `03-results.tex`, `04-conclusion.tex`).
   - O arquivo raiz `main.tex` atua como orquestrador contendo o preâmbulo e importando os capítulos via `\input{sections/...}`.
   - **Benefício:** Eliminação de 90% dos conflitos de mesclagem do Git, pois autores editando seções distintas trabalham em arquivos isolados.

2. **Detecção de Trava por PR Ativo (`isLocked`):**
   - Ao consultar os detalhes do projeto (`GET /api/v1/projects/:id`), cada seção é retornada com o campo computado `isLocked: boolean` e o objeto `activePullRequest`.
   - Se existir um PR ativo nos status `DRAFT`, `UNDER_REVIEW` ou `CHANGES_REQUESTED` para a seção, `isLocked` torna-se `true`, permitindo que extensões (VS Code) ou interfaces web sinalizem e alertem outros autores sobre a edição em andamento.

---

## 4. Especificação de Serviços de Segundo Plano & Eventos (Sem Broker / Ultra-Leve)

1. **Serviço de Operações Git (`GitService`):**
   * Executa operações de commit, criação de repositórios e merge diretamente via SDK Octokit e comandos Git seguros (`http.extraHeader`).
2. **Serviço de Compilação TeX (`CompilerService`):**
   * Dispara container descartável Docker TeX Live (`texlive/texlive:latest`) com parâmetros `--network none --cpus=2 -m 2g`.
   * Retorna o arquivo PDF oficial gerado e salva em `/storage/pdf/<project_id>/`. Emite evento `PDF_COMPILED` via SSE.
3. **Monitor de Prazos (`DeadlinesChecker`):**
   * Rotina periódica que verifica seções com vencimento próximo (48h) ou atrasadas. Emite evento `DEADLINE_ALERT` via SSE.
4. **Notificações em Tempo Real (`EventsStream`):**
   * Transmite eventos de negócio diretamente na rota de stream SSE (`/api/v1/events/stream`).

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
- [X] Implementar serviço de Git (Commit silencioso no GitHub/remote com `--author` e Merge).

### 🔍 Sprint 3: Fluxo de Revisão, NIT e Compilação TeX
- [X] Configurar serviços e container Docker TeX Live para compilações de PR e PDF Master.
- [X] Implementar módulo `pull-requests` (Abertura de PR, Aprovação do Revisor).
- [X] Implementar rota de registro manual do **NIT** (`WAITING_NIT`, `APPROVED_NIT`).
- [X] Implementar trava de segurança para rota `POST /pull-requests/:id/merge` (exige Revisor Aprovado + NIT Aprovado).

### 📊 Sprint 4: Pós-Submissão, Gestão de Prazos & Auditoria
- [X] Implementar rotas pós-submissão (Aceito + DOI, Pedido de Ajustes no mesmo congresso, Rejeitado + Decisão v2).
- [X] Implementar verificação de prazos e alertas de cronograma (🟢/🟡/🔴).
- [X] Implementar middleware e logger gravando na tabela `AuditLog`.
- [X] Implementar rotas do dashboard do Gerente (filtros por `AcademicPeriod`).
