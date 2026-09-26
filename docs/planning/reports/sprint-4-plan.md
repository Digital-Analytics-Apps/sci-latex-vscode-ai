# Plano de Implementação: Sprint 4 (Pós-Submissão, Prazos & Dashboard do Gerente)

Este documento descreve o plano detalhado para a execução da **Sprint 4**, cobrindo o fluxo pós-submissão de artigos (aceite com DOI, revisão ou rejeição com decisão v2/backup), alertas de prazos (🟢/🟡/🔴), worker `deadlines.checker` e o dashboard consolidado para Gerentes (`MANAGER`).

---

## 🏗️ Escopo & Componentes da Sprint 4

### 1. Módulo Pós-Submissão & Decisão dos Autores (`src/modules/projects`)
- **[PATCH /api/v1/projects/:id/post-submission](file:///home/gilson-russo/development/professional/sci-latex-vscode/backend/src/modules/projects/projects.routes.ts):**
  - **Cenário A (ACEITO / CAMERA-READY):** Registro do DOI, `publicationUrl`, `datasetUrl`, `publishedAt` -> transição para `ACCEPTED_CAMERA_READY` ou `COMPLETED_PUBLISHED`.
  - **Cenário B (SOLICITAÇÃO DE AJUSTES):** Transição para `ACCEPTED_REVISION_REQUESTED` (ajustes para o mesmo congresso).
  - **Cenário C (REJEITADO):** Transição para `REJECTED_WAITING_DECISION`. Permite aos autores decidirem redirecionar para o **Congresso Backup** (`SUBMITTED_BACKUP`) ou reabrir como versão v2 (`REJECTED_REOPENED_V2`).

### 2. Gestão de Prazos & Alertas (`deadlines.checker`)
- **Serviço de Cálculo de Status de Prazo (`DeadlineService`):**
  - 🟢 **ON_TIME:** > 48 horas restantes.
  - 🟡 **WARNING_SOON:** <= 48 horas restantes.
  - 🔴 **OVERDUE:** Prazo estourado.
- **Worker `deadlines.checker` (`src/queue/workers/deadlines.worker.ts`):**
  - Execução periódica verificando seções e submissões com vencimento próximo ou estourado.
  - Emite alertas `DEADLINE_ALERT` via Server-Sent Events (SSE) para autores e coordenadores.

### 3. Módulo Dashboard do Gerente (`src/modules/dashboard`)
- **[GET /api/v1/dashboard/manager](file:///home/gilson-russo/development/professional/sci-latex-vscode/backend/src/modules/dashboard/dashboard.routes.ts):**
  - Endpoint protegido por `requireManagerOrAdmin`.
  - **Filtros:** `academicPeriodId` (Ciclo Acadêmico) e `teamId` (Equipe).
  - **Métricas Retornadas:**
    - Total de artigos no ciclo, total publicados com DOI, em revisão, submetidos e rejeitados.
    - Lista de Coordenadores e equipes vinculadas com progresso dos artigos e alertas de prazo.

### 4. Documentação & Testes
- Atualizar OpenAPI / Swagger UI com as tags `PostSubmission` e `Dashboard`.
- Suíte de testes unitários para `post-submission` e `dashboard.service.test.ts`.
- Salvar `sprint-4-plan.md` e `sprint-4-walkthrough.md` em `docs/planning/backend/`.

---

## 🔍 Plano de Verificação

### Testes Automatizados
- Executar `npm test` dentro do container backend verificando todos os testes (Sprint 1 a 4).

### Verificação Manual
- Testar a atualização pós-submissão via Swagger UI (`/docs`) registrando DOI e submissão backup.
- Consultar a rota `/api/v1/dashboard/manager` validando os totais consolidados do ciclo acadêmico.
