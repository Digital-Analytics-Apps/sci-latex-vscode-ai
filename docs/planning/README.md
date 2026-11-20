# 📚 Central de Planejamento & Gestão (`docs/planning`)

Bem-vindo à Central de Gestão e Planejamento do **SCIA — Scientific Collaboration and Intelligent Assistance**.  
Este diretório é a fonte única de verdade sobre status de desenvolvimento, checkpoints de sessão, roadmap, regras de trabalho e histórico do projeto.

---

## 🚀 Resposta Rápida: Por Onde Começar?

Se você está procurando entender o projeto ou retomar uma tarefa, utilize os atalhos abaixo:

| Pergunta / Necessidade | Documento Principal | Descrição |
| :--- | :--- | :--- |
| **"Onde parei e como retomar o trabalho?"** | 📌 [`STATUS.md`](STATUS.md) | **Ponto de Retomada.** Exibe o estado atual da aplicação, última task feita e próximos passos imediatos. |
| **"Qual é o nosso PRD e visão de produto?"** | 📄 [`PRD.md`](../product/PRD.md) | Visão geral do produto, personas, a régua das 6 etapas fixas e decisões de alto nível. |
| **"Quais os requisitos técnicos e de engenharia?"** | ⚙️ [`TRD.md`](../specs/TRD.md) | **Documento de Requisitos Técnicos.** CodeMirror 6, OT, PostgreSQL, MinIO, SciAI, APIs e SLOs. |
| **"Quais são todos os fluxos e jornadas do app?"** | 🔄 [`APP_FLOWS.md`](../product/APP_FLOWS.md) | **Documento de Fluxos da Aplicação.** Jornadas, telas, estados, modais e gatekeepers. |
| **"O que já foi feito e quais as próximas tarefas?"** | 🗺️ [`ROADMAP.md`](ROADMAP.md) | Checklist mestre de entregas consolidadas e frentes ativas. |
| **"Qual é o nosso Plano de Implementação Técnico?"** | 📋 [`IMPLEMENTATION_PLAN.md`](IMPLEMENTATION_PLAN.md) | **Plano Mestre de Implementação.** Frentes de trabalho, marcos (M1 a M6), riscos e DoD. |
| **"Qual é a especificação do nosso Banco de Dados?"** | 🗄️ [`DATABASE.md`](../architecture/database/DATABASE.md) | **Especificação Técnica do Banco de Dados.** ERD, Dicionário de Dados, enums e Prisma. |
| **"Como defender o Banco de Dados para Especialistas?"** | 🛡️ [`FAQ_BANCO_DE_DADOS_ESPECIALISTAS.md`](../architecture/database/FAQ_BANCO_DE_DADOS_ESPECIALISTAS.md) | **Guia de Defesa & FAQ para DBAs.** Capacidade, PgBouncer, HA e Fencing Tokens. |
| **"Quais são os padrões do nosso Design System?"** | 🎨 [`DESIGN_SYSTEM.md`](../specs/design-system/DESIGN_SYSTEM.md) | **SCIA Design System.** Tokens, cores (Light/Dark), tipografia e componentes. |
| **"Como os serviços comunicam-se e qual a segurança?"** | 🔒 [`RELATORIO_COMUNICACAO_INTER_SERVICOS_E_SEGURANCA.md`](../architecture/topology/RELATORIO_COMUNICACAO_INTER_SERVICOS_E_SEGURANCA.md) | **Relatório de Comunicação Inter-Serviços.** Diagnóstico M2M, Compiler, MinIO e segurança. |

---

## 🗂️ Estrutura do Diretório de Planejamento

```text
docs/planning/
├── README.md                   <-- Hub de Planejamento e Gestão (Este Arquivo)
├── STATUS.md                   <-- Estado Atual & Checkpoint de Retomada Obrigatório
├── ROADMAP.md                  <-- Roadmap Mestre Consolidado
├── IMPLEMENTATION_PLAN.md      <-- Plano Mestre de Implementação (Fases I a VI)
├── PLAN_FRONTEND_EDITORIAL_DESIGN.md <-- Plano de Evolução do Frontend
│
├── discussions/                <-- 💬 Rascunhos e Debates Preliminares (discursoes.md)
├── reports/                    <-- 📑 Relatórios de Evolução e Histórico
└── backlog/                    <-- 💡 Análises Pendentes e Ideias Futuras
    └── ideas/                  (Ideias para evolução de Frontend e UX)
```

> [!NOTE]
> **Onde encontrar os demais documentos estruturantes (sem duplicações):**
> * O **PRD** e **APP_FLOWS** estão na pasta de produto: [`docs/product/`](../product/).
> * As **ADRs (001 a 019)** estão na pasta de arquitetura: [`docs/architecture/adrs/`](../architecture/adrs/).
> * As **especificações técnicas de engenharia** e o **TRD** estão em: [`docs/specs/`](../specs/).

---

## ⚙️ Diretrizes de Manutenção da Documentação

1. **Ao Concluir ou Alterar Funcionalidades:**
   * Atualize a seção *Onde Parei & Como Retomar* em [`STATUS.md`](STATUS.md).
   * Atualize os requisitos correspondentes em [`../specs/TRD.md`](../specs/TRD.md), [`../architecture/database/DATABASE.md`](../architecture/database/DATABASE.md) e specs ativas em [`../specs/`](../specs/).
   * Marque a entrega como concluída `[x]` no [`ROADMAP.md`](ROADMAP.md).
