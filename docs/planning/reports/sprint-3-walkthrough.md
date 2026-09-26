# Walkthrough: Sprint 3 - RBAC Estrito, Membros, Timeline, PRs, NIT & Compilação TeX

**Data de Conclusão:** 2026-09-06  
**Status:** 100% Concluída (18 testes passando)  

---

## 🎯 Resumo do Que Foi Desenvolvido

### 1. Middleware de RBAC Estrito (`src/middlewares/rbac.middleware.ts`)
- Criado o middleware `rbacGuard(allowedRoles)` e atalhos `requireCoordinatorOrAbove`, `requireManagerOrAdmin`, `requireAdmin`.
- Aplicada a trava de deleção de artigos (`DELETE /api/v1/projects/:id`) restringindo a ação para Coordenadores, Gerentes e Admins.

### 2. Gestão de Membros de Projetos e Timeline com Justificativa (`src/modules/projects`)
- **[POST /api/v1/projects/:id/members](file:///home/gilson-russo/development/professional/sci-latex-vscode/backend/src/modules/projects/projects.routes.ts):** Associação de Autores e Revisores ao artigo.
- **[DELETE /api/v1/projects/:id/members/:userId](file:///home/gilson-russo/development/professional/sci-latex-vscode/backend/src/modules/projects/projects.routes.ts):** Remoção de membros do artigo.
- **[PATCH /api/v1/projects/:id](file:///home/gilson-russo/development/professional/sci-latex-vscode/backend/src/modules/projects/projects.routes.ts):** Trava de segurança exigindo obrigatoriamente o campo `justification` para alterações em datas.
- **[GET /api/v1/projects/:id/timeline](file:///home/gilson-russo/development/professional/sci-latex-vscode/backend/src/modules/projects/projects.routes.ts):** Retorno do histórico imutável rastreável de eventos e justificativas do `AuditLog`.

### 3. Fila e Worker de Compilação TeX Live (`src/queue`)
- Configurada a fila `latex.compilation` no RabbitMQ (`rabbitmq.ts`).
- Criados o produtor [latex.producer.ts](file:///home/gilson-russo/development/professional/sci-latex-vscode/backend/src/queue/producers/latex.producer.ts) e o worker [latex.worker.ts](file:///home/gilson-russo/development/professional/sci-latex-vscode/backend/src/queue/workers/latex.worker.ts).
- O worker compila PDFs de visualização de PRs e o PDF Master consolidado oficial, emitindo eventos em tempo real `PDF_COMPILED` via SSE.

### 4. Módulo de Pull Requests (`src/modules/pull-requests`)
- **[POST /api/v1/pull-requests](file:///home/gilson-russo/development/professional/sci-latex-vscode/backend/src/modules/pull-requests/pull-requests.routes.ts):** Abertura de PR para seções.
- **[POST /api/v1/pull-requests/:id/review](file:///home/gilson-russo/development/professional/sci-latex-vscode/backend/src/modules/pull-requests/pull-requests.routes.ts):** Avaliação do Revisor com nota/status (`APPROVED` ou `CHANGES_REQUESTED`) e comentários por linha.
- **[PATCH /api/v1/pull-requests/:id/nit](file:///home/gilson-russo/development/professional/sci-latex-vscode/backend/src/modules/pull-requests/pull-requests.routes.ts):** Registro manual do parecer do NIT (`WAITING_NIT`, `APPROVED_NIT`, `REJECTED_NIT`).
- **[POST /api/v1/pull-requests/:id/merge](file:///home/gilson-russo/development/professional/sci-latex-vscode/backend/src/modules/pull-requests/pull-requests.routes.ts):** Execução do Merge com **Trava Estrita de Segurança** (exige Revisor = `APPROVED` E NIT = `APPROVED_NIT`).

---

## 🧪 Resultados dos Testes

- **Suíte de Testes:** 6 arquivos de testes passando (18 testes no total).
- **Cobertura de Casos Limite:**
  - Trava de Merge bloqueando PR sem aprovação do Revisor (Retorna 400).
  - Trava de Merge bloqueando PR sem parecer do NIT (Retorna 400).
  - Sucesso na execução do Merge quando ambas as aprovações ocorrem.
