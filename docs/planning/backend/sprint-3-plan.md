# Plano de Implementação: Sprint 3 (RBAC Estrito, PRs, NIT & Compilação TeX)

Este documento descreve o plano detalhado para a execução da **Sprint 3**, integrando as regras de permissão RBAC estritas, gestão de membros de projetos, timeline rastreável, fluxo de revisão de Pull Requests (PRs), validação manual do NIT e compilação de arquivos TeX em Docker via RabbitMQ.

---

## 🏗️ Escopo & Componentes da Sprint 3

### 1. Middleware de Permissões RBAC (`rbac.middleware.ts`)
- Criar o middleware `rbacGuard(allowedRoles: Role[])` para validar o papel do usuário no JWT contra a Matriz de Permissões do projeto.
- Bloquear a exclusão de projetos (`DELETE /api/v1/projects/:id`) apenas para `COORDINATOR`, `MANAGER` e `ADMIN`.
- Validar que a data de início do artigo (`createdAt` / `startDate`) seja **imutável**.
- Exigir obrigatoriamente o campo `justification` em requisições de alteração de datas (`PATCH /api/v1/projects/:id`).

### 2. Módulo de Membros e Timeline de Projetos
- `POST /api/v1/projects/:id/members`: Associar autores/revisores ao artigo (`COORDINATOR`, `MANAGER`, `ADMIN`).
- `DELETE /api/v1/projects/:id/members/:userId`: Remover autor/revisor do artigo (`COORDINATOR`, `MANAGER`, `ADMIN`).
- `GET /api/v1/projects/:id/timeline`: Retornar o histórico imutável de alterações de datas, justificativas e status registrado em `AuditLog`.

### 3. Módulo de Pull Requests (`src/modules/pull-requests`)
- `POST /api/v1/pull-requests`: Abertura de PR para a seção de um artigo por um Autor (`AUTHOR`).
- `GET /api/v1/pull-requests`: Listar PRs por projeto/filtro.
- `GET /api/v1/pull-requests/:id`: Detalhes completos do PR e comentários.
- `POST /api/v1/pull-requests/:id/review`: Avaliação pelo Revisor (`APPROVED`, `CHANGES_REQUESTED` com comentários por linha).

### 4. Validação do NIT & Trava de Segurança no Merge
- `PATCH /api/v1/pull-requests/:id/nit`: Registro do status NIT (`WAITING_NIT`, `APPROVED_NIT`, `REJECTED_NIT`) e parecer (`COORDINATOR`, `MANAGER`, `ADMIN`).
- `POST /api/v1/pull-requests/:id/merge`: Executar o merge da branch do PR para a branch principal (`main`).
  - **Trava de Segurança Estrita:** Lança erro `400 BAD_REQUEST` se o PR não estiver com Revisor = `APPROVED` **E** NIT = `APPROVED_NIT`.

### 5. Fila e Worker de Compilação TeX (`latex.compilation`)
- **RabbitMQ:** Configurar fila `latex.compilation` e routing key `latex.*` no `rabbitmq.ts`.
- **Produtor (`latex.producer.ts`):** Enfileirar requisições de compilação.
- **Worker (`latex.worker.ts`):** Processar mensagens de compilação TeX para gerar o PDF limpo exibido na tela do Revisor e o PDF consolidado oficial.

### 6. Documentação & Testes
- Atualizar o Swagger UI (`http://localhost:3333/docs`) com a tag `PullRequests` e `Timeline`.
- Criar suíte de testes unitários para `pull-requests.service.test.ts` e `rbac.middleware.test.ts`.
- Salvar `sprint-3-plan.md` em `docs/planning/backend/`.

---

## 🔍 Plano de Verificação

### Testes Automatizados
- Executar `npm test` dentro do container backend verificando a aprovação de todos os testes unitários e de integração.

### Verificação Manual
- Testar a trava de segurança do merge (garantindo bloqueio caso o NIT esteja pendente ou o Revisor não tenha aprovado).
- Testar a obrigatoriedade da justificativa em alterações de prazos e checar a saída da rota de `/timeline`.
