# ADR 013: Arquitetura de Observabilidade Open Source, Self-Hosted e Soberania Institucional (OpenTelemetry, Prometheus, Loki, Tempo, Opik e GlitchTip)

- **Status:** APROVADO (Consolidado com Análise Técnica de Confiabilidade — 10/11/2026)
- **Data Original:** 10 de Novembro de 2026
- **Data de Consolidação:** 10 de Novembro de 2026
- **Autor(es):** Equipe de Arquitetura, Engenharia e Segurança SCIA
- **Domínio:** Observabilidade de Microsserviços, LLMOps de Agentes, Monitoramento de Sandbox TeX, Rastreamento Distribuído W3C e Gestão de Incidentes On-Premise
- **Componentes Relacionados:**
  - `frontend`: `@sentry/react` (sanitizado) conectando ao GlitchTip
  - `backend`: `fastify-metrics`, OpenTelemetry Node SDK, logs JSON via Pino, `@sentry/node`
  - `ai-service`: `prometheus-fastapi-instrumentator`, `opik` (OpikTracer com metadado `otel_trace_id`), `loguru`, OpenTelemetry Python SDK
  - `compiler`: Exporter de métricas TeX (Counter, Gauge, Histogram), cgroups, propagação W3C carrier em fila
  - `infra`: Grafana Alloy, OpenTelemetry Collector, Prometheus, Loki, Tempo, Opik (MySQL + ClickHouse), GlitchTip (PostgreSQL), MinIO

---

## ⚡ Guia Rápido & Resumo Executivo ("Elevator Pitch" Consolidado)

### 1. O que estamos decidindo e adotando:
1. **Infraestrutura de Observabilidade 100% Self-Hosted & Soberania Institucional:** Toda a pilha de coleta, armazenamento e visualização de telemetria opera exclusivamente na infraestrutura institucional on-premise. Elimina-se qualquer custo recorrente obrigatório de licenciamento de software ou assinaturas de SaaS de monitoramento.
2. **Separação Estrita de Domínios de Tráfego:** A soberania on-premise aplica-se integralmente à **infraestrutura de observabilidade** (logs, métricas, traces, spans e dados do Opik ficam retidos localmente). O tráfego de aplicação com provedores externos de busca acadêmica (arXiv, Semantic Scholar, OpenAlex) ou modelos comerciais (Gemini, GPT-4o) é governado separadamente pela política de classificação de dados (ADR-012). Quando sigilo institucional absoluto for exigido, o SCIA direciona a execução exclusivamente ao modelo local via **Ollama**.
3. **Pipeline Unificado sem Duplicidade:**
   * **OpenTelemetry SDK:** Instrumentação neutra do código de aplicação em TypeScript e Python.
   * **Grafana Alloy:** Agente unificado para coleta de logs dos containers e métricas de infraestrutura (substituindo Promtail).
   * **OpenTelemetry Collector:** Processamento, enriquecimento e roteamento central de OTLP.
   * **Tail-Based Sampling Inteligente:** Retenção a **100%** para erros, traces lentos ($> 2000$ ms) e operações de IA e compilação; amostragem probabilística restrita a rotas de alta frequência de polling/heartbeat.
4. **LLMOps com Opik & Contrato de Correlação com Tempo:**
   * O tracing distribuído da requisição HTTP é de responsabilidade do **Grafana Tempo**.
   * A observabilidade semântica dos agentes LangGraph é de responsabilidade do **Opik**.
   * O identificador distribuído é explicitamente injetado nos metadados do Opik como `otel_trace_id`, permitindo correlação bidirecional sem colisões de identificadores internos.
   * A telemetria do Opik é **fail-open** (não-bloqueante): falhas na ingestão do Opik nunca interrompem o fluxo de pesquisa do autor.
5. **Topologia de Armazenamento Realista:**
   * O Opik opera sobre sua arquitetura nativa com **MySQL** (metadados/projetos) e **ClickHouse** (traces/análise).
   * O PostgreSQL institucional permanece isolado para o SCIA e GlitchTip.
   * Loki e Tempo utilizam o MinIO S3 como armazenamento de objetos de baixo custo.
6. **Segurança Preventiva e Sanitização em Todos os Emissores:** Sanitização ativa de tokens JWT, credenciais, headers sensíveis e dados pessoais em todos os emissores (React, Fastify, FastAPI e Compiler), impedindo que segredos alcancem os logs, traces ou o GlitchTip.
7. **Autoscaling Baseado em Métricas Customizadas (KEDA):** O escalonamento de workers do compilador TeX é realizado pelo HPA via métricas customizadas de fila (`compiler_queue_size`) disponibilizadas por KEDA / Prometheus-Adapter, e não por alertas passivos.

---

## 1. Contexto & Diagnóstico dos Três Regimes de Carga

A plataforma SCIA possui três comportamentos computacionais heterogêneos:
1. **Colaboração e Edição em Tempo Real:** Requisições contínuas, WebSockets persistentes, leases em memória no Redis e checkpoints periódicos no PostgreSQL. Exige monitoramento de Event Loop lag, latência de processamento de operações colaborativas, tempo de persistência e taxa de reconexões.
2. **Motor de Inteligência Científica (LangGraph):** Grafos multi-agente estocásticos, streaming SSE, interrupções humanas (*interrupt*) e chamadas a APIs acadêmicas externas com semáforo e throttle mandatório de 3s (arXiv ToU).
3. **Sandbox do Compilador LaTeX:** Processamento em lote (*batch*), CPU-intensivo, concorrência limitada, risco de loops infinitos em macros TeX e isolamento rígido em cgroups sem rede.

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
│ Pipeline Telemetria │ OTel Collector       │ Apache 2.0  │ Tail-sampling, roteamento   │
│ Métricas e Séries   │ Prometheus           │ Apache 2.0  │ Scraping HTTP, TSDB, alertas│
│ Logs Estruturados   │ Grafana Loki         │ AGPLv3      │ Logs via Structured Metadata│
│ Tracing Distribuído │ Grafana Tempo        │ AGPLv3      │ Traces HTTP e RPC entre apps│
│ Visualização        │ Grafana OSS          │ AGPLv3      │ Painéis, alertas e correlação│
│ LLMOps & Agentes    │ Opik (Comet)         │ Apache 2.0  │ Nós LangGraph, tokens, custo│
│ Rastreio de Bugs    │ GlitchTip            │ AGPLv3      │ Captura de exceções e crashes│
└─────────────────────┴──────────────────────┴─────────────┴─────────────────────────────┘
```

---

## 3. Contratos de Integração e Detalhes Técnicos

### 3.1 Contrato de Correlação Bidirecional (Tempo ↔ Opik)
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
* **Navegação Tempo $\rightarrow$ Opik:** O Grafana Tempo possui um *Data Link* que direciona para a interface do Opik filtrando por `metadata.otel_trace_id = ${__trace.id}`.
* **Navegação Opik $\rightarrow$ Tempo:** O card de metadados na UI do Opik exibe o `otel_trace_id`, que pode ser copiado e pesquisado diretamente no explorador do Tempo no Grafana.
* **Resiliência Fail-Open:** O `OpikTracer` opera em segundo plano com tratamento de exceções. Se o servidor do Opik estiver inacessível ou falhar, o `ai-service` registra um aviso em log e **continua atendendo a requisição do autor normalmente**, sem propagar erros para o usuário.

### 3.2 Política de Tail-Based Sampling no OTel Collector
Para evitar a perda de rastros correlacionados com o Opik ou com erros de sistema:
* **Taxa de 100% de Retenção (Amostragem Forçada):**
  * Qualquer trace com status de erro (`http.status_code >= 400` ou `otel.status_code == ERROR`).
  * Qualquer trace com latência total $> 2000$ ms.
  * Todas as requisições destinadas ao `ai-service` (`service.name == "ai-service"`).
  * Todos os jobs do `compiler` (`service.name == "compiler"`).
* **Amostragem Probabilística (ex: 10%):**
  * Restrita estritamente a requisições de leitura de alta frequência e healthchecks de rotina (`/health`, `/metrics`, heartbeats de sessão).
* **Topologia em Produção:** Em implantações multi-réplica do Collector, utiliza-se o `loadbalancingexporter` roteando spans por `trace_id` para garantir que todos os spans de uma mesma transação cheguem à mesma instância de amostragem.

### 3.3 Propagação de Contexto W3C no Compilador LaTeX via Filas
Para garantir que o trace não se perca quando a compilação ocorre em background:
1. O Backend Fastify utiliza o injetor oficial do OTel (`propagation.inject(carrier)`) para serializar o contexto W3C no payload do job enfileirado no Redis.
2. O worker do compilador executa `propagation.extract(carrier)` antes de iniciar a execução do LaTeX, criando um span de processamento filho (ou com *Span Link* se a execução for diferida no tempo).
3. Isso unifica a visão no Tempo: *Clique do Usuário $\rightarrow$ Enfileiramento no Fastify $\rightarrow$ Espera na Fila $\rightarrow$ Execução do pdflatex $\rightarrow$ Upload do PDF no MinIO*.

### 3.4 Métricas do Compilador LaTeX (Definição de Tipos e Labels)
Para prevenir explosão de cardinalidade no Prometheus:

| Métrica | Tipo | Labels Permitidas (Baixa Cardinalidade) | Finalidade |
| :--- | :--- | :--- | :--- |
| `compiler_jobs_total` | **Counter** | `compiler_engine`, `status` | Total de compilações solicitadas |
| `compiler_jobs_active` | **Gauge** | `compiler_engine` | Compilações em execução simultânea |
| `compiler_job_duration_seconds` | **Histogram** | `compiler_engine` | Duração da compilação ($p50$, $p95$, $p99$) |
| `compiler_jobs_failed_total` | **Counter** | `compiler_engine`, `failure_category` | Falhas categorizadas |
| `compiler_timeout_total` | **Counter** | `compiler_engine` | Cancelamentos por teto de 30s (`SIGKILL`) |
| `compiler_queue_size` | **Gauge** | Nenhuma | Tamanho da fila aguardando worker |

* **Valores de `compiler_engine`:** `pdflatex`, `xelatex`, `lualatex`.
* **Valores de `failure_category`:** `syntax_error`, `package_missing`, `system_error`.
* **Proibido em Labels:** `job_id`, `article_id`, `user_id` (devem ser gravados estritamente como atributos no span do Tempo ou nos logs).

### 3.5 Logs Estruturados no Loki com *Structured Metadata*
* **Labels do Loki (Baixa Cardinalidade):** `service.name`, `deployment.environment`, `log.level`.
* **Structured Metadata (Alta Cardinalidade):** `trace_id`, `span_id`, `user_id`, `article_id`, `job_id`, `k8s.pod.name`.
* **Conteúdo:** Mensagem textual limpa e stack traces higienizados.

### 3.6 Política de Segurança, Mascaramento e Classificação de Prompts
A proteção atua na prevenção (antes do envio):
* **Nível 1 (Operacional - Default em Produção):** O Opik grava `otel_trace_id`, duração, modelo, contagem de tokens e status. O conteúdo textual do prompt e da resposta é omitido.
* **Nível 2 (Diagnóstico):** Metadados de busca e parâmetros de ferramentas.
* **Nível 3 (Conteúdo Completo):** Prompts integrais somente sob autorização expressa em ambiente de testes, com mascaramento de dados e expurgo automatizado em até 7 dias.

### 3.7 Sanitização Universal nos Emissores de Erro (GlitchTip)
A higienização ocorre em todos os emissores antes da transmissão pela rede:
* **Frontend (React):** `beforeSend` expurga dados pessoais, tokens de query/localStorage e credenciais.
* **Backend Fastify & AI Service FastAPI:** Interceptadores de erro removem headers `Authorization`, cookies de sessão, variáveis de ambiente e trechos confidenciais de arquivos LaTeX.

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
│ Opik (Transacional)│ 90 dias   │ MySQL                │ 24 horas │ 2 horas│ Alta (IA)  │
│ GlitchTip          │ 30 dias   │ PostgreSQL           │ 24 horas │ 2 horas│ Média      │
│ Grafana Dashboards │ Indefinido│ Git (Provisioning)   │ 0 horas  │ 30 min │ Alta       │
└────────────────────┴───────────┴──────────────────────┴──────────┴────────┴────────────┘
```
*\*O Grafana Tempo é formalmente classificado como dado operacional transitório de curta duração: em caso de desastre catastrófico no cluster, os traces antigos podem ser perdidos sem impacto à integridade transacional dos manuscritos ou dos usuários do SCIA.*

### 4.1 Resposta à Saturação de Espaço no MinIO
Em caso de alerta de capacidade no MinIO (espaço livre $< 15\%$):
1. **Nunca executar expurgo automático cego:** Arquivos de pesquisa, pacotes de evidências e PDFs gerados possuem valor acadêmico institucional.
2. **Ação Operacional:** Geração de alerta para a equipe de infraestrutura, identificação do bucket causador e **expansão da capacidade do Persistent Volume Claim (PVC)**.

---

## 5. Indicadores de Confiabilidade (SLIs / SLOs Propostos)

| Domínio | Indicador de Nível de Serviço (SLI) | Meta Proposta (SLO) |
| :--- | :--- | :--- |
| **Editor Colaborativo** | Disponibilidade das salas WebSocket (`/ws/documents/:id`) | $\ge 99.5\%$ de conexões bem-sucedidas |
| | Latência de processamento de operações na RAM do pod | $p95 < 16$ ms, $p99 < 50$ ms |
| | Taxa de sucesso de checkpoints no PostgreSQL | $\ge 99.9\%$ das transações concluídas |
| **SciAI Engine** | Taxa de sucesso na execução de grafos LangGraph | $\ge 98.0\%$ de execuções sem erro fatal |
| | TTFT (Time To First Token) no streaming SSE | $p90 < 2500$ ms |
| | Respeito ao semáforo e throttle de 3s do arXiv | $100\%$ de conformidade (zero ban de IP) |
| **Compilador LaTeX** | Taxa de compilações concluídas sem falha de sistema | $\ge 99.0\%$ (excluindo erro de sintaxe do autor) |
| | Tempo de espera na fila de compilação | $p95 < 3.0$ s |
| | Taxa de timeouts (30s) por código infinito | $< 0.5\%$ de todas as compilações |
| **Infraestrutura** | Disponibilidade dos microsserviços (Fastify, AI, Compiler) | $\ge 99.5\%$ de uptime |

---

## 6. Estratégia de Alertas e Autoscaling (HPA)

1. **Separação Alertmanager vs. Grafana Alerting:**
   * **Prometheus Alertmanager:** Responsável exclusivo pela avaliação e roteamento de alertas de infraestrutura, saturação de recursos e indisponibilidade de serviços.
   * **Grafana Alerting:** Restrito a painéis específicos baseados em consultas compostas de logs e métricas.
2. **Autoscaling dos Workers de Compilação (HPA):**
   * O escalonamento do compilador TeX **não depende de alertas**.
   * Implanta-se o **KEDA (Kubernetes Event-driven Autoscaling)** ou **Prometheus-Adapter** lendo diretamente a métrica `compiler_queue_size`. Se a fila permanecer com $> 3$ jobs por $> 30$ segundos, novos pods do compilador são instanciados automaticamente, respeitando os limites mínimo e máximo configurados.

---

## 7. Roteiro de Implantação em 5 Fases

1. **Fase 1 — Fundação & Pipeline OTel:** OTel SDKs em Fastify e FastAPI; padronização de logs JSON; deploy do Grafana Alloy e OTel Collector com tail-sampling configurado a 100% para erros/IA.
2. **Fase 2 — Observabilidade Operacional:** Prometheus para métricas; Loki com structured metadata; Tempo integrado ao MinIO; métricas do compilador (Counter/Gauge/Histogram) e propagação W3C na fila.
3. **Fase 3 — LLMOps com Opik (MySQL + ClickHouse):** Deploy on-premise da stack nativa do Opik; instrumentação com `otel_trace_id`; configuração do Data Link no Tempo e garantia de resiliência fail-open.
4. **Fase 4 — Gestão de Exceções com GlitchTip:** Deploy do GlitchTip no PostgreSQL; configuração de sanitização universal em todos os serviços (`beforeSend`/interceptors); source maps no frontend.
5. **Fase 5 — Validação Operacional e Benchmarks:** Testes de carga com k6; calibração real de CPU/RAM para os manifests do Kubernetes; teste de recuperação de desastres (DR) e validação dos SLOs.
