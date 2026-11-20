# 📊 Stack de Observabilidade On-Premise Licença Zero (ADR-013)

Esta pasta contém toda a infraestrutura necessária para monitoramento, métricas, logs, traces distribuídos, LLMOps e monitoramento de erros da **Plataforma SCIA**, em estrita conformidade com a **ADR-013** e a especificação técnica [`observability-spec.md`](../../docs/specs/observability-spec.md).

---

## 🏗️ Topologia da Stack Completa

```
                             ┌───────────────────┐
                             │  Grafana (3001)   │
                             └─────────▲─────────┘
                                       │
            ┌──────────────────────────┼──────────────────────────┐
            │                          │                          │
   ┌────────┴────────┐        ┌────────┴────────┐        ┌────────┴────────┐
   │Prometheus (9090)│        │   Loki (3100)   │        │   Tempo (3200)  │
   └────────▲────────┘        └────────▲────────┘        └────────▲────────┘
            │                          │                          │
     [/metrics HTTP]              [Log Ingestion]             [OTLP Traces]
            │                          │                          │
   ┌────────┴────────┐        ┌────────┴────────┐        ┌────────┴────────┐
   │ • Fastify (3333)│        │  Grafana Alloy  │        │  OTel Collector │
   │ • FastAPI (8000)│        │ (Docker Stdout) │        │ (Tail-Sampling) │
   │ • Compiler(4000)│        │ (Structured Met)│        │ (Port 4317/4318)│
   └─────────────────┘        └─────────────────┘        └─────────────────┘
            │                          │                          │
   ┌────────┴────────┐        ┌────────┴────────┐        ┌────────┴────────┐
   │  GlitchTip(8005)│        │ Opik UI (5174)  │        │ Opik API (8081) │
   │ (Exception Sentry)│      │(LLMOps Dashboard)│       │ (MySQL + ClickH)│
   └─────────────────┘        └─────────────────┘        └─────────────────┘
```

---

## 🚀 Como Iniciar

1. Certifique-se de que o Docker e Docker Compose estão ativos na sua máquina.
2. (Opcional) Copie o arquivo de exemplo de variáveis para customizar credenciais locais:
   ```bash
   cp infra/observability/.env.example infra/observability/.env
   ```
3. Na raiz do repositório ou no diretório `infra/observability`, execute:
   ```bash
   docker compose -f infra/observability/docker-compose.yml up -d
   ```
4. Verifique o status dos 11 contêineres:
   ```bash
   docker compose -f infra/observability/docker-compose.yml ps
   ```

---

## 🌐 Portas e Acessos Locais

| Serviço | Porta | Descrição | Credenciais / Notas |
| :--- | :---: | :--- | :--- |
| **Grafana** | `3001` | Painel visual unificado (Métricas + Logs + Traces) | `admin` / `${GRAFANA_ADMIN_PASSWORD:-admin_scia_local}` |
| **Prometheus** | `9090` | Banco de séries temporais TSDB | Scraping ativo a cada 10s-15s |
| **Grafana Loki** | `3100` | Ingestão e consulta de logs com Structured Metadata | Não indexa strings gigantes |
| **Grafana Alloy** | `12345` | Agente unificado coletando stdout dos contêineres | Dashboard interno de pipelines |
| **OTel Collector** | `4317` (gRPC)<br>`4318` (HTTP)<br>`8889` (Prometheus) | Gateway OpenTelemetry com processador de *tail-sampling* | Retenção 100% de erros e rotas críticas |
| **Grafana Tempo** | `3200` | Rastreamento distribuído de requisições W3C | Integrado com Loki e Grafana |
| **Opik Frontend (UI)** | `5174` | Interface visual de LLMOps (prompts, tokens, grafos de agentes) | UI acessível via navegador em `http://localhost:5174` |
| **Opik Backend (API)** | `8081` | Endpoint de ingestão de telemetria de IA do Comet-ML | API REST e JDBC com MySQL + ClickHouse |
| **GlitchTip** | `8005` | Monitoramento e gestão de exceções (compatível com Sentry SDK) | Single-process moderno web + task worker integrado |

---

## 📈 Endpoints de Métricas dos Serviços (`/metrics`)

Todos os microsserviços da plataforma já expõem métricas no formato padrão Prometheus:

* **Backend Fastify:** `http://localhost:3333/metrics`
  * Métricas de sistema (CPU, memória, event loop lag, GC).
  * Métricas HTTP: `scia_backend_http_requests_total`, `scia_backend_http_request_duration_seconds`.
  * Métricas colaborativas: `scia_backend_collab_active_rooms`, `scia_backend_collab_connected_sockets`, `scia_backend_collab_pending_checkpoints`.
* **AI Service (FastAPI):** `http://localhost:8000/metrics`
  * Métricas HTTP: `http_requests_total`, `http_request_duration_seconds`, `scia_ai_requests_inprogress`.
  * Métricas do interpretador Python e sistema.
* **Compiler LaTeX (Fastify Worker):** `http://localhost:4000/metrics`
  * Métricas de compilação: `scia_compiler_jobs_total{status="success|compilation_error|internal_error"}`.
  * Duração de compilações: `scia_compiler_duration_seconds`.
  * Trabalhos em andamento: `scia_compiler_active_jobs`.
