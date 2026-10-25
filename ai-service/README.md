# 🧠 AI Service (`ai-service`) — Motor de IA Científica

Microserviço independente de Inteligência Artificial Científica da plataforma **SCIA**, orquestrado com **FastAPI** e **LangGraph**.

Responsável pela ideação acadêmica guiada, busca bibliográfica em repositórios científicos (OpenAlex, Semantic Scholar), curadoria de artigos, planejamento de cronograma e geração assistida de LaTeX.

---

## 🎯 Triagem Arquitetural: O que foi Trazido vs. O que foi Descartado

A integração do núcleo de IA foi realizada a partir do projeto de referência (`sci-project / sci-agent-backend`). Para garantir estabilidade, segurança e evitar dívida técnica, foi feito um processo criterioso de filtragem para trazer **apenas o motor de inteligência artificial**, mantendo toda a autoridade de negócio, autenticação e governança no backend principal (**Fastify + TypeScript**).

---

### O que foi Extraído e Refinado (O Núcleo de IA)
* **Grafo Multi-Agente em LangGraph (`app/agents/`):**
  * **Supervisor Geral (`supervisor.py`):** Orquestrador principal com transições baseadas em estado e intenção do usuário.
  * **Guia de Exploração / Ideação (`idea_refiner.py`):** Conduz o autor do tema genérico à pergunta de pesquisa, hipótese, metodologia e palavras-chave.
  * **Especialista de Busca (`search_specialist.py`):** Executa queries acadêmicas estruturadas e dispara interrupção (`interrupt`) para seleção humana.
  * **Curadoria & Roadmap (`curation.py`):** Gera resumos executivos dos papers selecionados e estrutura o cronograma de etapas com base no congresso-alvo.
  * **Redator LaTeX (`writer.py`):** Especializado em formatação e geração de propostas de diff LaTeX.
* **Ferramentas de Pesquisa Científica Resilientes (`app/agents/tools/`):**
  * **OpenAlex (`openalex.py`):** Integração com `httpx.AsyncClient` com connection pooling e semáforo para rate-limiting seguro.
  * **Semantic Scholar (`semantic_scholar.py`):** Integração assíncrona com backoff exponencial resiliente.
  * **Academic Search Facade (`academic_search.py`):** Orquestrador que consulta OpenAlex e faz fallback para Semantic Scholar e Tavily.
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
│   │   │   └── runs.py             # Contratos M2M assíncronos (/runs, /resume, /cancel)
│   │   └── router.py               # Roteador central da API v1
│   ├── agents/
│   │   ├── state.py                # OnboardingState e schemas tipados do LangGraph
│   │   ├── writer.py               # Redator especializado em LaTeX
│   │   ├── sub_agents/
│   │   │   ├── supervisor.py       # Supervisor geral do fluxo de criação
│   │   │   ├── idea_refiner.py     # Guia de Exploração (ideação científica)
│   │   │   ├── search_specialist.py# Especialista de Busca (OpenAlex/Scholar + interrupt)
│   │   │   └── curation.py         # Curadoria de artigos e roadmap de tarefas
│   │   └── tools/
│   │       ├── academic_search.py  # Facade de busca com fallback resiliente
│   │       ├── openalex.py         # Conector OpenAlex com semáforo e connection pooling
│   │       ├── semantic_scholar.py # Conector Semantic Scholar com retry
│   │       └── tavily_search.py    # Busca web Tavily
│   ├── core/
│   │   ├── config.py               # Configurações Pydantic com suporte a .env
│   │   └── llm.py                  # Fábrica multi-provedor (Gemini, OpenAI, Ollama)
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
