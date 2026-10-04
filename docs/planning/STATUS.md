# 📌 Status de Desenvolvimento & Guia de Retomada (`STATUS.md`)

**Projeto:** SCIA — Scientific Collaboration + AI (`sci-latex-vscode`)  
**Última Atualização:** 04 de Outubro de 2026  
**Status Geral do Projeto:** 🟢 **Arquitetura Orientada a Personas & Linha do Tempo Gantt Refatorada com Propagação no Banco.** Adicionados os campos `startedAt` e `startDate` no modelo Prisma `Task`, propagação automática de status `IN_PROGRESS` e `startedAt` para a Etapa Pai (`ProjectStage`) no backend, eliminação de mascaramento de dados no frontend, tipagens fortes DTO em `task.types.ts` e `project.types.ts`, e estilização das barras do Gantt com RGBA visíveis e marcos verticais. 100% dos builds TypeScript (backend & frontend) e linter sem erros.

---

## ⚡ 1. Onde Parei & Como Retomar (Session Checkpoint)

> [!IMPORTANT]
> **Consulte esta seção sempre que iniciar ou retomar uma sessão de desenvolvimento.** Ela indica exatamente a última alteração realizada e qual o primeiro comando/tarefa a ser executado.

### 🔍 Estado Atual da Aplicação
  * **Persistência de Início de Tarefas & Propagação no Banco (Backend/Prisma):**
    * **Schema Prisma (`backend/prisma/schema.prisma`)**: Adicionados os campos `startDate DateTime?` e `startedAt DateTime?` no modelo `Task`. Executados `npx prisma db push` e `npx prisma generate` para sincronização completa com o banco PostgreSQL.
    * **Propagação de Status em `tasks.service.ts`**: Ao iniciar o workspace de uma tarefa (`startTaskWorkspace`), o backend atualiza a `Task` (`status: IN_PROGRESS`, `startedAt: now`, `startDate: now`) e propaga o status para a Etapa Pai (`ProjectStage` com `status: IN_PROGRESS`, `startedAt: now`).
    * **Integridade da Arquitetura**: Eliminados os fallbacks artificiais do frontend (`isStageStarted` e `startDateStr`), garantindo que o Gantt reflita estritamente o estado real do banco de dados sem ocultar bugs.
  * **Tipagem Forte DTOs & Compilação TypeScript:**
    * **`task.types.ts`**: Atualizadas as interfaces `TaskItem` e `TaskSummary` incluindo `startedAt?: string`, `startDate?: string`, `createdAt?: string`, `updatedAt?: string`, `dueDate?: string` opcional e o array de `pullRequests`.
    * **`project.types.ts`**: Adicionados `createdAt?: string | null` e `updatedAt?: string | null` em `ProjectDetails`.
    * **Verificação de Compilação**: Executados `npm run build` no backend e `npm run build` no frontend com **0 erros de compilação** e **0 warnings no ESLint**.
  * **Visão de Linha do Tempo & Gráfico de Gantt Interativo (AI-Powered GanttView):**
    * **Componentes de Gantt (`src/features/author/components/gantt/`)**: Refatorados [`GanttTimelineView.tsx`](file:///home/gilson-russo/development/professional/sci-latex-vscode/frontend/src/features/author/components/gantt/GanttTimelineView.tsx), [`GanttChartGrid.tsx`](file:///home/gilson-russo/development/professional/sci-latex-vscode/frontend/src/features/author/components/gantt/GanttChartGrid.tsx), [`GanttHeaderStats.tsx`](file:///home/gilson-russo/development/professional/sci-latex-vscode/frontend/src/features/author/components/gantt/GanttHeaderStats.tsx), [`GanttTableTree.tsx`](file:///home/gilson-russo/development/professional/sci-latex-vscode/frontend/src/features/author/components/gantt/GanttTableTree.tsx), [`GanttTaskDetailDrawer.tsx`](file:///home/gilson-russo/development/professional/sci-latex-vscode/frontend/src/features/author/components/gantt/GanttTaskDetailDrawer.tsx) e [`ganttUtils.ts`](file:///home/gilson-russo/development/professional/sci-latex-vscode/frontend/src/features/author/components/gantt/ganttUtils.ts).
    * Preenchimento gradativo do tempo decorrido com RGBA visível (`rgba(99, 102, 241, 0.35)` em progresso e `rgba(34, 197, 94, 0.35)` concluídas), bordas pontilhadas para tarefas não iniciadas.
    * Marcos verticais: **Início Artigo** (`projectCreatedAt`), **Hoje** e **Submissão ao Congresso Target**.

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
| **Bloco 6.7** | Etapas Dinâmicas, Branches 4-Level & Claim/Unclaim | 🟢 Concluído | [`ROADMAP.md#bloco-67`](file:///home/gilson-russo/development/professional/sci-latex-vscode/docs/planning/ROADMAP.md) |
| **Bloco 4** | Painel Admin em Tempo Real (Live SSE Admin) | 🟡 **A Iniciar** | [`ROADMAP.md#bloco-4`](file:///home/gilson-russo/development/professional/sci-latex-vscode/docs/planning/ROADMAP.md) |
| **Bloco 5** | Infraestrutura Futura (Hibernação de Pods & SSH Desktop) | ⚪ Backlog | [`ROADMAP.md#bloco-5`](file:///home/gilson-russo/development/professional/sci-latex-vscode/docs/planning/ROADMAP.md) |

---

## 🔄 3. Protocolo de Pausa e Atualização de Status

Toda vez que você pausar ou encerrar uma atividade:
1. Atualize a seção **1. Onde Parei & Como Retomar** deste arquivo ([`STATUS.md`](file:///home/gilson-russo/development/professional/sci-latex-vscode/docs/planning/STATUS.md)).
2. Descreva o que foi alterado na sessão e qual o primeiro passo para o próximo desenvolvedor / IA.
3. Se finalizar uma tarefa do Jira ou Roadmap, marque como `[x]` no [`ROADMAP.md`](file:///home/gilson-russo/development/professional/sci-latex-vscode/docs/planning/ROADMAP.md) e siga o fluxo de commit em [`WORKFLOW.md`](file:///home/gilson-russo/development/professional/sci-latex-vscode/docs/planning/WORKFLOW.md).
