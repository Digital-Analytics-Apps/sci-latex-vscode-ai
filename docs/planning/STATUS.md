# 📌 Status de Desenvolvimento & Guia de Retomada (`STATUS.md`)

**Projeto:** Plataforma Web de Escrita Científica Self-Hosted (`sci-latex-vscode`)  
**Última Atualização:** 30 de Setembro de 2026  
**Status Geral do Projeto:** 🟢 **Redesign da Linha do Tempo e Gerenciamento de Artigos (Stepper Horizontal Compacto 1-Linha, Padrão Master-Detail de Inspeção de Etapas, Progresso Baseado em Tarefas e Cabeçalho Enxuto) Concluído com Sucesso.** 100% dos testes Vitest (18 suítes / 63 testes) e compilações TypeScript (backend & frontend) passando com 0 erros.

---

## ⚡ 1. Onde Parei & Como Retomar (Session Checkpoint)

> [!IMPORTANT]
> **Consulte esta seção sempre que iniciar ou retomar uma sessão de desenvolvimento.** Ela indica exatamente a última alteração realizada e qual o primeiro comando/tarefa a ser executado.

### 🔍 Estado Atual da Aplicação
  * **Redesign da Interface do Autor & Timeline (`AuthorDashboard.tsx` & `ArticleTimelineHeader.tsx`):**
    * **Branch Git Dedicada:** `feature/SLV-redesign-compact-timeline-stepper`
    * **Redução de Gasto Vertical:** Reduzido o consumo de espaço vertical da timeline e do cabeçalho do artigo de ~600px para **~160px**, eliminando a necessidade de dar zoom out na tela.
    * **Fita Stepper Horizontal de 1 Linha**: Implementada a régua horizontal enxuta de nós conectados com semântica de ícones (`✓` Concluída, `●` Em Andamento, `○` Pendente, `🔒` Gatekeeper Bloqueado, `⚑` Gatekeeper Liberado).
    * **Padrão Master-Detail**: Clique em qualquer nó da régua ativa o painel de inspeção detalhada daquela etapa logo abaixo, exibindo prazo (`Início → Fim`), acionadores de governança e barra de progresso calculada diretamente a partir da proporção de tarefas concluídas vinculadas a essa etapa.
    * **Modo Gantt Temporal Enxuto (`[ 📊 Timeline ]`)**: Cronograma de barras horizontais compacto e proporcional em caixa única.
    * **Cabeçalho de Artigo Compacto**: Banner de 1-2 linhas de alta densidade reunindo botões de ação (`+ Nova Tarefa`, `Release Candidates`, `+ Membro`) e avatares sobrepostos de membros.
  * **Qualidade, Linter e Testes Automatizados:**
    * **Backend (`npx tsc --noEmit`):** 0 erros de compilação.
    * **Backend (`npx vitest run`):** 100% das 18 suítes e 63 testes unitários/integração aprovados.
    * **Frontend (`npx tsc -b`):** 0 erros de compilação TypeScript.

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
