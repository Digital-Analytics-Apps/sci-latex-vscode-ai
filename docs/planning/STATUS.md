# 📌 Status de Desenvolvimento & Guia de Retomada (`STATUS.md`)

**Projeto:** Plataforma Web de Escrita Científica Self-Hosted (`sci-latex-vscode`)  
**Última Atualização:** 29 de Setembro de 2026  
**Status Geral do Projeto:** 🟢 **Padronização de Modais (`StandardModal`), Refatoração de Ternários Aninhados, Modularização das Abas de Equipes (`manage-team-tabs/`) e Correção de Relações no Backend Prisma** Concluídos com Sucesso. 100% dos testes de compilação TypeScript (Frontend e Backend) e linting passando com 0 erros e 0 warnings.

---

## ⚡ 1. Onde Parei & Como Retomar (Session Checkpoint)

> [!IMPORTANT]
> **Consulte esta seção sempre que iniciar ou retomar uma sessão de desenvolvimento.** Ela indica exatamente a última alteração realizada e qual o primeiro comando/tarefa a ser executado.

### 🔍 Estado Atual da Aplicação
  * **Componente `StandardModal` (`StandardModal.tsx`):**
    * **Dimensões Fixas por Preset:** Elimina pulos visuais e variações de altura/largura ao alternar abas ou carregar dados (`sm`: 560x560, `md`: 740x640, `lg`: 920x720, `xl`: 1140x780).
    * **Footer Padronizado:** Botões *Cancelar* e *Salvar / Confirmar* integrados com suporte a `confirmIcon`, `isSubmitting`, `confirmDisabled` e `extraFooterActions` (ex: *Excluir Equipe*).
    * **100% dos Modais Convertidos:** `ManageTeamModal`, `CreateUserModal`, `CreateAcademicPeriodModal`, `CreateProjectModal`, `AddMemberModal`, `CreateTaskModal`, `SaveProgressModal`, `CreatePRModal`, `ReleaseCandidatesModal`, `NITParecerModal` e `PostSubmissionModal`.
  * **Modularização & Redução de Complexidade Cognitiva:**
    * **Subpasta de Abas de Equipe (`manage-team-tabs/`):** As abas do `ManageTeamModal` foram desacopladas em subcomponentes reutilizáveis em `src/features/manager/components/manage-team-tabs/` (`TeamGeneralTab.tsx`, `TeamMembersTab.tsx`, `TeamGoalsTab.tsx`).
    * **Eliminação de Ternários Aninhados:** Simplificadas as renderizações condicionais e declarações ternárias encadeadas em `SaveProgressModal.tsx`, `StandardModal.tsx`, `ArticleTimelineHeader.tsx`, `ReleaseCandidatesModal.tsx` e `ManageTeamModal.tsx`.
  * **Correção no Backend Prisma:**
    * Ajustado [`users.repository.ts`](file:///home/gilson-russo/development/professional/sci-latex-vscode/backend/src/repositories/users.repository.ts) e [`users.service.ts`](file:///home/gilson-russo/development/professional/sci-latex-vscode/backend/src/modules/users/users.service.ts) alinhando os seletores `_count` e relacionamentos com o schema Prisma (`teamMemberships` e `projects`).
  * **Qualidade, Linter e Testes:**
    * **Backend (`npx tsc --noEmit`):** 0 erros de compilação.
    * **Frontend (`npx tsc -b`):** 0 erros de compilação TypeScript.
    * **Frontend (`npm run lint:fix`):** 0 erros e 0 warnings no ESLint.

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
