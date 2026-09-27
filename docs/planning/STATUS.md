# 📌 Status de Desenvolvimento & Guia de Retomada (`STATUS.md`)

**Projeto:** Plataforma Web de Escrita Científica Self-Hosted (`sci-latex-vscode`)  
**Última Atualização:** 27 de Setembro de 2026  
**Status Geral do Projeto:** 🟢 **Bloco 6 (Governança de Domínio, Ciclos Acadêmicos & Gatekeepers)** Concluído com Sucesso. 100% dos testes passando e 0 erros de compilação.

---

## ⚡ 1. Onde Parei & Como Retomar (Session Checkpoint)

> [!IMPORTANT]
> **Consulte esta seção sempre que iniciar ou retomar uma sessão de desenvolvimento.** Ela indica exatamente a última alteração realizada e qual o primeiro comando/tarefa a ser executado.

### 🔍 Estado Atual da Aplicação
* **Últimas Implementações Finalizadas (Bloco 6 Complete):**
  * **Modelo de Banco de Dados Prisma (`schema.prisma`):**
    * Adicionados campos `targetArticlesCount`, `status`, `managerId` em `AcademicPeriod`.
    * Criados os modelos `TeamAcademicGoal` (cotas por laboratório/equipe) e `ProjectStage` (etapas flexíveis de escrita com suporte a travas de `isGatekeeper` e `gatekeeperType`: NIT e TARGET_CONFERENCE).
    * Adicionada a relação `stageId` no modelo `Task`.
    * Executada a migração do banco com `npx prisma db push` e `npx prisma generate`.
  * **REST APIs no Backend (`backend/src/modules/`):**
    * **Períodos Acadêmicos & Cotas:** Implementados endpoints `POST /api/v1/academic-periods/:id/goals` e `GET /api/v1/academic-periods/:id/goals` com suporte a filtro por `managerId`.
    * **Etapas Flexíveis de Projeto:** Implementados endpoints `GET/POST/PATCH/DELETE /api/v1/projects/:projectId/stages` em `ProjectStagesController` e `ProjectStagesService`.
    * **Validação Estrita de Gatekeepers:**
      * Gatekeeper 1 (NIT): Bloqueia ativação/aprovação do NIT se houver etapas de conteúdo pendentes (`< 100%`).
      * Gatekeeper 2 (Congresso Alvo): Bloqueia submissão ao congresso se o parecer do NIT não estiver aprovado (`COMPLETED`).
    * **Testes de Integração & Unidade:** Criados `project-stages.service.test.ts` e `academic-periods.service.test.ts` (18/18 arquivos de teste aprovados, 61/61 suítes de testes passando no backend).
  * **Interface ReactJS no Frontend (`frontend/src/`):**
    * **Régua de Timeline Paralela (`<ArticleTimelineHeader />`):** Exibe a barra horizontal de progresso paralelo de etapas e gatekeepers com badges de status e botões de ação ("Concluir", "Iniciar").
    * **Badges de Trava de Governança (`<GatekeeperLockBadge />`):** Exibe o status das travas do NIT (`🔒 NIT: Trava Ativa`, `⏳ Em Análise`, `✅ Parecer Favorável`) e do Congresso Alvo com tooltips explicativos.
    * **Atribuição de Etapa em Tarefas (`CreateTaskModal.tsx`):** Adicionado o campo `<Select>` para o autor associar a nova tarefa a uma etapa específica do artigo.
    * **Métricas do Gerente (`ManagementDashboard.tsx`):** Adicionado o card de progresso de Metas do Ciclo Acadêmico (artigos concluídos/submetidos vs meta global).
  * **Status dos Testes & Build:** Backend com 18/18 arquivos e 61 suítes de testes passando (100% ok). TypeScript no backend e frontend com **0 erros** (`npx tsc -b`). Build de produção do frontend compilado com **sucesso** (`npm run build`). Padronização completa de enums (`PeriodStatus`, `StageStatus`, `TaskStatus`, `Role`) e tipos compartilhados em `frontend/src/types/`.

---

### 🚀 Próximas Atividades Imediatas (Escolha para Retomar)

#### 🎯 Opção 1 (Recomendada - Novo Recurso): Bloco 4 - Painel Admin em Tempo Real
1. **Atividade 4.1:** Criar endpoint SSE de administração `/api/v1/admin/events` no backend para transmitir status de conexões ativas, Pods K8s e rascunhos.
2. **Atividade 4.2:** Criar página/modal de Administração no frontend para visualizar usuários online, Pods (warm vs active), tempo de sessão e ações de desconexão.
3. *Arquivo de Referência:* [`docs/planning/ROADMAP.md`](file:///home/gilson-russo/development/professional/sci-latex-vscode/docs/planning/ROADMAP.md)

#### 🛠️ Opção 2 (Refinamentos de UX): Atender pendências de [`analisar.md`](file:///home/gilson-russo/development/professional/sci-latex-vscode/docs/planning/backlog/analisar.md)
1. **Tela do Autor Pós-Merge:** Permitir que o autor visualize o histórico de comentários e apontamentos da revisão mesmo após o PR ter sido mergeado.
2. **Movimentação Dinâmica de Tarefas (Kanban Auto-Move):** Mover cards dinamicamente na tabela/board com base no status real do PR (Draft -> Em Progresso, Mergeado -> Feito).
3. **Fluxo de Revisão Entre Pares (`PEER_REVIEW`):** Validar a experiência de co-autores revisando seções atribuídas aos pares.

---

## 📊 2. Visão Geral do Status por Bloco

| Bloco | Descrição | Status | Referência |
| :--- | :--- | :---: | :--- |
| **Bloco 1** | Estabilização Backend, Infra K8s & Zen Mode | 🟢 Concluído | [`ROADMAP.md#bloco-1`](file:///home/gilson-russo/development/professional/sci-latex-vscode/docs/planning/ROADMAP.md) |
| **Bloco 2** | Regras de Negócio de PRs, Revisão & Pods Isolados | 🟢 Concluído | [`ROADMAP.md#bloco-2`](file:///home/gilson-russo/development/professional/sci-latex-vscode/docs/planning/ROADMAP.md) |
| **Bloco 3** | Frontend ReactJS (Vite, Modais, Services Centralizados) | 🟢 Concluído | [`ROADMAP.md#bloco-3`](file:///home/gilson-russo/development/professional/sci-latex-vscode/docs/planning/ROADMAP.md) |
| **Fases 1-4** | Integração GitHub-Native, Projeções & SSE | 🟢 Concluído | [`reports/relatorio-fase-4.md`](file:///home/gilson-russo/development/professional/sci-latex-vscode/docs/planning/reports/relatorio-fase-4.md) |
| **Bloco 4** | Painel Admin em Tempo Real (Live SSE Admin) | 🟡 **A Iniciar** | [`ROADMAP.md#bloco-4`](file:///home/gilson-russo/development/professional/sci-latex-vscode/docs/planning/ROADMAP.md) |
| **Bloco 5** | Infraestrutura Futura (Hibernação de Pods & SSH Desktop) | ⚪ Backlog | [`ROADMAP.md#bloco-5`](file:///home/gilson-russo/development/professional/sci-latex-vscode/docs/planning/ROADMAP.md) |

---

## 🔄 3. Protocolo de Pausa e Atualização de Status

Toda vez que você pausar ou encerrar uma atividade:
1. Atualize a seção **1. Onde Parei & Como Retomar** deste arquivo ([`STATUS.md`](file:///home/gilson-russo/development/professional/sci-latex-vscode/docs/planning/STATUS.md)).
2. Descreva o que foi alterado na sessão e qual o primeiro passo para o próximo desenvolvedor / IA.
3. Se finalizar uma tarefa do Jira ou Roadmap, marque como `[x]` no [`ROADMAP.md`](file:///home/gilson-russo/development/professional/sci-latex-vscode/docs/planning/ROADMAP.md) e siga o fluxo de commit em [`WORKFLOW.md`](file:///home/gilson-russo/development/professional/sci-latex-vscode/docs/planning/WORKFLOW.md).
