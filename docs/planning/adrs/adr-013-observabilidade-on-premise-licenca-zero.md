# ADR 013: Arquitetura de Observabilidade Open Source, Self-Hosted e Soberania Institucional (OpenTelemetry, Prometheus, Loki, Tempo, Opik e GlitchTip)

- **Status:** APROVADO (Consolidado com Especificação de Engenharia de Confiabilidade — 10/11/2026)
- **Data Original:** 10 de Novembro de 2026
- **Data de Consolidação Final:** 10 de Novembro de 2026
- **Autor(es):** Equipe de Arquitetura, Engenharia e Segurança SCIA
- **Domínio:** Observabilidade de Microsserviços, LLMOps de Agentes, Monitoramento de Sandbox TeX, Rastreamento Distribuído W3C e Gestão de Incidentes On-Premise
- **Componentes Relacionados:**
  - `frontend`: `@sentry/react` (sanitizado) conectando ao GlitchTip
  - `backend`: `fastify-metrics`, OpenTelemetry Node SDK, logs JSON via Pino, `@sentry/node`
  - `ai-service`: `prometheus-fastapi-instrumentator`, `opik` (OpikTracer assíncrono com `otel_trace_id`), `loguru`, rate-limiting distribuído Redis no arXiv
  - `compiler`: Exporter TeX (Counter, Gauge, Histogram), cgroups, propagação W3C carrier em fila, dimensionamento estático de workers (KEDA postergado)
  - `infra`: Grafana Alloy, OpenTelemetry Collector (topologia gateway/tail-sampling), Prometheus, Loki, Tempo, Opik (MySQL + ClickHouse), GlitchTip (Web + Worker Celery + PostgreSQL), MinIO

---

## ⚡ Guia Rápido & Resumo Executivo ("Elevator Pitch" Consolidado)

### 1. O que estamos decidindo e adotando:
1. **Infraestrutura de Observabilidade 100% Self-Hosted & Soberania Institucional:** Toda a pilha de coleta, armazenamento e visualização de telemetria opera exclusivamente na infraestrutura institucional on-premise. Elimina-se qualquer custo recorrente obrigatório de licenciamento de software ou assinaturas de SaaS de monitoramento.
2. **Separação Estrita de Domínios de Tráfego:** A soberania on-premise aplica-se integralmente à **infraestrutura de observabilidade** (logs, métricas, traces, spans e dados do Opik ficam retidos localmente). O tráfego de aplicação com provedores externos de busca acadêmica (arXiv, Semantic Scholar, OpenAlex) ou modelos comerciais (Gemini, GPT-4o) é governado separadamente pela política de classificação de dados (ADR-012). Quando sigilo institucional absoluto for exigido, o SCIA direciona a execução exclusivamente ao modelo local via **Ollama**.
3. **Pipeline Unificado sem Duplicidade:**
   * **OpenTelemetry SDK:** Instrumentação neutra do código de aplicação em TypeScript e Python.
   * **Grafana Alloy:** Agente unificado para coleta de logs dos containers e métricas de infraestrutura (substituindo Promtail).
   * **OpenTelemetry Collector com Topologia em Duas Camadas (Kubernetes):** Collectors de borda recebem OTLP e roteiam por `trace_id` via `loadbalancingexporter` para Collectors dedicados de *tail-sampling*, garantindo que todos os spans de uma mesma requisição cheguem à mesma instância de amostragem.
   * **Tail-Based Sampling com Atributos Canônicos:** Retenção a **100%** para spans com status nativo `status_code: [ERROR]`, respostas com `http.response.status_code >= 500`, latências $> 2000$ ms e operações de IA/Compilador; amostragem probabilística (10%) restrita a rotas de alta frequência de polling/heartbeat.
4. **LLMOps com Opik, Fail-Open e Correlação com Tempo:**
   * O tracing distribuído da requisição HTTP é de responsabilidade do **Grafana Tempo**.
   * A observabilidade semântica dos agentes LangGraph é de responsabilidade do **Opik**.
   * O identificador distribuído é explicitamente injetado nos metadados do Opik como `otel_trace_id`, com navegação via `${__trace.traceId}` no Tempo.
   * **Resiliência Fail-Open Estrita:** O `OpikTracer` opera em background worker assíncrono com timeout de 2s, fila limitada em memória e circuit breaker. Falhas no Opik nunca bloqueiam ou degradam o atendimento aos pesquisadores no `ai-service`.
5. **Limitador Distribuído para APIs Externas (arXiv):** Para prevenir bloqueio institucional de IP em ambientes multi-pod no Kubernetes, o throttle de 3 segundos do arXiv é coordenado centralmente via chave atômica com TTL no **Redis**.
6. **Topologia de Armazenamento Realista:**
   * O Opik opera sobre sua arquitetura nativa com **MySQL** (metadados/projetos) e **ClickHouse** (traces/análise).
   * O GlitchTip opera desacoplado com containers **`glitchtip-web`** e **`glitchtip-worker` (Celery)** sobre PostgreSQL 16+.
   * Loki e Tempo utilizam o MinIO S3 como armazenamento de objetos de baixo custo.
7. **Dimensionamento dos Workers do Compilador (KEDA Postergado):** Na fase atual, o compilador TeX opera com dimensionamento estático provisionado (pool fixo de réplicas isoladas). A adoção do **KEDA** para escalonamento automático baseado em `compiler_queue_size` foi formalmente postergada para uma fase futura, sendo acionada apenas se e quando a volumetria de concorrência em produção comprovar necessidade.
8. **Sanitização Universal de Ponta a Ponta:** Higienização ativa em todos os 4 emissores (**React, Fastify, FastAPI e Compiler**), impedindo vazamento de tokens, senhas, variáveis de ambiente ou trechos de manuscritos LaTeX nos logs ou traces.

---

## 1. Contexto & Diagnóstico dos Três Regimes de Carga

A plataforma SCIA possui três comportamentos computacionais heterogêneos:
1. **Colaboração e Edição em Tempo Real:** Requisições contínuas, WebSockets persistentes, leases em memória no Redis e checkpoints periódicos no PostgreSQL. Exige monitoramento de Event Loop lag, latência de processamento de operações colaborativas na RAM do pod, tempo de persistência e taxa de reconexões.
2. **Motor de Inteligência Científica (LangGraph):** Grafos multi-agente estocásticos, streaming SSE, interrupções humanas (*interrupt*) e chamadas a APIs acadêmicas externas com semáforo e throttle mandatório de 3s (arXiv ToU).
3. **Sandbox do Compilador LaTeX:** Processamento em lote (*batch*), CPU-intensivo, concorrência limitada, risco de loops em macros TeX e isolamento rígido em cgroups sem rede.

---

## 2. Decisão Arquitetural: Divisão de Responsabilidades da Stack

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│             MATRIZ DE FERRAMENTAS, LICENÇAS E RESPONSABILIDADES NO SCIA                │
├─────────────────────┬──────────────────────┬─────────────┬─────────────────────────────┤
│ Domínio             │ Ferramenta Eleita    │ Licença     │ Responsabilidade Específica │
├─────────────────────┼──────────────────────┼─────────────┼─────────────────────────────┤
│ Instrumentação Apps │ OpenTelemetry SDK    │ Apache 2.0  │ Spans e contexto W3C        │
│ Coleta no Host/K8s  │ Grafana Alloy        │ Apache 2.0  │ Logs e métricas de nós/pods │
│ Pipeline Telemetria │ OTel Collector       │ Apache 2.0  │ 2 camadas: gateway + tail   │
│ Métricas e Séries   │ Prometheus           │ Apache 2.0  │ Scraping HTTP, TSDB, alertas│
│ Logs Estruturados   │ Grafana Loki         │ AGPLv3      │ Logs via Structured Metadata│
│ Tracing Distribuído │ Grafana Tempo        │ AGPLv3      │ Traces HTTP e RPC entre apps│
│ Visualização        │ Grafana OSS          │ AGPLv3      │ Painéis, alertas e correlação│
│ LLMOps & Agentes    │ Opik (Comet)         │ Apache 2.0  │ Nós LangGraph, tokens, custo│
│ Rastreio de Bugs    │ GlitchTip            │ AGPLv3      │ Web + Celery Worker (Bugs)  │
└─────────────────────┴──────────────────────┴─────────────┴─────────────────────────────┘
```

---

## 3. Contratos de Integração e Detalhes Técnicos

### 3.1 Contrato de Correlação Bidirecional (Tempo $\leftrightarrow$ Opik)
Para evitar colisão com identificadores internos do Opik:
* O FastAPI extrai o W3C `traceparent` e obtém o `otel_trace_id`.
* Ao instanciar o callback `OpikTracer`, injeta-se o campo explícito:
  ```python
  metadata = {
      "otel_trace_id": otel_trace_id,       # Chave para correlação no Tempo
      "conversation_id": conversation_id,   # Sessão do pesquisador
      "article_id": article_id,             # Projeto acadêmico
      "project_stage": stage_number         # Etapa institucional (1 a 6)
  }
  ```
* **Navegação Tempo $\rightarrow$ Opik:** O Grafana Tempo utiliza a variável canônica `${__trace.traceId}` em seu *Data Link* apontando para a interface de consulta do Opik.
* **Navegação Opik $\rightarrow$ Tempo:** Na entrega inicial, o card de metadados na UI do Opik exibe o `otel_trace_id`, que o operador copia e busca diretamente no explorador do Tempo no Grafana. A automatização direta via URL parametrizada será homologada conforme a estabilidade da versão instalada do Opik.
* **Resiliência Fail-Open Operacional:** O `OpikTracer` é executado com cliente assíncrono em background, fila limitada a 500 eventos em memória e timeout de rede de 2s. Se o servidor do Opik estiver inacessível, as mensagens são descartadas controladamente com emissão de métrica `opik_dropped_events_total`, **sem bloquear a resposta ao usuário**.

### 3.2 Topologia e Política de Tail-Based Sampling no OTel Collector
Para garantir que traces multi-serviços não sejam fragmentados em Kubernetes:
* **Topologia em Duas Camadas:**
  1. *Camada 1 (Gateway Collectors):* Recebe spans OTLP das aplicações e utiliza o `loadbalancingexporter` com roteamento baseado em `trace_id`.
  2. *Camada 2 (Sampling Collectors):* Recebe todos os spans de um mesmo trace na mesma réplica e aplica o processador `tail_sampling` em memória (`num_traces: 10000`, `decision_wait: 10s`).
* **Regras Semânticas de Amostragem:**
  * **Retenção de 100%:**
    * Spans com status nativo `status_codes: [ ERROR ]`.
    * Spans com o atributo canônico `http.response.status_code >= 500`.
    * Spans com latência total $> 2000$ ms.
    * Requisições para `service.name == "ai-service"` ou `service.name == "compiler"`.
  * **Amostragem Probabilística (10%):** Restrita a rotas de leitura de alta frequência e healthchecks (`/health`, `/metrics`, heartbeats de sessão).

### 3.3 Limitador Distribuído para APIs Externas (arXiv)
* Para evitar que múltiplos pods do `ai-service` disparem chamadas concorrentes ao arXiv (violando o Termo de Uso de 3s e acarretando ban de IP institucional), o throttle deixa de ser apenas um semáforo local em Python e passa a ser coordenado via **Redis**:
  ```python
  # Rate-limit distribuído no Redis para arXiv
  async def acquire_arxiv_distributed_slot(redis_client, wait_timeout=15.0):
      # Garante intervalo mínimo de 3s entre chamadas de quaisquer pods
      while True:
          acquired = await redis_client.set("rate_limit:arxiv:lock", "locked", nx=True, px=3100)
          if acquired:
              return True
          await asyncio.sleep(0.5)
  ```

### 3.4 Propagação de Contexto W3C no Compilador LaTeX via Filas
1. O Backend Fastify utiliza `propagation.inject(context.active(), carrier)` para serializar o contexto W3C no payload do job no Redis.
2. O worker do compilador executa `propagation.extract(ROOT_CONTEXT, carrier)` antes de invocar o binário do LaTeX, criando um span de processamento filho com atributos canônicos.

### 3.5 Métricas do Compilador LaTeX (Tipos e Labels)

| Métrica | Tipo | Labels Permitidas (Baixa Cardinalidade) | Finalidade |
| :--- | :--- | :--- | :--- |
| `compiler_jobs_total` | **Counter** | `compiler_engine`, `status` | Total de compilações solicitadas |
| `compiler_jobs_active` | **Gauge** | `compiler_engine` | Compilações em execução simultânea |
| `compiler_job_duration_seconds` | **Histogram** | `compiler_engine` | Duração da compilação ($p50$, $p95$, $p99$) |
| `compiler_jobs_failed_total` | **Counter** | `compiler_engine`, `failure_category` | Falhas categorizadas |
| `compiler_timeout_total` | **Counter** | `compiler_engine` | Cancelamentos por teto de 30s |
| `compiler_queue_size` | **Gauge** | Nenhuma | Tamanho da fila aguardando worker |

* **Valores de `compiler_engine`:** `pdflatex`, `xelatex`, `lualatex`.
* **Valores de `failure_category`:** `syntax_error`, `package_missing`, `system_error`.
* **Nota sobre `compiler_timeout_total`:** Mede processos interrompidos ao atingir 30s por qualquer causa (documento excessivamente complexo, I/O lento ou loop de macros).

### 3.6 Dimensionamento do Compilador (KEDA Postergado para Fase Futura)
Para manter a complexidade operacional controlada na implantação inicial:
* Os workers do compilador TeX operam com dimensionamento estático provisionado (réplicas dedicadas com quotas estritas de CPU/RAM em cgroups).
* A integração com **KEDA** (Kubernetes Event-driven Autoscaling) lendo `min_over_time(compiler_queue_size[30s]) > 3` permanece documentada como caminho evolutivo aprovado, mas **postergada para uma fase futura**, sendo ativada apenas se os testes de carga e a volumetria de produção demonstrarem filas persistentes.

### 3.7 Sanitização Universal em Todos os Emissores

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                     MATRIZ DE SANITIZAÇÃO DE DADOS POR EMISSOR                         │
├─────────────────────┬──────────────────────────────────────────────────────────────────┤
│ Emissor             │ Regras de Higienização Obrigatórias                              │
├─────────────────────┼──────────────────────────────────────────────────────────────────┤
│ Frontend (React)    │ beforeSend expurga tokens de query/storage, senhas e PII         │
│ Backend (Fastify)   │ Interceptor expurga Authorization headers, cookies e envs        │
│ AI Service (FastAPI)│ Mascaramento de prompts (Nível 1 default), expurgo de tokens LLM│
│ Compiler (Worker)   │ Sanitização de paths locais, supressão de trechos .tex e nomes   │
│ OTel Collector      │ Processador de atributos que filtra chaves sensíveis residuais   │
└─────────────────────┴──────────────────────────────────────────────────────────────────┘
```

---

## 4. Topologia de Armazenamento, Retenção e Recuperação (DR)

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│               MATRIZ DE ARMAZENAMENTO, RETENÇÃO, RPO E RTO                             │
├────────────────────┬───────────┬──────────────────────┬──────────┬────────┬────────────┤
│ Componente         │ Retenção  │ Backend de Storage   │ RPO      │ RTO    │ Criticidade│
├────────────────────┼───────────┼──────────────────────┼──────────┼────────┼────────────┤
│ Prometheus         │ 15 dias   │ PVC Persistente SSD  │ 24 horas │ 2 horas│ Média      │
│ Grafana Loki       │ 14 dias   │ MinIO S3 (Chunks)    │ 24 horas │ 4 horas│ Média      │
│ Grafana Tempo      │ 7 dias    │ MinIO S3 (Blocos)    │ N/A*     │ 2 horas│ Baixa      │
│ Opik (Analítico)   │ 90 dias   │ ClickHouse           │ 24 horas │ 4 horas│ Média      │
│ Opik (Transacional)│ 90 dias   │ MySQL 8.0            │ 24 horas │ 2 horas│ Média      │
│ GlitchTip          │ 30 dias   │ PostgreSQL 16+       │ 24 horas │ 2 horas│ Média      │
│ Grafana Dashboards │ Indefinido│ Git (Provisioning)   │ 0 horas  │ 30 min │ Alta       │
└────────────────────┴───────────┴──────────────────────┴──────────┴────────┴────────────┘
```
*\*O Grafana Tempo armazena traces de diagnóstico transitórios: a retenção de 7 dias é gerenciada pelo compactador do Tempo (`compactor.compaction`). Em caso de desastre com perda de bucket, o serviço é restaurado vazio com RTO de 2 horas, sem comprometer a integridade dos dados acadêmicos do SCIA.*

### 4.1 Resposta à Saturação de Espaço no MinIO
Em caso de alerta de capacidade no MinIO (espaço livre $< 15\%$):
1. **É terminantemente proibido o expurgo automático de arquivos:** PDFs gerados, pacotes de evidências e assets possuem valor de auditoria institucional.
2. **Ação Operacional:** Geração de alerta para a equipe de infraestrutura, identificação do bucket em crescimento e **expansão da capacidade do Persistent Volume Claim (PVC)**.

---

## 5. Indicadores de Confiabilidade (SLIs / SLOs Propostos)

| Domínio | Indicador de Nível de Serviço (SLI) | Meta Proposta (SLO) |
| :--- | :--- | :--- |
| **Editor Colaborativo** | Disponibilidade das conexões WebSocket | $\ge 99.5\%$ de conexões aceitas com sucesso |
| | Latência de processamento de operações na RAM do pod | $p95 < 16$ ms, $p99 < 50$ ms (excluindo rede externa) |
| | Taxa de sucesso de checkpoints no PostgreSQL | $\ge 99.9\%$ das transações concluídas sem conflito |
| **SciAI Engine** | Taxa de sucesso na execução de grafos LangGraph | $\ge 98.0\%$ (excluindo cancelamentos manuais) |
| | TTFT (Time To First Token) no streaming SSE | $p90 < 2500$ ms |
| | Conformidade do limitador distribuído do arXiv | $100\%$ de cumprimento do intervalo $\ge 3$s |
| **Compilador LaTeX** | Taxa de compilações concluídas sem falha de infraestrutura | $\ge 99.0\%$ (excluindo erro de sintaxe do autor) |
| | Tempo de espera na fila de compilação | $p95 < 3.0$ s |
| | Taxa de timeouts (30s) de compilação | $< 1.0\%$ de todos os jobs despachados |
| **Infraestrutura** | Uptime percebido dos microsserviços via Blackbox | $\ge 99.5\%$ de disponibilidade |

---

## 6. Saúde do Próprio Pipeline de Observabilidade
Para garantir que falhas na telemetria sejam detectadas antes que afetem o diagnóstico:
* `otelcol_processor_tail_sampling_dropped_spans`: Alerta se o coletor estiver descartando spans por pressão de memória.
* `loki_ingester_dropped_entries_total`: Alerta de perda de logs no Loki.
* `prometheus_target_scrape_slow`: Alerta se o scraping do Fastify ou FastAPI passar de 5s.
* `opik_dropped_events_total`: Monitoramento de eventos descartados pelo mecanismo fail-open do `ai-service`.

---

## 7. Roteiro de Implantação em 5 Fases

1. **Fase 1 — Fundação & Pipeline OTel:** OTel SDKs em Fastify e FastAPI; padronização de logs JSON; deploy do Grafana Alloy e OTel Collector com amostragem canônica e rate-limit distribuído no Redis para o arXiv.
2. **Fase 2 — Observabilidade Operacional:** Prometheus para métricas; Loki com structured metadata; Tempo integrado ao MinIO; métricas do compilador (Counter/Gauge/Histogram) e propagação W3C na fila.
3. **Fase 3 — LLMOps com Opik (MySQL + ClickHouse):** Deploy on-premise da stack nativa do Opik; instrumentação com `otel_trace_id`; configuração do Data Link no Tempo e garantia de resiliência fail-open.
4. **Fase 4 — Gestão de Exceções com GlitchTip (Web + Worker):** Deploy do GlitchTip desacoplado; configuração de sanitização universal em todos os 4 emissores; source maps no frontend.
5. **Fase 5 — Validação Operacional e Benchmarks:** Dimensionamento e calibração de quotas de memória/CPU dos workers do compilador via testes de carga com k6; homologação de disaster recovery (DR); validação dos SLOs (avaliação de necessidade de KEDA mantida como backlog evolutivo).
