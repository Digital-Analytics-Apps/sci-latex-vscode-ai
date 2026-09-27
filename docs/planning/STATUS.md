# 📌 Status de Desenvolvimento & Guia de Retomada (`STATUS.md`)

**Projeto:** Plataforma Web de Escrita Científica Self-Hosted (`sci-latex-vscode`)  
**Última Atualização:** 27 de Setembro de 2026  
**Status Geral do Projeto:** 🟢 **Persona Gerente: Central de Comando com Sidebar Nativa, Modal Tabulado MUI de Equipes (Dados, Integrantes, Cotas) e Cadastro de Usuários com Roles** Concluído com Sucesso. 100% dos testes passando e 0 erros de compilação.

---

## ⚡ 1. Onde Parei & Como Retomar (Session Checkpoint)

> [!IMPORTANT]
> **Consulte esta seção sempre que iniciar ou retomar uma sessão de desenvolvimento.** Ela indica exatamente a última alteração realizada e qual o primeiro comando/tarefa a ser executado.

### 🔍 Estado Atual da Aplicação
* **Últimas Implementações Finalizadas na Sessão:**
  * **Sidebar Nativa no Painel do Gerente (`ManagerDashboardPage.tsx`):**
    * **Seção 0 (Home / Visão Geral):** Exibe exclusivamente os Cards de Métricas Executivas de Produção Científica (*Total de Artigos*, *Publicados com DOI*, *Em Avaliação Gatekeeper*, *Laboratórios Ativos*). **Tabela removida da Home**.
    * **Seção 1 (Ciclos Acadêmicos):** Guia dedicada para acompanhamento e criação de Ciclos Acadêmicos (`CreateAcademicPeriodModal`), onde a meta global de artigos é definida. **Botão redundante "Definir Cotas" removido do header**.
    * **Seção 2 (Artigos Institucionais):** Tabela DataGrid de artigos com status de governança e ação contextual "Novo Artigo".
    * **Seção 3 (Gestão de Equipes):** Tabela DataGrid de equipes com KPIs dedicados e ações "Nova Equipe", "Cadastrar Membro" e "Gerenciar Equipe".
  * **Unificação dos Modais de Equipes (`ManageTeamModal.tsx`):**
    * **Modal Único (Criação + Edição):** Removido o arquivo redundante `CreateTeamModal.tsx`. Ao clicar em "Nova Equipe", o modal abre na Aba 0 para cadastro inicial. Ao salvar, transiciona dinamicamente para o modo edição liberando as abas de **Integrantes** e **Cotas** sem fechar o modal.
    * **Busca Dinâmica de Coordenador (`UserSearchAutocomplete.tsx`):** Suporta modos simples e múltiplo (`multiple`), filtragem por papel (`allowedRoles`/`excludeRoles`) por nome ou e-mail com debounce de 300ms.
    * **Aba 0 (Dados Gerais):** Nome do laboratório, e-mail/busca do Coordenador e Exclusão de equipe.
    * **Aba 1 (Integrantes & Funções):** Busca em tempo real de pesquisadores (`useUserSearchQuery`), seleção de papel ao vincular (`Autor`, `Revisor`, `Coordenador`), chips de role e promoção a Coordenador Responsável.
    * **Aba 2 (Cotas da Equipe):** Seleção do Ciclo Acadêmico e atribuição direta da cota/meta de artigos para o laboratório via `useSetTeamGoalMutation`.
  * **Modal de Cadastro de Usuários com Seleção de Roles (`CreateUserModal.tsx`):**
    * Permite cadastrar novos membros informando Nome, E-mail, Senha e Papel (`AUTHOR`, `REVIEWER`, `COORDINATOR`, `MANAGER`).
  * **Constantes de Domínio (`frontend/src/constants/teams.ts`):**
    * Mapeamentos de papéis (`MEMBER_ROLE_LABELS`), cores de chips (`MEMBER_ROLE_COLORS`) e rótulos de interface.
  * **Qualidade, Linter e Testes:**
    * **`npx tsc -b`:** 0 erros.
    * **`npm run lint:fix`:** 0 erros / 0 warnings.
    * **`npm run build`:** Sucesso em 884ms.
    * **`npm test` (Backend):** 18/18 arquivos de teste verdes (61/61 suítes ok).
    * **Estado Git:** Modificações finais prontas no working tree (não comitadas conforme solicitado pelo usuário para revisão manual).

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
