# 📚 Central de Planejamento & Documentação (`docs/planning`)

Bem-vindo à Central de Documentação e Planejamento do **`sci-latex-vscode`**. Este diretório é a fonte única de verdade sobre arquitetura, requisitos de produto, status atual de desenvolvimento, regras de trabalho e histórico do projeto.

---

## 🚀 Resposta Rápida: Por Onde Começar?

Se você está procurando entender o projeto ou retomar uma tarefa, utilize os atalhos abaixo:

| Pergunta / Necessidade | Documento Principal | Descrição |
| :--- | :--- | :--- |
| **"Onde parei e como retomar o trabalho?"** | 📌 [`STATUS.md`](file:///home/gilson-russo/development/professional/sci-latex-vscode/docs/planning/STATUS.md) | **Ponto de Retomada.** Exibe o estado atual da aplicação, última task feita e próximos passos imediatos. |
| **"Qual é o nosso PRD e visão de produto?"** | 📄 [`PRD.md`](file:///home/gilson-russo/development/professional/sci-latex-vscode/docs/planning/PRD.md) | Visão geral do produto, personas, as 7 fases do ciclo de vida do artigo e decisões de alto nível. |
| **"O que já foi feito e quais as próximas tarefas?"** | 🗺️ [`ROADMAP.md`](file:///home/gilson-russo/development/professional/sci-latex-vscode/docs/planning/ROADMAP.md) | Checklist mestre de pendências e funcionalidades concluídas (Blocos 1 ao 5). |
| **"Quais as regras de Git, Jira e Código?"** | 🛠️ [`WORKFLOW.md`](file:///home/gilson-russo/development/professional/sci-latex-vscode/docs/planning/WORKFLOW.md) | Regras de nomeação de branches, padrões de commit, ciclo no Jira (Fazendo -> Feito) e suíte de testes. |

---

## 🗂️ Estrutura Organizada do Diretório

```
docs/planning/
├── README.md                   <-- Hub Central de Navegação (Este Arquivo)
├── STATUS.md                   <-- Estado Atual & Checkpoint de Retomada
├── PRD.md                      <-- Documento de Requisitos de Produto
├── ROADMAP.md                  <-- Roadmap Mestre & Checklist Concluído vs Pendente
├── WORKFLOW.md                 <-- Guia de Contribuição, Git, Jira & Testes
│
├── specs/                      <-- 📐 Especificações Técnicas e de Arquitetura
│   ├── system-specs.md         (Especificações do Sistema, DB, Auth, Workflow & APIs)
│   ├── architecture-plan.md    (Planejamento de Arquitetura & Infra K8s)
│   ├── backend-specs.md        (Especificação de Módulos & Controllers Backend)
│   ├── frontend-specs.md       (Especificação de Componentes & Services Frontend)
│   ├── git-service-spec.md     (Integração com Token de Serviço Git)
│   ├── github-projects-architecture.md (Integração Native GitHub Projects & Webhooks)
│   └── reviewer-view-spec.md   (Especificação Técnica da Interface do Revisor)
│
├── adrs/                       <-- 🧠 Architecture Decision Records (ADRs)
│   ├── adr-001-github-user-access.md
│   ├── adr-002-kubernetes-on-demand-pods.md
│   ├── adr-003-user-git-workspace-flow.md
│   ├── adr-004-redis-pod-lifecycle-heartbeat.md
│   └── parecer-tecnico-code-server-coder.md
│
├── reports/                    <-- 📈 Relatórios de Execução (Fases & Sprints)
│   ├── relatorio-fase-1.md     (Módulo GitHub Integration & Webhook Inbox)
│   ├── relatorio-fase-2.md     (Front-end Setup & Local Projections)
│   ├── relatorio-fase-3.md     (Work Item Branches & Fluxo NIT)
│   ├── relatorio-fase-4.md     (Integração Tasks + Projeções & SSE em Tempo Real)
│   └── backend-sprint-*.md     (Histórico de Sprints 1 a 4 do Backend)
│
└── backlog/                    <-- 💡 Análises Pendentes e Ideias Futuras
    ├── analisar.md             (Dívidas de UX, Tela pós-merge e Kanban dinâmico)
    └── ideas/                  (Ideias para evolução de Workspace e Frontend)
```

---

## ⚙️ Como Atualizar esta Documentação

1. **Ao Iniciar uma Tarefa:**
   * Altere a issue no Jira para **`Fazendo`** (`ID 21`) e crie a branch Git (`feature/SLV-X-...`).
   * Consulte o [`STATUS.md`](file:///home/gilson-russo/development/professional/sci-latex-vscode/docs/planning/STATUS.md) para confirmar o contexto.
2. **Ao Finalizar/Pausar a Sessão:**
   * Atualize a seção *Onde Parei* em [`STATUS.md`](file:///home/gilson-russo/development/professional/sci-latex-vscode/docs/planning/STATUS.md).
   * Se a funcionalidade foi concluída, marque `[x]` no [`ROADMAP.md`](file:///home/gilson-russo/development/professional/sci-latex-vscode/docs/planning/ROADMAP.md), faça a transição no Jira para **`Feito`** (`ID 31`) e abra o PR via GitHub MCP.
