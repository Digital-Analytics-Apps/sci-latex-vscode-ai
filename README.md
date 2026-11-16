# SCIA — Scientific Collaboration and Intelligent Assistance 🚀

Repositório monorepo da plataforma de escrita científica e colaboração em tempo real **SCIA (SCI-LaTeX)**. Este repositório integra a aplicação de escrita acadêmica com um ecossistema completo de microsserviços, inteligência artificial científica e operacional (AIOps), poolers de conexão de alto desempenho e observabilidade on-premise de licença zero.

---

## 📁 Estrutura do Monorepo

```
sci-latex-vscode/
├── backend/              # API Principal (Node.js, Fastify, Prisma, TypeScript, OT Collab)
├── frontend/             # SPA Web (React 19, Vite, Material UI, CodeMirror 6, TypeScript)
├── ai-service/           # Microsserviço de IA (Python, FastAPI, LangGraph, AIOps Copilot)
├── compiler/             # Worker isolado de compilação LaTeX (TeXLive, Fastify)
├── infra/observability/  # Stack de Observabilidade On-Premise (Prometheus, Loki, Tempo, Alloy, OTel, Opik, GlitchTip)
├── k8s/                  # Orquestração Kubernetes (Manifestos de produção, KinD local e ArgoCD)
├── latex-templates/      # Templates oficiais de congressos (2026-ieee-conference.zip, ADR-017)
├── docs/                 # Documentação de arquitetura, guias operacionais e ADRs
├── scripts/              # Scripts utilitários de infraestrutura e túneis
└── package.json          # Configuração de npm Workspaces da raiz
```

---

## 🌐 Mapa de Serviços e Portas Locais

| Serviço | Porta | Descrição |
| :--- | :--- | :--- |
| **Frontend SPA** | `5173` | Interface do usuário e Editor Científico (Vite / React) |
| **Backend Fastify** | `3333` | API REST principal, WebSockets Collab e BFF Administrativo |
| **AI Service** | `8000` | Motor de IA Acadêmica e AIOps Copilot de SRE (FastAPI) |
| **Compiler Worker** | `4000` | Worker isolado de compilação TeXLive para PDF |
| **PostgreSQL 16** | `5432` | Banco relacional primário (`sci_latex_db` e `sci_aiops_db`) |
| **PgBouncer** | `6543` | Pooler de conexões em *Transaction Pooling* ([ADR-015](docs/planning/adrs/adr-015-postgresql-scalability-ha-pgbouncer-and-read-replicas.md)) |
| **Redis** | `6379` | Leases de documentos, presença de usuários e cache |
| **MinIO S3** | `9000 / 9001` | Object Storage para PDFs compilados, templates e evidências |
| **Grafana** | `3001` | Dashboards operacionais pré-configurados |
| **Prometheus** | `9090` | Coleta de métricas e séries temporais |
| **Loki** | `3100` | Agregação e consulta de logs com LogQL |
| **Tempo** | `3200` | Tracing distribuído compatível com OpenTelemetry |
| **GlitchTip** | `8005` | Monitoramento de erros e exceções de aplicação (compatível com Sentry) |
| **Opik LLMOps** | `5174 / 8081` | Observabilidade de agentes de IA, custos e avaliação de LLM |

---

## ⚡ npm Workspaces & Automação de Comandos

O projeto está configurado utilizando **npm Workspaces**. Isso permite instalar dependências e executar comandos no `backend` e `frontend` simultaneamente a partir da raiz, sem a necessidade de navegar entre pastas.

### 🛠️ Instalação das Dependências

Para instalar as dependências de todos os pacotes de uma só vez:

```bash
npm install
```

---

## 📜 Comandos Disponíveis na Raiz

### 🧹 Lint & Formatação de Código

Roda o linter e o formatador de código em todo o monorepo (`backend` + `frontend`):

| Comando | Descrição |
| :--- | :--- |
| `npm run lint` | Executa o ESLint no backend e no frontend |
| `npm run lint:fix` | Tenta corrigir os erros de lint automaticamente em ambos |
| `npm run format` | Executa o Prettier para formatar o código em ambos os projetos |
| `npm run format:check` | Verifica a formatação do código em ambos os projetos |

### 🚀 Desenvolvimento

| Comando | Descrição |
| :--- | :--- |
| `npm run dev:backend` | Inicia o servidor de desenvolvimento do backend (Porta 3333) |
| `npm run dev:frontend` | Inicia a aplicação web frontend em ambiente de desenvolvimento (Porta 5173) |

### 🔨 Build & Testes

| Comando | Descrição |
| :--- | :--- |
| `npm run build` | Compila os projetos de backend e frontend |
| `npm run test` | Executa os testes unitários e de integração de ambos os projetos |

---

## 🧠 Inteligência Operacional: AIOps Copilot & SRE (ADR-018)

O SCIA conta com um copiloto de SRE integrado diretamente ao **Admin Center** (`/admin`), capaz de correlacionar métricas, logs, eventos de contêineres e telemetria de banco de dados para diagnosticar causas-raiz (RCA) com governança **Human-in-the-Loop**:

- **SRE Supervisor Agent:** Orquestrador principal com Tool Calling nativo (zero regex).
- **Especialistas Operacionais:** Kubernetes/KinD, PostgreSQL 16 & PgBouncer (:6543), Loki (logs), Prometheus (métricas), GlitchTip (erros) e Opik (LLMOps).
- **Skills de Runtime Autocontidas:** Localizadas em `ai-service/app/agents/aiops/skills/` com carregamento granular por subtópico (`loader.py`), incluindo playbooks oficiais para `kubernetes-operations` e `postgresql-operations`.
- **Segurança M2M Criptográfica (ADR-012):** Comunicação entre serviços autenticada por tokens Bearer JWT assinados.

Consulte o [Guia de Perguntas Operacionais do AIOps Copilot](docs/GUIA_PERGUNTAS_AIOPS_COPILOT.md) para exemplos práticos de uso.

---

## 📖 Arquitetura e Decisões de Engenharia (ADRs)

Para entender os fundamentos de design e as garantias de conformidade do sistema:
- [ADR-018: AIOps Copilot no Admin Center com MCP, Agentes Especialistas e Governança HITL](docs/planning/adrs/adr-018-aiops-copilot-mcp-root-cause-analysis-admin-center.md)
- [ADR-015: Persistência Relacional, CloudNativePG, PgBouncer (:6543) e Réplicas no PostgreSQL 16](docs/planning/adrs/adr-015-postgresql-scalability-ha-pgbouncer-and-read-replicas.md)
- [ADR-014: SCIA Admin Center — Painel Administrativo de Observabilidade e Governança](docs/planning/adrs/adr-014-painel-admin-saude-e-metricas-aplicacao.md)
- [ADR-013: Observabilidade On-Premise Licença Zero (Prometheus, Loki, Tempo, Alloy, Opik, GlitchTip)](docs/planning/adrs/adr-013-observabilidade-on-premise-licenca-zero.md)
- [ADR-012: Evolução de Segurança M2M com JWT e Menor Privilégio](docs/planning/adrs/adr-012-m2m-security-evolution.md)
- [ADR-017: Governança de Templates LaTeX Oficiais e Storage Architecture](docs/planning/adrs/adr-017-latex-templates-governance-and-storage-architecture.md)

### Documentação de Módulos:
- [Documentação do AI Service](ai-service/README.md)
- [Documentação do Backend](backend/README.md)
- [Documentação do Frontend](frontend/README.md)
- [Documentação de Observabilidade](infra/observability/README.md)
- [Documentação de Kubernetes & KinD](k8s/README.md)
