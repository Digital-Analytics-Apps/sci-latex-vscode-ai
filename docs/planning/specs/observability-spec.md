# Especificação Técnica: Observabilidade Open Source e Soberania Institucional

- **Documento:** `observability-spec.md`
- **Referência:** ADR 013 (Consolidada com Análise Técnica)
- **Status:** APROVADO
- **Alvo:** Frontend, Backend Fastify, AI Service (LangGraph/FastAPI), LaTeX Compiler, Infraestrutura On-Premise

---

## 1. Escopo e Diretrizes de Engenharia

Esta especificação define os contratos de dados, topologia de rede, modelos de amostragem e planos de tarefas para a observabilidade do SCIA:

1. **Soberania Local de Telemetria:** Métricas, logs, traces e execuções do Opik residem exclusivamente em infraestrutura on-premise.
2. **Correlação Tempo $\leftrightarrow$ Opik:** O `OpikTracer` recebe explicitamente o campo `otel_trace_id`, permitindo vincular spans de rede ao detalhamento interno de nós de IA no Opik.
3. **Resiliência Fail-Open da IA:** O rastreamento de LLMs pelo Opik é estritamente não-bloqueante; indisponibilidade do Opik nunca interrompe o atendimento aos pesquisadores no `ai-service`.
4. **Tail-Based Sampling Inteligente:** Retenção a 100% para erros, requisições lentas ($> 2000$ ms), chamadas de IA e compilações TeX.
5. **Armazenamento Nativo e Isolado do Opik:** O Opik opera sobre seus bancos nativos dedicados (**MySQL** para dados transacionais e **ClickHouse** para traces analíticos), preservando o PostgreSQL para o SCIA e GlitchTip.
6. **Autoscaling por Demanda de Fila (KEDA):** O escalonamento de pods do compilador LaTeX lê `compiler_queue_size` via KEDA / Prometheus-Adapter.

---

## 2. Contratos de Telemetria & Correlação

### 2.1 Contrato W3C Trace Context (Tempo $\leftrightarrow$ Opik)
No endpoint `/chat/stream` e `/runs` do `ai-service`:

```python
# app/core/opik_tracer.py
import logging
from opentelemetry import trace
from opik.integrations.langchain import OpikTracer

logger = logging.getLogger(__name__)

def get_correlated_opik_tracer(conversation_id: str, article_id: str | None = None) -> OpikTracer | None:
    try:
        # Extrai o trace_id ativo do OpenTelemetry
        current_span = trace.get_current_span()
        ctx = current_span.get_span_context() if current_span else None
        otel_trace_id = format(ctx.trace_id, "032x") if ctx and ctx.trace_id else "unknown"

        # Injeta otel_trace_id como metadado sem colidir com identificadores internos do Opik
        return OpikTracer(
            project_name="scia-academic-copilot",
            metadata={
                "otel_trace_id": otel_trace_id,
                "conversation_id": conversation_id,
                "article_id": article_id or "n/a",
            }
        )
    except Exception as exc:
        # Garantia de fail-open: a observabilidade não pode derrubar a execução do agente
        logger.warning(f"Falha ao instanciar OpikTracer (fail-open ativado): {exc}")
        return None
```

### 2.2 Configuração de Tail-Based Sampling no OTel Collector
Configuração do processador `tail_sampling` em `otel-collector-config.yaml`:

```yaml
processors:
  tail_sampling:
    decision_wait: 5s
    num_traces: 50000
    expected_new_traces_per_sec: 2000
    policies:
      # 1. 100% de retenção para qualquer erro
      - name: errors-policy
        type: status_code
        status_code: { status_codes: [ ERROR ] }
      # 2. 100% de retenção para traces lentos (> 2000ms)
      - name: latency-policy
        type: numeric_attribute
        numeric_attribute: { key: "http.status_code", value_condition: { greater_than_or_equal: 400 } }
      # 3. 100% de retenção para o AI Service e Compiler
      - name: critical-services-policy
        type: string_attribute
        string_attribute: { key: "service.name", values: [ "ai-service", "compiler" ] }
      # 4. Amostragem probabilística de 10% para rotas de alto volume restantes
      - name: probabilistic-policy
        type: probabilistic
        probabilistic: { sampling_percentage: 10.0 }
```

### 2.3 Métricas do Compilador LaTeX & Propagação em Fila
No Backend Fastify ao despachar compilação para o Redis:
```typescript
import { propagation, context } from '@opentelemetry/api';

const carrier: Record<string, string> = {};
propagation.inject(context.active(), carrier);

await redis.rpush('compiler:jobs:queue', JSON.stringify({
  jobId,
  projectId,
  engine: 'pdflatex',
  traceCarrier: carrier, // Contexto W3C serializado
}));
```

No Worker do Compilador ao consumir o job:
```typescript
import { propagation, ROOT_CONTEXT, trace } from '@opentelemetry/api';

const extractedContext = propagation.extract(ROOT_CONTEXT, job.traceCarrier);
const tracer = trace.getTracer('compiler-worker');

const span = tracer.startSpan('compiler.execute_latex', {
  attributes: {
    'compiler.job_id': job.jobId,
    'compiler.engine': job.engine,
  },
}, extractedContext);
```

Métricas registradas:
* `compiler_jobs_total{compiler_engine="...", status="..."}` (Counter)
* `compiler_jobs_active{compiler_engine="..."}` (Gauge)
* `compiler_job_duration_seconds{compiler_engine="..."}` (Histogram: `[0.5, 1, 2, 5, 10, 20, 30]`)
* `compiler_jobs_failed_total{compiler_engine="...", failure_category="..."}` (Counter)
* `compiler_timeout_total{compiler_engine="..."}` (Counter)
* `compiler_queue_size` (Gauge)

---

## 3. Docker Compose de Referência (`infra/observability`)

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

  # 3. Ingestão de Logs
  loki:
    image: grafana/loki:3.1.1
    container_name: scia_loki
    restart: unless-stopped
    ports:
      - "3100:3100"
    command: -config.file=/etc/loki/local-config.yaml
    volumes:
      - loki_data:/loki

  # 4. Agente Unificado de Coleta (Host & Containers)
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

  # 5. Gateway OTel Collector com Tail-Sampling
  otel-collector:
    image: otel/opentelemetry-collector-contrib:0.108.0
    container_name: scia_otel_collector
    restart: unless-stopped
    command: [ "--config=/etc/otelcol-config.yaml" ]
    volumes:
      - ./otelcol-config.yaml:/etc/otelcol-config.yaml:ro
    ports:
      - "4317:4317" # OTLP gRPC
      - "4318:4318" # OTLP HTTP

  # 6. Tracing Distribuído
  tempo:
    image: grafana/tempo:2.5.0
    container_name: scia_tempo
    restart: unless-stopped
    command: [ "-config.file=/etc/tempo.yaml" ]
    ports:
      - "3200:3200"
    volumes:
      - tempo_data:/var/tempo

  # 7. Stack Nativa do Opik (MySQL + ClickHouse + Server)
  opik-mysql:
    image: mysql:8.0
    container_name: scia_opik_mysql
    restart: unless-stopped
    environment:
      - MYSQL_ROOT_PASSWORD=opikroot
      - MYSQL_DATABASE=opik
      - MYSQL_USER=opik
      - MYSQL_PASSWORD=opikpassword
    volumes:
      - opik_mysql_data:/var/lib/mysql

  opik-clickhouse:
    image: clickhouse/clickhouse-server:24.3-alpine
    container_name: scia_opik_clickhouse
    restart: unless-stopped
    volumes:
      - opik_ch_data:/var/lib/clickhouse

  opik:
    image: cometml/opik:latest
    container_name: scia_opik
    restart: unless-stopped
    depends_on:
      - opik-mysql
      - opik-clickhouse
    ports:
      - "5174:5173"
      - "8081:8080"
    environment:
      - MYSQL_URL=jdbc:mysql://opik-mysql:3306/opik?user=opik&password=opikpassword
      - CLICKHOUSE_URL=jdbc:clickhouse://opik-clickhouse:8123/default

  # 8. Gestão de Exceções (GlitchTip)
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

volumes:
  grafana_data:
  prometheus_data:
  loki_data:
  tempo_data:
  opik_mysql_data:
  opik_ch_data:
```

---

## 4. Plano de Tarefas Detalhado em 5 Fases (WBS)

### Fase 1: Fundação & Pipeline de Telemetria
- [ ] **OBS-01:** Implantar o **Grafana Alloy** com pipeline de leitura de logs do Docker/K8s e envio para o Loki com extração de *Structured Metadata*.
- [ ] **OBS-02:** Implantar o **OpenTelemetry Collector** com o processador `tail_sampling` retendo 100% de erros, chamadas de IA e tempos $> 2000$ ms.
- [ ] **OBS-03:** Padronizar saída JSON nos microsserviços via `pino` (Node.js) e `loguru` (Python), garantindo propagação de `trace_id` e `span_id`.

### Fase 2: Observabilidade Operacional (Métricas, Logs, Traces & Compilador)
- [ ] **OBS-04:** Configurar Prometheus para scraping dos endpoints `/metrics` do Fastify e FastAPI.
- [ ] **OBS-05:** Configurar Loki e Tempo com MinIO S3 como backend de armazenamento.
- [ ] **OBS-06:** Implementar injeção do contexto W3C (`propagation.inject`) no despacho de compilações pelo Fastify e extração no worker do compilador TeX.
- [ ] **OBS-07:** Implementar métricas especializadas do compilador TeX (Counter, Gauge, Histogram) e regras no Prometheus Alertmanager.

### Fase 3: LLMOps com Opik & Proteção de Prompts
- [ ] **OBS-08:** Implantar o cluster nativo do Opik (MySQL + ClickHouse) e validar endpoints de ingestão.
- [ ] **OBS-09:** Criar o helper `get_correlated_opik_tracer` no `ai-service` garantindo o campo `otel_trace_id` e resiliência fail-open.
- [ ] **OBS-10:** Implementar política de proteção de prompts (Nível 1 Operacional ativo por padrão em produção).
- [ ] **OBS-11:** Configurar Data Link no Grafana Tempo apontando para os traces filtrados no Opik.

### Fase 4: Gestão de Exceções com GlitchTip
- [ ] **OBS-12:** Implantar GlitchTip em container leve conectado ao schema dedicado no PostgreSQL.
- [ ] **OBS-13:** Configurar sanitização universal em todos os serviços (React `beforeSend`, interceptadores no Fastify e FastAPI) para expurgar senhas, tokens JWT e PII.
- [ ] **OBS-14:** Habilitar upload de Source Maps no CI/CD para mapeamento de stack traces desminificados no frontend.

### Fase 5: Validação Operacional e Benchmarks de Infraestrutura
- [ ] **OBS-15:** Executar testes de carga com k6 simulando picos de edição colaborativa e chamadas concorrentes ao Copiloto.
- [ ] **OBS-16:** Medir consumo real de memória RAM e CPU do cluster completo para calibrar quotas (`requests`/`limits`) dos manifests Kubernetes.
- [ ] **OBS-17:** Homologar rotina de recuperação de desastres (DR) com restauração de snapshots do Prometheus, dumps do MySQL/PostgreSQL e buckets do MinIO.
