# Walkthrough: Sprint 4 - Pós-Submissão, Gestão de Prazos & Dashboard do Gerente

**Data de Conclusão:** 2026-09-06  
**Status:** 100% Concluída (22 testes passando)  

---

## 🎯 Resumo do Que Foi Desenvolvido

### 1. Rotas Pós-Submissão & Decisão dos Autores (`src/modules/projects`)
- **[PATCH /api/v1/projects/:id/post-submission](file:///home/gilson-russo/development/professional/sci-latex-vscode/backend/src/modules/projects/projects.routes.ts):**
  - **Cenário A (ACEITO / CAMERA-READY):** Registro do DOI, `publicationUrl`, `datasetUrl`, `publishedAt` -> transição para `COMPLETED_PUBLISHED` ou `ACCEPTED_CAMERA_READY`.
  - **Cenário B (SOLICITAÇÃO DE AJUSTES):** Transição para `ACCEPTED_REVISION_REQUESTED` (ajustes na mesma conferência).
  - **Cenário C (REJEITADO):** Transição para `REJECTED_WAITING_DECISION`. Permite aos autores decidirem redirecionar para **Congresso Backup** (`SUBMITTED_BACKUP`) ou reabrir como versão v2 (`REJECTED_REOPENED_V2`).

### 2. Gestão de Prazos & Alertas (`src/modules/deadlines` e `src/queue/workers`)
- **[deadlines.service.ts](file:///home/gilson-russo/development/professional/sci-latex-vscode/backend/src/modules/deadlines/deadlines.service.ts):** Cálculo automático de status de prazos:
  - 🟢 **ON_TIME:** > 48 horas restantes.
  - 🟡 **WARNING_SOON:** <= 48 horas restantes.
  - 🔴 **OVERDUE:** Prazo estourado.
- **[deadlines.worker.ts](file:///home/gilson-russo/development/professional/sci-latex-vscode/backend/src/queue/workers/deadlines.worker.ts):** Verificação periódica de cronogramas e disparo de alertas `DEADLINE_ALERT` em tempo real via Server-Sent Events (SSE).

### 3. Dashboard do Gerente (`src/modules/dashboard`)
- **[GET /api/v1/dashboard/manager](file:///home/gilson-russo/development/professional/sci-latex-vscode/backend/src/modules/dashboard/dashboard.routes.ts):**
  - Protegido por `requireManagerOrAdmin`.
  - Filtros por `academicPeriodId` (Ciclo Acadêmico) e `teamId` (Equipe).
  - Retorna métricas consolidadas: total de artigos no ciclo, publicados com DOI, em revisão, rejeitados, equipes/coordenadores e alertas de prazo.

### 4. Auditoria Rastreável (`src/utils/audit.ts`)
- Módulo utilitário `logAudit` registrando todas as ações de criação, alterações de datas (com justificativa), submissões e decisões na tabela `AuditLog`.

---

## 🧪 Resultados dos Testes

- **Suíte de Testes:** 7 arquivos de testes passando (**22 testes no total**).
- **Integração Backend:** 100% das 4 Sprints do Backend finalizadas.
