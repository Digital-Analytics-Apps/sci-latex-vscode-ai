# 💡 Ideias em Refinamento — Backlog do Autor & Governança (`toRefine.md`)

Este documento reúne propostas de melhoria de UX, novas funcionalidades e refinamentos arquiteturais para a visão do **Autor (`src/features/author`)** e governança de artigos na plataforma.

---

## 🎯 1. Filtro por Autor Responsável na Tabela de Tarefas
* **Descrição:** Adicionar um filtro dropdown/autocomplete na barra de filtros (`TableFilterBar`) da tabela de tarefas do artigo (`AuthorTasksTable`).
* **Objetivo de UX:** Permitir que coautores e gestores acessem rapidamente tarefas atribuídas a si ou a um membro específico do artigo.
* **Aspectos Técnicos:**
  * Estender os filtros em `DEFAULT_AUTHOR_TASK_FILTERS` (`{ search: "", status: "ALL", assigneeId: "ALL" }`).
  * Conectar a seleção com os parâmetros de busca sincronizados via URL (`useUrlFilters`).

---

## 🟢 2. Indicador de Presença Online em Tempo Real nos Avatares (SSE Presence)
* **Descrição:** Exibir uma marcação visual (badge dot verde para *online* / cinza para *offline*) nos avatares dos membros (`<UserAvatar />` e `<UserAvatarStack />`).
* **Objetivo de UX:** Dar visibilidade imediata sobre quais coautores estão com a plataforma ou workspace aberto no momento.
* **Aspectos Técnicos:**
  * Reutilizar o canal Server-Sent Events (SSE) já existente no backend (`useSSEEventSource` / Redis Presence).
  * Repassar o mapa de usuários online para o `<UserAvatarStack members={currentMembers} onlineUserIds={onlineUserIds} />`.

---

## 📊 3. Destaque Visual de Status no Fluxo Sequencial de Etapas (`ArticleTimelineHeader`)
* **Descrição:** Aprimorar o componente de linha do tempo e governança (`ArticleTimelineHeader`) para dar maior destaque às etapas em andamento e status de Gatekeepers.
* **Objetivo de UX:** Tornar o avanço do artigo imediatamente inteligível à primeira vista.
* **Aspectos Técnicos:**
  * Adicionar indicadores de progresso percentual (tarefas concluídas vs. totais da etapa).
  * Adicionar chips/badges distintos para etapas em andamento, concluídas e aguardando aprovação institucional (NIT / Congresso Alvo).

---

## 📑 4. Hierarquia de Etapas & Subtarefas (Accordion & Fluxo de Revisão por Etapa)
* **Descrição:** Analisar a transição da tabela de tarefas para um modelo hierárquico com Accordion de Etapa (Etapa como Tarefa Pai / Seções TeX como Subtarefas).
* **Objetivo de UX & Governança:**
  * Facilitar a submissão de uma etapa completa para revisão do Revisor de Par ou parecer institucional do NIT.
  * Permitir que pareceres, comentários e sugestões de revisão inline do revisor fiquem vinculados diretamente à etapa e suas subtarefas.
* **Pontos de Refinamento:**
  * Mapeamento de modelo Prisma: Relação 1-para-N entre `ProjectStage` -> `Task` -> `SubTask`.
  * Visualização de diff TeX e comentários da revisão por sub-seção do artigo.

---

*Nota: Este documento serve como especificação inicial para refinamento e estimativa antes do desenvolvimento.*

