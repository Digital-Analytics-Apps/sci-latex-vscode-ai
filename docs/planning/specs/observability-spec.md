# Especificação Técnica e Plano de Implementação: Observabilidade Open Source e Soberania Institucional

- **Documento:** `observability-spec.md`
- **Referência:** ADR 013 (Revisão Técnica Incorporada)
- **Status:** APROVADO
- **Alvo:** Frontend, Backend Fastify, AI Service (LangGraph/FastAPI), LaTeX Compiler, Infraestrutura On-Premise

---

## 1. Escopo e Diretrizes Arquiteturais

Esta especificação define o plano de implementação técnica da observabilidade para a plataforma SCIA, incorporando as recomendações de confiabilidade, segurança e dimensionamento:

1. **Soberania da Infraestrutura de Telemetria:** Coleta, processamento, logs, traces, métricas e dados de LLMOps são armazenados exclusivamente na infraestrutura institucional on-premise.
2. **Separação de Tráfego:** A telemetria local não se confunde com o tráfego de aplicação destinado a provedores externos (arXiv, S2, OpenAlex, Gemini, GPT-4o), o qual segue governança separada de classificação de dados (ADR-012).
3. **Pipeline Unificado de Coleta:** Instrumentação via OpenTelemetry SDK, coleta de logs do host e pods via **Grafana Alloy** (substituindo Promtail), e processamento/exportação via **OpenTelemetry Collector**.
4. **LLMOps com Opik Correlacionado ao Tempo:** O `OpikTracer` recebe explicitamente o `trace_id` do W3C Trace Context, possibilitando saltar do span de rede no Grafana Tempo diretamente para o nó do agente no Opik.
5. **Logs com Structured Metadata no Loki:** Índices baseados apenas em labels de baixa cardinalidade (`service`, `environment`, `level`), mantendo identificadores como `trace_id`, `user_id` e `article_id` como *Structured Metadata*.
6. **Proteção Gradual de Prompts:** 3 níveis de registro no Opik para impedir vazamento de manuscritos e resultados de pesquisa inéditos.

---

## 2. Divisão de Responsabilidades e Componentes

| Serviço | Papel na Observabilidade | Instrumentação / Agente | Métricas & Telemetria Emitida |
| :--- | :--- | :--- | :--- |
| **Frontend** | RUM, erros de tela e exceções React | `@sentry/react` (sanitizado) $\rightarrow$ GlitchTip | JS crashes com source maps, Core Web Vitals, falhas de rede |
| **Backend** | API REST, WebSocket, autoridade de dados | `fastify-metrics` + Pino JSON + OTel Node SDK | RPS, erros 5xx/4xx, latência $p95$, Event Loop lag, pool Prisma |
| **AI Service** | Grafo multi-agente, ferramentas científicas | `prometheus-fastapi-instrumentator` + `opik` + `loguru` | TTFT, tempo por nó LangGraph, tokens/custos, throttles de APIs |
| **Compiler** | Worker de compilação LaTeX em sandbox | Exporter TeX + leitura cgroups | Duração por motor, fila de jobs, timeouts (30s kill), falhas TeX |
| **Host & K8s** | Nós, pods, containers, infraestrutura | **Grafana Alloy** + Node Exporter | CPU, RAM, IOPS de disco, restarts de pods (OOMKilled) |

---

## 3. Topologia On-Premise e Mapeamento de Portas

```
┌────────────────────────────────────────────────────────────────────────┐
│               SERVIÇOS DE OBSERVABILIDADE ON-PREMISE                   │
├────────────────────┬───────────┬──────────────┬────────────────────────┤
│ Serviço            │ Porta     │ Protocolo    │ Finalidade             │
├────────────────────┼───────────┼──────────────┼────────────────────────┤
│ Prometheus         │ 9090      │ HTTP         │ Scraping e TSDB métric.│
│ Grafana            │ 3001      │ HTTP (Web)   │ Dashboards e alertas   │
│ Grafana Loki       │ 3100      │ HTTP         │ Ingestão de logs       │
│ Grafana Tempo      │ 3200/4317 │ HTTP / gRPC  │ Ingestão OTLP traces   │
│ Grafana Alloy      │ 12345     │ HTTP         │ Agente unificado logs  │
│ Opik Server        │ 5174/8081 │ HTTP / Web   │ UI e API do Opik       │
│ GlitchTip Web/API  │ 8005      │ HTTP         │ Captura de exceções    │
│ OpenTelemetry Coll │ 4317/4318 │ gRPC / HTTP  │ Gateway OTLP unificado │
└────────────────────┴───────────┴──────────────┴────────────────────────┤
```

---

## 4. Contratos de Telemetria e Padrões Técnicos

### 4.1 Contrato de Correlação W3C Trace Context (Tempo ↔ Opik)
Toda requisição HTTP recebida pelo Fastify e repassada ao `ai-service` propaga o header:
`traceparent: 00-{trace_id}-{parent_id}-{trace_flags}`.

No `ai-service`:
```python
# app/core/opik_tracer.py
from opik.integrations.langchain import OpikTracer
from opentelemetry import trace

def get_correlated_opik_tracer(conversation_id: str, article_id: str | None = None) -> OpikTracer:
    # 1. Extrai o trace_id do contexto ativo do OpenTelemetry
    current_span = trace.get_current_span()
    ctx = current_span.get_span_context() if current_span else None
    otel_trace_id = format(ctx.trace_id, "032x") if ctx and ctx.trace_id else "unknown"

    # 2. Injeta nos metadados do OpikTracer para cruzamento bidirecional
    return OpikTracer(
        project_name="scia-academic-copilot",
        metadata={
            "trace_id": otel_trace_id,          # Chave de busca no Tempo
            "conversation_id": conversation_id,  # Sessão do pesquisador
            "article_id": article_id or "n/a",  # Projeto acadêmico
        }
    )
```

### 4.2 Contrato de Logs Estruturados no Loki
O formato emitido por `pino` (Node.js) e `loguru` (Python) para a saída padrão (`stdout`) deve respeitar:

```json
{
  "timestamp": "2026-11-10T22:30:00.123Z",
  "level": "error",
  "service": "backend",
  "environment": "production",
  "trace_id": "4bf92f3577b34da6a3ce929d0e0e4736",
  "span_id": "00f067aa0ba902b7",
  "user_id": "usr_9981",
  "article_id": "art_1024",
  "message": "LaTeX compilation job timed out after 30s",
  "error": {
    "name": "CompilationTimeoutError",
    "stack": "Error: Compilation exceeded limit..."
  }
}
```
* **Labels atribuídos pelo Grafana Alloy:** `service="backend"`, `environment="production"`, `level="error"`.
* **Structured Metadata gravados pelo Loki:** `trace_id`, `span_id`, `user_id`, `article_id`.

### 4.3 Métricas Específicas do Compilador LaTeX
O worker de compilação expõe as seguintes métricas no padrão Prometheus:
* `compiler_jobs_total{engine="pdflatex|xelatex", status="success|error|timeout"}`
* `compiler_jobs_active`: Medidor instantâneo de compilações em curso.
* `compiler_job_duration_seconds`: Histograma de duração (`buckets: [0.5, 1, 2, 5, 10, 20, 30]`).
* `compiler_queue_size`: Número de compilações aguardando worker livre.
* `compiler_timeout_total`: Contagem de processos abortados via `SIGKILL` aos 30s.

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

  # 4. Agente Unificado de Coleta (Substitui Promtail)
  alloy:
    image: grafana/alloy:v1.3.0
    container_name: scia_alloy
    restart: unless-stopped
    command: run --server.http.listen-addr=0.0.0.0:12345 /etc/alloy/config.alloy
    volumes:
      - ./config.alloy:/etc/alloy/config.alloy:ro
      - /var/run/docker.sock:/var/run/docker.sock:ro
      - /var/log:/var/log:ro
    ports:
      - "12345:12345"

  # 5. Tracing Distribuído
  tempo:
    image: grafana/tempo:2.5.0
    container_name: scia_tempo
    restart: unless-stopped
    command: [ "-config.file=/etc/tempo.yaml" ]
    ports:
      - "3200:3200"
      - "4317:4317"
      - "4318:4318"
    volumes:
      - tempo_data:/var/tempo

  # 6. LLMOps — Opik Server (Comet)
  opik:
    image: cometml/opik:latest
    container_name: scia_opik
    restart: unless-stopped
    ports:
      - "5174:5173"
      - "8081:8080"
    environment:
      - DATABASE_URL=postgresql://postgres:postgres@postgres:5432/sci_latex_db?schema=opik
      - REDIS_URL=redis://redis:6379/2
    depends_on:
      - postgres
      - redis

  # 7. Gestão de Exceções (GlitchTip)
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

## 6. Plano de Tarefas Detalhado em 5 Fases (WBS)

### Fase 1: Fundação & Pipeline de Telemetria
- [ ] **OBS-01:** Configurar e implantar o **Grafana Alloy** (`config.alloy`) para leitura de logs do Docker/K8s e envio ao Loki com extração de *Structured Metadata*.
- [ ] **OBS-02:** Implantar o **OpenTelemetry Collector** com receptores OTLP gRPC/HTTP e exportadores para Prometheus e Tempo.
- [ ] **OBS-03:** Padronizar formato de log JSON no Backend Fastify (`pino`) e no AI Service (`loguru`), validando que `trace_id` e `span_id` sejam obtidos do contexto OTel ativo.

### Fase 2: Observabilidade Operacional (Métricas, Logs e Traces)
- [ ] **OBS-04:** Configurar Prometheus com retenção de 15 dias em PVC persistente e scraping dos endpoints `/metrics` do Fastify e FastAPI.
- [ ] **OBS-05:** Configurar Grafana Loki utilizando MinIO S3 para armazenamento de chunks e retenção de 14 dias via compactor.
- [ ] **OBS-06:** Configurar Grafana Tempo com armazenamento no MinIO e retenção de 7 dias.
- [ ] **OBS-07:** Implementar métricas especializadas do compilador LaTeX (`compiler_jobs_total`, `compiler_timeout_total`, etc.) e propagar o contexto `traceparent` na fila de jobs assíncronos.
- [ ] **OBS-08:** Configurar regras de alerta no Alertmanager/Grafana para queda de serviços, timeouts de compilação e saturação de pools.

### Fase 3: LLMOps com Opik & Proteção de Prompts
- [ ] **OBS-09:** Implantar o Opik localmente e validar o armazenamento em PostgreSQL e ClickHouse.
- [ ] **OBS-10:** Instalar pacote `opik` no `ai-service` e criar o helper `get_correlated_opik_tracer` injetando o `trace_id` W3C.
- [ ] **OBS-11:** Implementar os 3 níveis de proteção de prompts (Nível 1 Operacional como default em produção, Nível 3 Conteúdo restrito com mascaramento).
- [ ] **OBS-12:** Configurar Data Link no Grafana Tempo para navegação direta ao Opik a partir do trace de uma requisição.

### Fase 4: Gestão de Exceções com GlitchTip
- [ ] **OBS-13:** Implantar GlitchTip em container leve conectado ao PostgreSQL institucional.
- [ ] **OBS-14:** Configurar `@sentry/react` no Frontend com filtro `beforeSend` para higienização estrita de PII e tokens JWT.
- [ ] **OBS-15:** Configurar upload de Source Maps durante o build do frontend para visualização de stack traces desminificados no GlitchTip.

### Fase 5: Validação Operacional e Benchmarks de Infraestrutura
- [ ] **OBS-16:** Executar testes de carga concorrente (50 a 200 usuários virtuais via k6) em ambiente de homologação.
- [ ] **OBS-17:** Mensurar consumo real de CPU, RAM e disco de cada componente da stack sob estresse para calibrar os limites e reservas do Kubernetes.
- [ ] **OBS-18:** Realizar teste de recuperação de desastres (DR) com restauração de backup do Prometheus (snapshot+WAL), PostgreSQL do GlitchTip/Opik e buckets do MinIO.
