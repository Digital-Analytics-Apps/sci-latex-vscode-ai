# 📌 Status de Desenvolvimento & Guia de Retomada (`STATUS.md`)

**Projeto:** Plataforma Web de Escrita Científica Self-Hosted (`sci-latex-vscode`)  
**Última Atualização:** 30 de Setembro de 2026  
**Status Geral do Projeto:** 🟢 **Modal Único de Configurações (`ProjectSettingsModal`), Gestão de Membros & Coautores, Integração de Release Candidates (RCs) e Releases Oficiais na Main, Modal de Timeline Ampla em Tela Cheia com Accordion de Tarefas e Validação de Prazos, Tags de Etapa Personalizadas por Cor do Tema na Tabela Concluídos com Sucesso.** 100% dos testes Vitest (18 suítes / 63 testes) e compilações TypeScript (backend & frontend) passando com 0 erros.

---

## ⚡ 1. Onde Parei & Como Retomar (Session Checkpoint)

> [!IMPORTANT]
> **Consulte esta seção sempre que iniciar ou retomar uma sessão de desenvolvimento.** Ela indica exatamente a última alteração realizada e qual o primeiro comando/tarefa a ser executado.

### 🔍 Estado Atual da Aplicação
  * **Modal de Timeline Ampla em Tela Cheia (`ArticleTimelineHeader.tsx` & Backend):**
    * **Resolução do Erro HTTP 400 no Backend**: Identificada e corrigida a inconsistência de schema Prisma em `PrismaProjectStagesRepository.findByProjectId`, onde a tentativa de inclusão do atributo inexistente `avatarUrl` na relação `assignee` causava a falha `400 Bad Request` no endpoint `/api/v1/projects/:id/stages`.
    * **Exibição Correta das Tarefas por Etapa**: Com a rota `/stages` retornando 200 OK, as tarefas reais da etapa (ex: *"Inciar a pesquisa de artigos relacionados"* com `dueDate: 22/10/2026`) são carregadas perfeitamente dentro dos accordions no modal e na régua da timeline.
    * **Visualização Full-Screen**: Configurado modal em tela cheia (`size="xl" width="96vw" height="90vh"`) para oferecer um painel de Gantt / Timeline abrangente.
    * **Accordion de Tarefas por Etapa**: Cada card de etapa no modal expande/recolhe ao clicar, exibindo todas as tarefas (`stage.tasks`) vinculadas à etapa com branch, autor e prazo de vencimento (`task.dueDate`).
    * **Validação de Prazos Limite**: Implementada validação de datas: se `task.dueDate > stage.plannedCompletionDate`, o sistema exibe um alerta de aviso destacado (`⚠️ Excede o limite da etapa (DD/MM/AAAA)`) impedindo extrapolações sem notificação.
  * **Melhorias de UX na Tabela de Tarefas (`AuthorTasksTable.tsx` & `TaskDataGridCells.tsx`):**
    * **Tag de Etapa Personalizada na Coluna 1**: Adicionada tag (`Chip`) com a cor do tema correspondente a cada etapa (Etapa 1: Azul, Etapa 2: Roxo, Etapa 3: Verde Água, Gatekeepers: Laranja).
    * **Posicionamento & Formatação**: A tag é exibida **após** o título da tarefa (`[Título da Tarefa] [Nome da Etapa]`), mostrando apenas o nome da etapa sem o prefixo `"Etapa X:"`.
    * **Botão `+ Nova Tarefa` Reposicionado**: Movido para a barra de buscas da tabela, posicionado lado a lado com o filtro de *Status da Tarefa*.
    * **Ações de Assinar / Desassinar Inline**: Integradas na coluna *Autor Responsável* com avatares em 30px e botões destacados (`Assinar` / `Desassinar`).
  * **Centralização no Modal de Configurações (`ProjectSettingsModal.tsx` & `AuthorDashboard.tsx`):**
    * **Remoção de Poluição do Header**: O cabeçalho do artigo exibe apenas os Avatares de membros e o ícone único da engrenagem (`<SettingsIcon />`), removendo botões isolados.
    * **Aba de Membros & Coautores (Tab 1)**: Listagem de colaboradores e inclusão via `+ Adicionar Membro`.
    * **Aba de Release Candidates & Releases Oficiais (Tab 2)**: Listagem de RCs enviadas ao Revisor Técnico, formulário para novas RCs e listagem de Releases Oficiais publicadas na `main`. Botão de publicação oficial protegido por regra de validação (exige 100% das etapas de escrita concluídas).
    * **Aba de Metadados & Git (Tab 3)**: Exibição da URL do repositório, branch base `dev`, conferência-alvo e prazos.
  * **Qualidade, Linter e Testes Automatizados:**
    * **Backend (`npm run build` / `npx tsc`):** 0 erros de compilação.
    * **Backend (`npm test`):** 100% das 18 suítes e 63 testes unitários/integração aprovados.
    * **Frontend (`npx tsc -b` & `npm run lint`):** 0 erros de compilação ou linter.

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
