# 📚 Central de Planejamento & Documentação (`docs/planning`)

Bem-vindo à Central de Documentação e Planejamento do **SCIA — Scientific Collaboration and Intelligent Assistance**. Este diretório é a fonte única de verdade sobre arquitetura, requisitos de produto, status atual de desenvolvimento, regras de trabalho e histórico do projeto.

---

## 🚀 Resposta Rápida: Por Onde Começar?

Se você está procurando entender o projeto ou retomar uma tarefa, utilize os atalhos abaixo:

| Pergunta / Necessidade | Documento Principal | Descrição |
| :--- | :--- | :--- |
| **"Onde parei e como retomar o trabalho?"** | 📌 [`STATUS.md`](file:///home/gilson-russo/development/professional/sci-latex-vscode/docs/planning/STATUS.md) | **Ponto de Retomada.** Exibe o estado atual da aplicação, última task feita e próximos passos imediatos. |
| **"Qual é o nosso PRD e visão de produto?"** | 📄 [`PRD.md`](file:///home/gilson-russo/development/professional/sci-latex-vscode/docs/planning/PRD.md) | Visão geral do produto, personas, a régua das 6 etapas fixas e decisões de alto nível. |
| **"Quais os requisitos técnicos e de engenharia?"** | ⚙️ [`TRD.md`](file:///home/gilson-russo/development/professional/sci-latex-vscode/docs/planning/TRD.md) | **Documento de Requisitos Técnicos.** CodeMirror 6, OT, PostgreSQL, MinIO, SciAI, APIs e SLOs. |
| **"Quais são todos os fluxos e jornadas do app?"** | 🔄 [`APP_FLOWS.md`](file:///home/gilson-russo/development/professional/sci-latex-vscode/docs/planning/APP_FLOWS.md) | **Documento de Fluxos da Aplicação.** Jornadas, telas, estados, modais e gatekeepers. |
| **"O que já foi feito e quais as próximas tarefas?"** | 🗺️ [`ROADMAP.md`](file:///home/gilson-russo/development/professional/sci-latex-vscode/docs/planning/ROADMAP.md) | Checklist mestre de entregas consolidadas e frentes ativas. |
| **"Qual é a especificação do nosso Banco de Dados?"** | 🗄️ [`DATABASE.md`](../DATABASE.md) | **Especificação Técnica do Banco de Dados.** ERD, Dicionário de Dados, enums, cascading, Prisma e Redis. |
| **"Quais são os padrões do nosso Design System?"** | 🎨 [`DESIGN_SYSTEM.md`](../DESIGN_SYSTEM.md) | **SCIA Design System.** Tokens, cores (Light/Dark), tipografia, componentes e regras de UX. |
| **"Qual é o nosso Plano de Implementação Técnico?"** | 📋 [`IMPLEMENTATION_PLAN.md`](../IMPLEMENTATION_PLAN.md) | **Plano Mestre de Implementação.** Frentes de trabalho, marcos (M1 a M6), riscos, dependências e DoD. |

---

## 🗂️ Estrutura Organizada do Diretório

```
docs/planning/
├── README.md                   <-- Hub Central de Navegação (Este Arquivo)
├── STATUS.md                   <-- Estado Atual & Checkpoint de Retomada
├── PRD.md                      <-- Documento de Requisitos de Produto
├── TRD.md                      <-- Documento de Requisitos Técnicos
├── APP_FLOWS.md                <-- Documento de Fluxos da Aplicação & Jornadas
├── ROADMAP.md                  <-- Roadmap Mestre Consolidado
│
├── specs/                      <-- 📐 Especificações Técnicas e de Arquitetura
│   ├── reviewer-view-spec.md   (Especificação Técnica da Interface do Revisor)
│   ├── sciai-contracts-spec.md (Contratos de API, Máquina de Estados e Eventos SciAI)
│   └── sciai-chat-copilot-spec.md (Chat Copilot & Onboarding Multi-Agente)
│
├── adrs/                       <-- 🧠 Architecture Decision Records (ADRs)
│   ├── adr-007-collaborative-editor-architecture-scaling.md (Arquitetura, Persistência e Escalabilidade do Editor)
│   ├── adr-007.1-document-ownership-fencing-and-routing.md (Roteamento de Posse e Fencing Tokens contra Split-Brain)
│   ├── adr-008-workflow-6-etapas-revisao-desacoplamento-git.md (Workflow Oficial em 6 Etapas Fixas e Desacoplamento Git)
│   ├── adr-009-sciai-api-first-experimentation-and-service-enablement.md (Experimentação Headless via API e Habilitação do SciAI)
│   ├── adr-010-review-comment-persistence-and-db-alignment.md (Persistência Durável de ReviewComment e Alinhamento do Schema)

│
└── backlog/                    <-- 💡 Análises Pendentes e Ideias Futuras
    └── ideas/                  (Ideias para evolução de Frontend e UX)
```

---

## ⚙️ Diretrizes de Manutenção da Documentação

1. **Ao Concluir ou Alterar Funcionalidades:**
   * Atualize a seção *Onde Parei & Como Retomar* em [`STATUS.md`](STATUS.md).
   * Atualize os requisitos correspondentes em [`TRD.md`](TRD.md), [`DATABASE.md`](../DATABASE.md) e specs ativas.
   * Marque a entrega como concluída `[x]` no [`ROADMAP.md`](ROADMAP.md).
