# 🧠 AI Service (`ai-service`) — Motor de IA Científica

Microserviço independente de Inteligência Artificial Científica da plataforma **SCIA**, orquestrado com **FastAPI** e **LangGraph**.

Responsável pela ideação acadêmica guiada, busca bibliográfica em repositórios científicos (arXiv como prioritário, Semantic Scholar e OpenAlex), curadoria de artigos, cálculo do cronograma nas 6 etapas fixas institucionais e geração assistida de LaTeX.
---

## 🎯 Triagem Arquitetural: O que foi Trazido vs. O que foi Descartado

A integração do núcleo de IA foi realizada a partir do projeto de referência (`sci-project / sci-agent-backend`). Para garantir estabilidade, segurança e evitar dívida técnica, foi feito um processo criterioso de filtragem para trazer **apenas o motor de inteligência artificial**, mantendo toda a autoridade de negócio, autenticação e governança no backend principal (**Fastify + TypeScript**).

---

### O que foi Extraído e Refinado (O Núcleo de IA)
* **Grafo Multi-Agente em LangGraph (`app/agents/`):**
  * **Supervisor Geral (`supervisor.py`):** Orquestrador principal com transições baseadas em estado e intenção do usuário.
  * **Guia de Exploração / Ideação (`idea_refiner.py`):** Conduz o autor do tema genérico à pergunta de pesquisa, hipótese, metodologia e palavras-chave.
  * **Especialista de Busca (`search_specialist.py`):** Executa queries acadêmicas estruturadas (arXiv / S2 / OpenAlex) e dispara interrupção (`interrupt`) para seleção humana.
  * **Curadoria & Cronograma (`curation.py`):** Formula autonomamente título e abstract a partir do tema refinado, calcula a divisão de datas nas 6 etapas fixas institucionais e consolida a proposta de criação do projeto (sem criação artificial de tarefas por IA).
  * **Redator LaTeX (`writer.py`):** Especializado em formatação e geração de propostas de diff LaTeX.
* **Ferramentas de Pesquisa Científica Resilientes (`app/agents/tools/`):**
  * **arXiv (`arxiv.py`):** Conector padrão com semáforo unitário (`Semaphore(1)`), throttle mandatório de 3 segundos (conforme ToU oficial) e parser XML Atom 1.0 nativo.
  * **Semantic Scholar (`semantic_scholar.py`):** Conector assíncrono com backoff exponencial e semáforo para rate-limits públicos.
  * **OpenAlex (`openalex.py`):** Integração com `httpx.AsyncClient` com connection pooling e semáforo para rate-limiting seguro.
  * **Academic Search Facade (`academic_search.py`):** Orquestrador prioritário que consulta arXiv por padrão e faz fallback transparente para Semantic Scholar e OpenAlex.
* **Fábrica Multi-Provedor de LLM (`app/core/llm.py`):**
  * Suporte nativo e desacoplado a **Google Gemini** (`gemini-2.5-flash`), **OpenAI** (`gpt-4o`) e modelos locais via **Ollama**.
* **Streaming de Eventos em Tempo Real (`app/streaming/stream_processor.py`):**
  * Formatador de Server-Sent Events (SSE) limpo para alimentar a interface do chat copiloto e onboarding guiado.
* **Contratos M2M e Human-in-the-Loop (`app/api/v1/`):**
  * Endpoints `/chat/stream` e `/chat/resume` para o onboarding conversacional.
  * Endpoints `/runs`, `/resume` e `/cancel` para execuções assíncronas assentes no padrão ADR-006.

---

## 📁 Estrutura do Módulo

```
ai-service/
├── app/
│   ├── api/v1/
│   │   ├── endpoints/
│   │   │   ├── chat.py             # Streaming SSE para Onboarding & Copilot (/chat/stream, /chat/resume)
│   │   │   ├── runs.py             # Contratos M2M assíncronos (/runs, /resume, /cancel)
│   │   │   └── aiops.py            # Chat e diagnóstico de SRE (/aiops/chat com M2M JWT)
│   │   └── router.py               # Roteador central da API v1
│   ├── core/
│   │   ├── config.py               # Configurações Pydantic com suporte a .env
│   │   ├── llm.py                  # Fábrica multi-provedor (Gemini, OpenAI, Ollama)
│   │   ├── m2m_auth.py             # Autenticação M2M criptográfica via JWT (ADR-012)
│   │   └── opik_tracer.py          # LLMOps & rastreabilidade de traces com Opik
│   ├── agents/
│   │   ├── state.py                # OnboardingState e schemas tipados do LangGraph
│   │   ├── writer.py               # Redator especializado em LaTeX
│   │   ├── sub_agents/             # Domínio Acadêmico (Supervisor, Busca, Curadoria)
│   │   ├── tools/                  # Ferramentas científicas (arXiv, OpenAlex, Semantic Scholar)
│   │   └── aiops/                  # Domínio SRE / AIOps Copilot (ADR-018)
│   │       ├── sre_supervisor.py   # Supervisor geral de confiabilidade e síntese de RCA
│   │       ├── specialists/        # Especialistas K8s, PostgreSQL/PgBouncer, Loki, Prometheus
│   │       ├── tools/              # Clientes MCP nativos (Postgres, PgBouncer, K8s)
│   │       └── skills/             # Skills operacionais de runtime (loader.py, k8s, postgresql)
│   ├── streaming/
│   │   └── stream_processor.py     # Formatador de eventos Server-Sent Events (SSE)
│   └── main.py                     # Entrypoint FastAPI com probes de saúde (/health)
├── pyproject.toml
└── README.md
```

---

## 🚀 Como Executar Localmente com `uv`

O projeto utiliza o **`uv`** como gerenciador rápido e determinístico de ambiente e dependências.

### 1. Sincronizar o ambiente com o `uv`:
```bash
cd ai-service
uv sync
```
*Isso criará o `.venv` automaticamente e instalará todas as dependências com base no `uv.lock` em frações de segundo.*

### 2. Configurar variáveis de ambiente (`.env`):
```bash
cp .env.example .env
# Edite o arquivo com suas chaves (Gemini, OpenAI ou escape hatch Ollama)
```

### 3. Validar conexão com o modelo (Smoke Test):
```bash
uv run python scripts/smoke_llm.py
```

### 4. Iniciar o servidor de desenvolvimento:
```bash
uv run uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

### 5. Experimentar via Chat no Terminal (CLI Test Harness):
```bash
uv run python scripts/test_chat_cli.py
```

## 🔗 Endpoints Principais

* **Healthcheck:** `GET /health`
* **Chat Onboarding (SSE):** `POST /internal/v1/chat/stream`
* **Chat Resume (Human-in-the-Loop):** `POST /internal/v1/chat/resume`
* **Disparo M2M:** `POST /internal/v1/runs` (Header `X-Internal-Service-Key` obrigatório)
* **Retomada de Run:** `POST /internal/v1/runs/{run_id}/resume`
* **Cancelamento de Run:** `POST /internal/v1/runs/{run_id}/cancel`
* **AIOps SRE Copilot Chat (ADR-018):** `POST /internal/v1/aiops/chat` (Header `Authorization: Bearer <m2m_jwt>` obrigatório)

---

## 🛡️ Núcleo de Inteligência Operacional & SRE (ADR-018 & ADR-015)

Além do fluxo científico acadêmico, o `ai-service` hospeda o **AIOps Copilot**, um sistema multi-agente hierárquico voltado ao diagnóstico autônomo de causa-raiz (RCA), auditoria de telemetria e operação resiliente de infraestrutura.

### Arquitetura Multi-Agente de SRE (`app/agents/aiops/`):
- **SRE Supervisor Agent (`sre_supervisor.py`):** Triagem de incidentes, correlação cross-telemetria e síntese de laudos de RCA padronizados.
- **Especialistas de Ferramentas (Tool Calling nativo, sem regex):**
  - **K8s & Container Specialist (`specialists/k8s_specialist.py`):** Inspeciona pods, nós, exit codes (OOMKilled 137, CrashLoopBackOff), KinD e Docker Compose fallback.
  - **PostgreSQL 16 & PgBouncer Specialist (`specialists/postgres_specialist.py`):** Monitora pools na porta 6543 (`cl_waiting == 0`), cache hit ratio (>99%), queries lentas (>2s) e travas (`pg_locks`) conforme a [ADR-015](file:///mnt/c0b6217c-c2f3-4c1f-8ba2-c8d177f718a9/development/professional/sci-latex-vscode/docs/planning/adrs/adr-015-postgresql-scalability-ha-pgbouncer-and-read-replicas.md).
- **Ferramentas MCP Read-Only (`app/agents/aiops/tools/`):**
  - `postgres_inspect_health`, `postgres_check_slow_queries_and_locks`, `pgbouncer_inspect_pools`.
  - `k8s_inspect_environment`, `k8s_get_node_status`.
- **Skills de Runtime Autocontidas com Lazy Loading (`app/agents/aiops/skills/`):**
  - `loader.py`: Carregador em memória com cache (`@lru_cache`) e suporte a leitura pontual por subtópico (`read_operational_skill(skill_name, topic=...)`), prevenindo sobrecarga de contexto na LLM.
  - `kubernetes-operations/`: 19 arquivos modulares (`knowledge/`, `diagnostics/`, `workflows/`, `references/`).
  - `postgresql-operations/`: 25 arquivos modulares (`references/`, `diagnostics/`, `workflows/`, `sql/`, `schemas/`).
- **Segurança M2M Criptográfica (`app/core/m2m_auth.py` — ADR-012):**
  - Validação estrita de tokens JWT assinados com HS256 (`type: 'SERVICE'`, `sub: 'service:aiops'`, `scopes: ['aiops:chat']`, `actor: { userId, email }`). Chamadas sem token válido são rejeitadas com HTTP 401.
