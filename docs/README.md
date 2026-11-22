# 📚 SCIA — Central de Documentação Técnica & Arquitetura

Bem-vindo ao portal unificado de documentação do **SCIA (Scientific Collaboration and Intelligent Assistance)**.  
Este diretório reúne as especificações de engenharia, decisões de arquitetura (ADRs), fluxos de produto, guias de observabilidade/infraestrutura e governança da plataforma.

---

## 🧭 Navegação Rápida: "O que você precisa?"

Encontre o documento certo para cada necessidade:

| Necessidade / Pergunta | Área | Documento Principal | Descrição |
| :--- | :--- | :--- | :--- |
| **"Onde o time parou e qual a tarefa imediata?"** | 📊 Planejamento | [`docs/planning/STATUS.md`](planning/STATUS.md) | **Checkpoint Oficial.** Estado atual do cluster, testes, última entrega e próximos passos. |
| **"Quais decisões arquiteturais já foram tomadas?"** | 🏛️ Arquitetura | [`docs/architecture/adrs/`](architecture/adrs/) | Catálogo completo de 19 ADRs (Editor OT, PgBouncer, AIOps Copilot, Topologia). |
| **"Qual o modelo de dados e tabelas do sistema?"** | 🏛️ Arquitetura | [`docs/architecture/database/DATABASE.md`](architecture/database/DATABASE.md) | ERD, Dicionário de Dados, enums, Prisma ORM e políticas de concorrência. |
| **"Como defender o Banco para DBAs e Especialistas?"** | 🏛️ Arquitetura | [`FAQ_BANCO_DE_DADOS_ESPECIALISTAS.md`](architecture/database/FAQ_BANCO_DE_DADOS_ESPECIALISTAS.md) | Respostas sobre PgBouncer, pooling, replicação, failover e Fencing Tokens. |
| **"Por que escolhemos PostgreSQL em vez de MongoDB?"** | 🏛️ Arquitetura | [`ANALISE_POSTGRES_VS_MONGODB_PACELC.md`](architecture/analysis/ANALISE_POSTGRES_VS_MONGODB_PACELC.md) | Análise formal de Teorema PACELC e requisitos ACID científicos. |
| **"Qual a visão do produto e régua das 6 etapas?"** | 🎯 Produto | [`docs/product/PRD.md`](product/PRD.md) | Product Requirements Document: personas, fluxos e validações obrigatórias. |
| **"Quais são todas as telas, modais e jornadas do app?"** | 🎯 Produto | [`docs/product/APP_FLOWS.md`](product/APP_FLOWS.md) | Mapeamento completo de telas, transições de estado e travas de segurança. |
| **"Quais os requisitos técnicos globais (TRD)?"** | 📐 Specs | [`docs/specs/TRD.md`](specs/TRD.md) | Requisitos não funcionais, SLOs, contratos de API e stack de execução. |
| **"Quais as cores, tipografia e tokens de UI?"** | 📐 Specs | [`docs/specs/design-system/DESIGN_SYSTEM.md`](specs/design-system/DESIGN_SYSTEM.md) | Diretrizes visuais, regras de Material UI e tokens Light/Dark. |
| **"Como subir a observabilidade on-premise?"** | 📚 Guias | [`guia-observabilidade.md`](guides/observability/guia-observabilidade.md) | Guia e tutorial completo de Prometheus, Loki, Tempo, OpenTelemetry e Opik. |
| **"Quais perguntas operacionais fazer ao AIOps Copilot?"** | 📚 Guias | [`GUIA_PERGUNTAS_AIOPS_COPILOT.md`](guides/aiops/GUIA_PERGUNTAS_AIOPS_COPILOT.md) | Catálogo com mais de 30 perguntas práticas de diagnóstico e RCA. |
| **"Qual o roadmap consolidado de entregas?"** | 📊 Planejamento | [`docs/planning/ROADMAP.md`](planning/ROADMAP.md) | Checklist mestre de entregas finalizadas e em andamento. |

---

## 🗂️ Estrutura de Diretórios da Documentação

A estrutura foi desenhada para refletir o ciclo de vida de desenvolvimento e separar decisões de implementação operacional:

```text
docs/
├── README.md                      <-- Portal Unificado de Documentação (Este Arquivo)
│
├── architecture/                  <-- 🏛️ Arquitetura de Software e Decisões
│   ├── adrs/                      <-- Architecture Decision Records (ADR-001 a ADR-019)
│   ├── analysis/                  <-- Análises de Trade-off (Postgres vs Mongo, Editor OT, Escalabilidade)
│   ├── database/                  <-- DATABASE.md (ERD) e FAQ_BANCO_DE_DADOS_ESPECIALISTAS.md
│   └── topology/                  <-- Relatórios de Comunicação Inter-Serviços e Segurança M2M
│
├── product/                       <-- 🎯 Visão de Produto, Requisitos e Negócio
│   ├── PRD.md                     <-- Documento de Requisitos de Produto
│   ├── APP_FLOWS.md               <-- Mapeamento de Telas, Fluxos e Jornadas de Usuário
│   └── guidelines/                <-- Diretrizes de Gestão de Produção Científica
│
├── specs/                         <-- 📐 Especificações Técnicas de Engenharia
│   ├── TRD.md                     <-- Documento de Requisitos Técnicos
│   ├── features/                  <-- Especificações por Feature (Topologia, SciAI, Literature, etc.)
│   └── design-system/             <-- DESIGN_SYSTEM.md e TRD_MATERIAL_UI_DESIGN_SYSTEM.md
│
├── planning/                      <-- 📊 Gestão de Projeto, Checkpoints e Status
│   ├── STATUS.md                  <-- Checkpoint Obrigatório de Retomada de Trabalho
│   ├── ROADMAP.md                 <-- Roadmap Consolidado de Fases e Entregas
│   ├── IMPLEMENTATION_PLAN.md     <-- Plano Mestre de Implementação (Fases I a VI)
│   ├── backlog/                   <-- Ideias e Refinamentos Futuros
│   ├── discussions/               <-- Rascunhos de Discussão e Pré-ADRs
│   └── reports/                   <-- Relatórios de Evolução e Marcos do Projeto
│
├── guides/                        <-- 📚 Runbooks, Tutoriais e Manuais Operacionais
│   ├── infrastructure/            <-- Guia de Infraestrutura On-Premises e K8s
│   ├── observability/             <-- Guia e Tutorial Prático de Monitoramento
│   └── aiops/                     <-- Catálogo de Perguntas Operacionais e Guia HERDR
│
└── assets/                        <-- 🎨 Imagens, Apresentações e Recursos Multimídia
    ├── images/                    <-- Imagens e Diagramas dos Documentos
    ├── media/                     <-- Demonstrações em Vídeo (.mp4)
    └── presentations/             <-- Slides (.md), Apresentações (.pptx) e Propostas (.pdf)
```

---

## 🏛️ 1. Arquitetura (`docs/architecture/`)

Reúne o raciocínio formal e técnico que sustenta a engenharia do SCIA:

* **[ADRs Oficiais](architecture/adrs/):**
  * [`ADR-007`](architecture/adrs/adr-007-collaborative-editor-architecture-scaling.md): Arquitetura Unificada do Editor Colaborativo, Fencing Monotônico e Persistência Resiliente (Especificação Viva: [`collaborative-editor-spec.md`](specs/collaborative-editor-spec.md)).
  * [`ADR-008`](architecture/adrs/adr-008-workflow-6-etapas-revisao-desacoplamento-git.md): Workflow Científico em 6 Etapas Fixas e Desacoplamento Git.
  * [`ADR-012`](architecture/adrs/adr-012-m2m-security-evolution.md): Autenticação M2M Criptográfica via JWT com Menor Privilégio.
  * [`ADR-013`](architecture/adrs/adr-013-observabilidade-on-premise-licenca-zero.md): Arquitetura de Observabilidade Licença Zero (Prometheus, Loki, Tempo, Opik, GlitchTip).
  * [`ADR-014`](architecture/adrs/adr-014-painel-admin-saude-e-metricas-aplicacao.md): SCIA Admin Center (Painel Administrativo de Métricas e Saúde).
  * [`ADR-015`](architecture/adrs/adr-015-postgresql-scalability-ha-pgbouncer-and-read-replicas.md): Escalabilidade Relacional, CloudNativePG, PgBouncer (:6543) e Réplicas.
  * [`ADR-016`](architecture/adrs/adr-016-scia-literature-intelligence-paper-analysis-and-react-flow.md): Inteligência da Literatura Científica e Mapas Mentais com React Flow.
  * [`ADR-017`](architecture/adrs/adr-017-latex-templates-governance-and-storage-architecture.md): Governança de Templates LaTeX e Storage Architecture.
  * [`ADR-018`](architecture/adrs/adr-018-aiops-copilot-mcp-root-cause-analysis-admin-center.md): AIOps Copilot com MCP, Agentes Especialistas e Governança HITL.
  * [`ADR-019`](architecture/adrs/adr-019-service-topology-visualizer-real-time-inter-service-telemetry-react-flow.md): Visualizador de Topologia de Microsserviços com Telemetria SSE em Tempo Real.
* **[Análises Comparativas](architecture/analysis/):**
  * [`ANALISE_POSTGRES_VS_MONGODB_PACELC.md`](architecture/analysis/ANALISE_POSTGRES_VS_MONGODB_PACELC.md): Trade-offs de Teorema PACELC, latência e consistência.
  * [`ANALISE_ESCALABILIDADE_RECUPERACAO_POSTGRES.md`](architecture/analysis/ANALISE_ESCALABILIDADE_RECUPERACAO_POSTGRES.md): Estratégia de failover, pooling e recuperação de desastres.
  * [`ANALISE_TECNICA_EDITOR_COLABORATIVO_SCIA.md`](architecture/analysis/ANALISE_TECNICA_EDITOR_COLABORATIVO_SCIA.md): Avaliação de OT vs CRDT, consumo de memória e latência do CodeMirror 6.
* **[Banco de Dados](architecture/database/):**
  * [`DATABASE.md`](architecture/database/DATABASE.md): Schema canônico (14 tabelas), relacionamentos, índices e convenções Prisma.
  * [`FAQ_BANCO_DE_DADOS_ESPECIALISTAS.md`](architecture/database/FAQ_BANCO_DE_DADOS_ESPECIALISTAS.md): Guia de defesa técnica para sabatinas com especialistas de dados.

---

## 🎯 2. Produto & Negócio (`docs/product/`)

* [`PRD.md`](product/PRD.md): Requisitos de Produto, personas (Autor, Revisor, Coordenador, Gerente e Administrador) e objetivos de negócio.
* [`APP_FLOWS.md`](product/APP_FLOWS.md): Mapeamento de fluxos, transições de status da esteira editorial e modais de interação.
* [`DIRETRIZES_GESTAO_PRODUCAO_CIENTIFICA_SCIA.md`](product/guidelines/DIRETRIZES_GESTAO_PRODUCAO_CIENTIFICA_SCIA.md): Regras de governança acadêmica e modelo de visualização única para gestão.

---

## 📐 3. Especificações Técnicas (`docs/specs/`)

* [`TRD.md`](specs/TRD.md): Technical Requirements Document abrangendo backend, frontend, worker TeX Live e contratos.
* **Especificações Técnicas de Engenharia (`docs/specs/`):**
  * [`service-topology-visualizer-spec.md`](specs/service-topology-visualizer-spec.md): Aba 6 de Topologia Inter-Serviços, React Flow e barramento SSE.
  * [`aiops-copilot-implementation-plan.md`](specs/aiops-copilot-implementation-plan.md): Plano de implementação do Copiloto de SRE e MCP.
  * [`literature-intelligence-spec.md`](specs/literature-intelligence-spec.md): Extração, análise e mapas mentais de literatura acadêmica com React Flow.
  * [`system-admin-health-dashboard-spec.md`](specs/system-admin-health-dashboard-spec.md): Dashboard administrativo do SCIA Admin Center.
  * [`observability-spec.md`](specs/observability-spec.md): Contratos de instrumentação, métricas e traces.
  * [`sciai-contracts-spec.md`](specs/sciai-contracts-spec.md): Contratos de integração REST e SSE do motor de inteligência artificial.
  * [`sciai-chat-copilot-spec.md`](specs/sciai-chat-copilot-spec.md): Agentes acadêmicos de assistência e chat copilot.
  * [`reviewer-view-spec.md`](specs/reviewer-view-spec.md): Interface especializada e ferramentas de revisão cega.
* **[Design System](specs/design-system/):**
  * [`DESIGN_SYSTEM.md`](specs/design-system/DESIGN_SYSTEM.md): Tokens globais de cor, espaçamento, tipografia e temas Dark/Light.
  * [`TRD_MATERIAL_UI_DESIGN_SYSTEM.md`](specs/design-system/TRD_MATERIAL_UI_DESIGN_SYSTEM.md): Requisitos técnicos de implementação com MUI v5/v6.

---

## 📊 4. Planejamento & Gestão (`docs/planning/`)

* [`STATUS.md`](planning/STATUS.md): **Fonte única da verdade sobre o estado atual do desenvolvimento.** Contém os checkpoints de sessão e hand-off de tarefas.
* [`ROADMAP.md`](planning/ROADMAP.md): Acompanhamento macro das fases e checklist de entregas concluídas.
* [`IMPLEMENTATION_PLAN.md`](planning/IMPLEMENTATION_PLAN.md): Fases estruturais do projeto e critérios de aceite.
* [`discussions/discursoes.md`](planning/discussions/discursoes.md): Espaço de rascunhos para tópicos abertos e debates preliminares.
* [`reports/RELATORIO_DEV_DESDE_25_OUTUBRO_2026.md`](planning/reports/RELATORIO_DEV_DESDE_25_OUTUBRO_2026.md): Histórico consolidado de evolução do repositório.

---

## 📚 5. Guias Operacionais & Runbooks (`docs/guides/`)

* **[Infraestrutura](guides/infrastructure/):**
  * [`GUIA_INFRAESTRUTURA_ON_PREMISES.md`](guides/infrastructure/GUIA_INFRAESTRUTURA_ON_PREMISES.md): Requisitos de hardware, topologia de rede e provisionamento local.
* **[Observabilidade](guides/observability/):**
  * [`guia-observabilidade.md`](guides/observability/guia-observabilidade.md): Guia unificado de monitoramento, princípios SRE das 5 camadas, tutorial de deploy e runbooks práticos.
* **[AIOps & Agentes](guides/aiops/):**
  * [`GUIA_PERGUNTAS_AIOPS_COPILOT.md`](guides/aiops/GUIA_PERGUNTAS_AIOPS_COPILOT.md): Guia prático de perguntas operacionais com exemplos para o operador.
  * [`GUIA_COMPLETO_HERDR.md`](guides/aiops/GUIA_COMPLETO_HERDR.md): Metodologia e arquitetura de execução hierárquica de agentes.

---

## 🎨 6. Assets & Recursos Visuais (`docs/assets/`)

* **[`images/`](assets/images/):** Diagramas conceituais, fluxos de rede, arquitetura do cluster e telas do sistema.
* **[`media/`](assets/media/):** Demonstrações em vídeo do editor colaborativo e da topologia de microsserviços.
* **[`presentations/`](assets/presentations/):** Apresentações institucionais (`.pptx`), proposta de literature intelligence (`.pdf`) e roteiros de slides (`slides.md`, `APRESENTACAO_SOLUCAO_E_ARQUITETURA.md`).

---

> [!TIP]
> **Fluxo de Atualização Obrigatório:** Toda alteração significativa de arquitetura, contrato ou funcionalidade deve ser refletida em [`docs/planning/STATUS.md`](planning/STATUS.md) e na documentação temática correspondente, conforme estabelecido no protocolo de desenvolvimento (`.agents/rules/workflow-status.md`).
