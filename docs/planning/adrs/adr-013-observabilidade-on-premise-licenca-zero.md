# ADR 013: Arquitetura de Observabilidade 100% On-Premise e Licença Zero (Prometheus, Loki, Tempo, OpenTelemetry, Opik e GlitchTip)

- **Status:** APROVADO
- **Data:** 10 de Novembro de 2026
- **Autor(es):** Equipe de Arquitetura, Engenharia e Segurança SCIA
- **Domínio:** Observabilidade de Microsserviços, LLMOps de Agentes, Monitoramento de Sandbox TeX, Rastreamento Distribuído W3C e Gestão de Incidentes On-Premise
- **Componentes Relacionados:**
  - `frontend`: `@sentry/react` conectando ao GlitchTip
  - `backend`: `fastify-metrics`, OpenTelemetry Node SDK, logs JSON via Pino, `@sentry/node`
  - `ai-service`: `prometheus-fastapi-instrumentator`, `opik` (OpikTracer para LangGraph), `loguru`, OpenTelemetry Python SDK
  - `compiler`: Métricas de execução de jobs, isolamento de processos e quotas de CPU/RAM
  - `infra`: `docker-compose.observability.yml`, `k8s/manifests/observability/`

---

## ⚡ Guia Rápido & Resumo Executivo ("Elevator Pitch")

### 1. O que estamos decidindo e adotando:
1. **Licença Zero & Soberania Total (100% On-Premise):** Nenhuma telemetria, prompt, código LaTeX ou dado de pesquisa sairá dos servidores da instituição. Custo recorrente de SaaS: **R$ 0,00**.
2. **Padrão Neutro de Coleta (OpenTelemetry):** Instrumentação agnóstica em TypeScript e Python. Nenhum código de negócio fica acoplado a um fornecedor específico.
3. **LLMOps com Opik (Comet):** Substituição de plataformas SaaS ou do Langfuse pelo **Opik (Apache 2.0)**, instalado on-premise. Rastreia 100% dos grafos multi-agente do LangGraph, tokens consumidos, custos por modelo, latência por nó e histórico de prompts.
4. **Stack Unificada de Telemetria (LGTM):**
   * **Prometheus:** Séries temporais de performance e infraestrutura.
   * **Grafana Loki:** Logs estruturados em JSON indexados apenas por metadados.
   * **Grafana Tempo:** Tracing distribuído correlacionado via W3C `traceparent`.
   * **Grafana:** Painel único correlacionando métricas, logs e traces.
5. **Gestão de Exceções com GlitchTip:** Alternativa leve, 100% open-source (licença AGPLv3) compatível com os SDKs padrão do Sentry, sem as restrições comerciais de licença BSL.

---

## 1. Contexto & Problema

À medida que a plataforma SCIA evolui para suportar múltiplos pesquisadores, pipelines de orquestração de IA e compilação LaTeX concorrente, surgiram três desafios operacionais críticos:

1. **Crescimento da Complexidade Arquitetural:** O sistema agora possui 5 camadas ativas (Frontend React $\rightarrow$ Backend Fastify $\rightarrow$ AI Service LangGraph $\rightarrow$ Compilador TeX $\rightarrow$ Bancos PostgreSQL, Redis e MinIO). Quando uma requisição falha ou fica lenta, é impossível isolar o gargalo sem telemetria correlacionada.
2. **Natureza Específica do Motor de IA:** O `ai-service` não opera como uma API REST comum. Ele executa grafos estocásticos de decisão (LangGraph), com chamadas externas rate-limited (arXiv, Semantic Scholar, OpenAlex) e streaming de tokens. Métricas HTTP padrão não informam o custo de tokens, onde o agente travou ou qual nó do grafo falhou.
3. **Requisito Institucional de Privacidade e Custo Zero:** Por lidar com manuscritos científicos inéditos e diretrizes de confidencialidade acadêmica, ferramentas SaaS em nuvem externa (Datadog, New Relic, LangSmith comercial) violam as políticas de soberania de dados e acarretam custos em dólar inviáveis em escala.

---

## 2. Critérios de Decisão Arquitetural

Para aprovação de cada ferramenta da stack, foram exigidos os seguintes critérios:
* **Licença de Software Livre/Permissiva (Licença Zero):** Apache 2.0, MIT ou AGPLv3 sem travas comerciais ocultas.
* **Execução 100% Self-Hosted (On-Premise):** Compatível com Docker Compose (dev/staging) e Kubernetes (produção).
* **Baixo Footprint Computacional:** Não comprometer os recursos de CPU/RAM dedicados aos agentes e à compilação.
* **Compatibilidade Aberta:** Suporte integral ao padrão OpenTelemetry (W3C Trace Context).

---

## 3. Decisão Arquitetural: A Stack On-Premise Licença Zero

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                        MAPA DE FERRAMENTAS POR DOMÍNIO NO SCIA                         │
├─────────────────────┬──────────────────────┬────────────────────┬──────────────────────┤
│ Domínio             │ Ferramenta Eleita    │ Licença            │ Função Primária      │
├─────────────────────┼──────────────────────┼────────────────────┼──────────────────────┤
│ Coleta e Roteamento │ OpenTelemetry (OTel) │ Apache 2.0         │ Agente agnóstico     │
│ Métricas e Séries   │ Prometheus           │ Apache 2.0         │ RED metrics e infra  │
│ Logs Estruturados   │ Grafana Loki         │ AGPL v3            │ Indexação leve JSON  │
│ Tracing Distribuído │ Grafana Tempo        │ AGPL v3            │ APM fim a fim        │
│ Visualização        │ Grafana OSS          │ AGPL v3            │ Painel centralizador │
│ LLMOps & Agentes    │ Opik (Comet)         │ Apache 2.0         │ Spans LangGraph/LLM  │
│ Rastreio de Bugs    │ GlitchTip            │ AGPL v3            │ Sentry-compatible    │
└─────────────────────┴──────────────────────┴────────────────────┴──────────────────────┘
```

### 3.1 Por que Opik em vez de Langfuse ou LangSmith?
1. **Licença Apache 2.0 Total:** O Opik é um projeto de código aberto com governança permissiva mantido pela Comet, sem módulos restritivos.
2. **Integração Nativa com LangGraph:** O Opik oferece o callback `OpikTracer`, que intercepta automaticamente as execuções assíncronas do LangGraph sem necessidade de alterar o código de negócio dos nós (`supervisor.py`, `search_specialist.py`, `curation.py`, `writer.py`).
3. **Visibilidade Abrangente:** Captura inputs, outputs, prompts do sistema, tempo por nó, contagem de tokens dividida por prompt/completion e cálculo automatizado de custos para modelos comerciais (Gemini, GPT-4o) ou custo zero para instâncias locais (Ollama).
4. **Deploy Simples On-Premise:** Empacotado oficialmente em containers Docker e Helm Charts para Kubernetes com banco relacional e ClickHouse para armazenamento analítico ultrarrápido.

### 3.2 Por que GlitchTip em vez de Sentry Oficial Self-Hosted?
O repositório oficial do Sentry Self-Hosted exige uma infraestrutura extremamente pesada (Kafka, Snuba, ClickHouse, Redis, Postgres e dezenas de workers) consumindo mais de 16 GB de RAM apenas para ligar, além de adotar a licença restritiva BSL. 
O **GlitchTip**, por sua vez:
* Utiliza a licença livre AGPLv3.
* É 100% compatível com a API e com as bibliotecas oficiais do Sentry (`@sentry/react`, `@sentry/node`, `sentry-sdk` do Python).
* Roda com apenas 1 container leve em Python/Django e PostgreSQL, consumindo menos de 500 MB de RAM.

---

## 4. Arquitetura de Interconexão e Fluxo de Dados

```mermaid
flowchart TD
    subgraph Clients["1. Clientes"]
        UI["Web App (React/Vite)"]
    end

    subgraph Core_Services["2. Serviços de Aplicação"]
        BE["Backend Fastify"]
        AI["AI Service (FastAPI / LangGraph)"]
        COMP["LaTeX Compiler"]
    end

    subgraph Observability_Agents["3. Coleta & Telemetria"]
        OTEL_COLL["OpenTelemetry Collector"]
        PROMTAIL["Promtail / Fluent Bit"]
    end

    subgraph Storage_Backends["4. Armazenamento de Telemetria (On-Premise)"]
        PROM[(Prometheus TSDB)]
        LOKI[(Grafana Loki)]
        TEMPO[(Grafana Tempo)]
        OPIK_SRV[(Opik Server & Storage)]
        GLITCH[(GlitchTip Server)]
    end

    subgraph Visualization["5. Painéis de Controle"]
        GRAF[("Grafana Central")]
        OPIK_UI[("Opik Web Dashboard")]
    end

    UI -->|JS Exceptions| GLITCH
    UI -->|HTTP / traceparent| BE
    BE -->|REST / traceparent| AI
    BE -->|HTTP / traceparent| COMP

    BE -->|Crash Reports| GLITCH
    AI -->|Crash Reports| GLITCH

    AI -->|OpikTracer (Spans, Tokens, Prompts)| OPIK_SRV

    BE & AI & COMP -->|Métricas & Spans OTel| OTEL_COLL
    BE & AI & COMP -->|Stdout JSON Logs| PROMTAIL

    OTEL_COLL -->|Métricas| PROM
    OTEL_COLL -->|Traces| TEMPO
    PROMTAIL -->|Logs com Labels| LOKI

    PROM --> GRAF
    LOKI --> GRAF
    TEMPO --> GRAF
    OPIK_SRV --> OPIK_UI
```

---

## 5. Padrões de Implementação Mandatórios

### 5.1 Propagação do W3C Trace Context
Todas as chamadas internas entre serviços devem respeitar o cabeçalho `traceparent` no formato:
`00-{trace_id}-{parent_id}-{trace_flags}`.
* O Backend Fastify gera o trace caso não venha do cliente e injeta nos headers ao chamar o `ai-service` e o `compiler`.
* O `ai-service` propaga o mesmo `trace_id` nos logs JSON e nos metadados enviados ao Opik.

### 5.2 Formato Padrão de Logs JSON
Nenhum serviço deve emitir texto puro. O `pino` (Node.js) e `loguru` (Python) devem garantir a presença dos campos:
`timestamp`, `level`, `service`, `trace_id`, `span_id`, `message` e dados de contexto.

---

## 6. Consequências da Decisão

### Positivas:
* **Custo Zero:** Eliminação completa de licenças ou faturas de telemetria em nuvem.
* **Segurança e Conformidade Institucional:** Manuscritos, dados acadêmicos e prompts de pesquisa nunca saem da infraestrutura local.
* **Visibilidade Especializada de IA:** Resolução de gargalos nos grafos de agentes com precisão cirúrgica via Opik.
* **Eficiência Operacional:** GlitchTip e Loki mantêm o consumo de memória da stack de observabilidade abaixo de 3 GB de RAM total no cluster.

### Negativas / Riscos Mitigados:
* **Responsabilidade de Sustentação:** A equipe local é responsável pelo backup do banco do Prometheus, Loki e Opik (mitigado via rotinas de snapshot e retenção delimitada a 15-30 dias).
* **Curva de Aprendizado Inicial:** Exige que a equipe compreenda a correlação entre Métricas, Logs e Traces (mitigado pela criação do tutorial didático anexo).

---

## 7. Próximos Passos
1. Adicionar os manifests/compose da stack em `infra/observability/`.
2. Instrumentar o Fastify com `fastify-metrics` e o FastAPI com `prometheus-fastapi-instrumentator`.
3. Plugar o `OpikTracer` no orquestrador do `ai-service`.
4. Importar os dashboards pré-configurados no Grafana.
