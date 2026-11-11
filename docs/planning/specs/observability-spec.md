# Especificação Técnica e Plano de Implementação: Observabilidade On-Premise Licença Zero

- **Documento:** `observability-spec.md`
- **Referência:** ADR 013
- **Status:** APROVADO
- **Alvo:** Frontend, Backend Fastify, AI Service (LangGraph/FastAPI), LaTeX Compiler, Infraestrutura On-Premise

---

## 1. Escopo e Objetivos

Esta especificação define o plano de entrega e os padrões técnicos para implantar a infraestrutura de observabilidade da plataforma SCIA, com as seguintes metas inegociáveis:
1. **100% Licença Zero:** Utilização exclusiva de softwares livres (Apache 2.0, MIT, AGPLv3).
2. **100% On-Premise:** Nenhuma chamada para serviços de terceiros; controle absoluto de dados sensíveis e artigos científicos.
3. **LLMOps com Opik:** Rastreabilidade nativa de grafos LangGraph com contagem de tokens, auditoria de prompts e custos.
4. **Visibilidade Fim a Fim:** Correlação entre requisições HTTP, logs, traces e métricas via `traceparent` (W3C).

---

## 2. Divisão de Responsabilidades e Componentes

| Serviço | Papel na Observabilidade | Ferramenta / Biblioteca | Métricas / Dados Emitidos |
| :--- | :--- | :--- | :--- |
| **Frontend** | RUM, erros de tela e latência de rede | `@sentry/react` $\rightarrow$ GlitchTip | JS crashes, Core Web Vitals, falhas de conexão |
| **Backend** | API REST, WebSocket, autoridade de dados | `fastify-metrics` + Pino + OTel Node SDK | RPS, HTTP 4xx/5xx, latência $p95$, Event Loop lag, conexões Prisma |
| **AI Service** | Grafo multi-agente, ferramentas científicas | `prometheus-fastapi-instrumentator` + `opik` + `loguru` | TTFT, nós do LangGraph, tokens/custo, throttles arXiv/S2/OpenAlex |
| **Compiler** | Worker de compilação LaTeX em sandbox | Coletor customizado + cgroups | Duração de compilação, consumo de CPU/RAM, erros TeX vs timeout |
| **Infra** | PostgreSQL, Redis, MinIO, Hosts K8s | Prometheus Exporters (`postgres-exporter`, etc.) | CPU, RAM, IOPS, locks, cache hit ratio, espaço em disco |

---

## 3. Topologia On-Premise (Docker Compose & Kubernetes)

### 3.1 Portas e Endpoints da Stack de Observabilidade

```
┌────────────────────────────────────────────────────────────────────────┐
│               SERVIÇOS DE OBSERVABILIDADE ON-PREMISE                   │
├────────────────────┬───────────┬──────────────┬────────────────────────┤
│ Serviço            │ Porta     │ Protocolo    │ Finalidade             │
├────────────────────┼───────────┼──────────────┼────────────────────────┤
│ Prometheus         │ 9090      │ HTTP         │ Raspagem de métricas   │
│ Grafana            │ 3001      │ HTTP (Web)   │ Dashboards e alertas   │
│ Grafana Loki       │ 3100      │ HTTP         │ Ingestão e query logs  │
│ Grafana Tempo      │ 3200/4317 │ HTTP / gRPC  │ Ingestão OTLP traces   │
│ Opik Server        │ 5173/8080 │ HTTP / Web   │ Traces e UI de LLMOps  │
│ GlitchTip Web/API  │ 8000      │ HTTP         │ Captura de erros       │
│ OpenTelemetry Coll │ 4317/4318 │ gRPC / HTTP  │ Receptor OTLP unificado│
└────────────────────┴───────────┴──────────────┴────────────────────────┤
```

---

## 4. Plano de Tarefas Detalhado (WBS)

### Fase 1: Fundação de Métricas & Erros Básicos
- [ ] **OBS-01:** Criar compose de infraestrutura `docker/docker-compose.observability.yml` contendo Prometheus, Grafana e GlitchTip.
- [ ] **OBS-02:** Adicionar `fastify-metrics` no Backend e expor rota interna segura `/metrics`.
- [ ] **OBS-03:** Adicionar `prometheus-fastapi-instrumentator` no `ai-service` e expor `/metrics`.
- [ ] **OBS-04:** Configurar Prometheus para raspar (`scrape`) Backend (`:3333/metrics`), AI Service (`:8000/metrics`) e Postgres Exporter.
- [ ] **OBS-05:** Conectar SDK do Sentry no Frontend (`@sentry/react`) apontando DSN para a instância local do GlitchTip.

### Fase 2: LLMOps com Opik no Motor de IA
- [ ] **OBS-06:** Adicionar o container oficial do **Opik** ao Docker Compose e manifests do Kubernetes.
- [ ] **OBS-07:** Instalar dependência Python `opik` no `ai-service` via `uv add opik`.
- [ ] **OBS-08:** Criar helper singleton em `app/core/opik_tracer.py` que instancia `OpikTracer` condicionado a `ENABLE_OPIK=true`.
- [ ] **OBS-09:** Plugar o callback em `app/api/v1/endpoints/chat.py` e `runs.py` nos métodos `graph.astream` e `graph.ainvoke`.
- [ ] **OBS-10:** Validar a captura de tokens, custos por modelo (Gemini vs GPT-4o vs Ollama) e passos de cada nó do LangGraph.

### Fase 3: Logs Estruturados & Grafana Loki
- [ ] **OBS-11:** Subir o Grafana Loki e o agente Promtail (ou Fluent Bit) no ambiente on-premise.
- [ ] **OBS-12:** Padronizar formato JSON no `pino` (Fastify) incluindo obrigatoriamente os campos: `trace_id`, `user_id`, `service`.
- [ ] **OBS-13:** Configurar interceptor no `ai-service` com `loguru` para propagar o `trace_id` em todos os nós dos subagentes.
- [ ] **OBS-14:** Criar dashboards no Grafana correlacionando volume de logs com picos de tráfego.

### Fase 4: Tracing Distribuído Fim a Fim (APM)
- [ ] **OBS-15:** Subir o Grafana Tempo e configurar o OpenTelemetry Collector como gateway.
- [ ] **OBS-16:** Injetar middleware no Fastify para ler/gerar cabeçalho `traceparent` W3C e repassar nas requisições HTTP para o `ai-service` e `compiler`.
- [ ] **OBS-17:** Configurar visualização no Grafana onde um clique em um log no Loki abre instantaneamente o trace correspondente no Tempo.

---

## 5. Arquivo Docker Compose de Referência (`infra/observability`)

```yaml
version: '3.8'

services:
  # 1. Painel Visual Centralizador
  grafana:
    image: grafana/grafana:11.2.0
    container_name: scia_grafana
    restart: unless-stopped
    ports:
      - "3001:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin_scia_local
      - GF_USERS_ALLOW_SIGN_UP=false
    volumes:
      - grafana_data:/var/lib/grafana

  # 2. Séries Temporais de Métricas
  prometheus:
    image: prom/prometheus:v2.54.0
    container_name: scia_prometheus
    restart: unless-stopped
    ports:
      - "9090:9090"
    command:
      - --config.file=/etc/prometheus/prometheus.yml
      - --storage.tsdb.retention.time=15d
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml:ro
      - prometheus_data:/prometheus

  # 3. Ingestão e Indexação de Logs
  loki:
    image: grafana/loki:3.1.1
    container_name: scia_loki
    restart: unless-stopped
    ports:
      - "3100:3100"
    command: -config.file=/etc/loki/local-config.yaml
    volumes:
      - loki_data:/loki

  # 4. Tracing Distribuído
  tempo:
    image: grafana/tempo:2.5.0
    container_name: scia_tempo
    restart: unless-stopped
    command: [ "-config.file=/etc/tempo.yaml" ]
    ports:
      - "3200:3200" # tempo
      - "4317:4317" # otlp grpc
      - "4318:4318" # otlp http
    volumes:
      - tempo_data:/var/tempo

  # 5. LLMOps — Opik Server (Comet) Licença Zero
  opik:
    image: cometml/opik:latest
    container_name: scia_opik
    restart: unless-stopped
    ports:
      - "5174:5173" # Interface Web do Opik
      - "8081:8080" # API do Opik
    environment:
      - DATABASE_URL=postgresql://postgres:postgres@postgres:5432/sci_latex_db?schema=opik
      - REDIS_URL=redis://redis:6379/2
    depends_on:
      - postgres
      - redis

  # 6. Crash Reporting (Alternativa Sentry AGPLv3)
  glitchtip:
    image: glitchtip/glitchtip:latest
    container_name: scia_glitchtip
    restart: unless-stopped
    ports:
      - "8005:8000"
    environment:
      - DATABASE_URL=postgresql://postgres:postgres@postgres:5432/sci_latex_db?schema=glitchtip
      - SECRET_KEY=scia-glitchtip-super-secret-key-1234
      - GLITCHTIP_DOMAIN=http://localhost:8005
      - DEFAULT_FROM_EMAIL=suporte@scia.local
    depends_on:
      - postgres
      - redis

volumes:
  grafana_data:
  prometheus_data:
  loki_data:
  tempo_data:
```

---

## 6. Governança e Retenção de Dados

* **Métricas Prometheus:** Retenção padrão de **15 dias** (suficiente para análise de tendências sem inflar o disco).
* **Logs Loki:** Retenção padrão de **14 dias** com expiração automática (*compactor retention*).
* **Traces Tempo:** Retenção padrão de **7 dias**.
* **Traces e Evals Opik:** Retenção permanente ou de **90 dias** para possibilitar comparações de evolução de acurácia dos modelos e análise de custos por semestre acadêmico.
