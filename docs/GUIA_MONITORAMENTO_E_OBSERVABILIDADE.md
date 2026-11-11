# Guia Completo de Monitoramento e Observabilidade — Plataforma SCIA

Este documento estabelece a arquitetura, ferramentas, métricas e práticas recomendadas para a observabilidade de ponta a ponta da plataforma **SCIA (SCI-LaTeX)**.

---

## 1. Visão Geral da Arquitetura do Sistema

A plataforma SCIA é composta por múltiplos serviços heterogêneos com diferentes perfis de carga e modos de falha:

```mermaid
flowchart TD
    subgraph Client["Cliente (Navegador)"]
        UI["Frontend (React / Vite)"]
    end

    subgraph Edge_Services["Serviços de Borda & APIs"]
        BE["Backend (Fastify / TypeScript)"]
        AI["AI Service (FastAPI / LangGraph)"]
        COMP["LaTeX Compiler (Worker Sandbox)"]
    end

    subgraph Data_Storage["Armazenamento & Estado"]
        PG[(PostgreSQL)]
        RD[(Redis)]
        MIN[(MinIO S3)]
    end

    subgraph Obs_Platform["Plataforma de Observabilidade"]
        OTEL["OpenTelemetry Collector"]
        PROM["Prometheus (Métricas)"]
        LOKI["Grafana Loki (Logs)"]
        TEMPO["Grafana Tempo / Jaeger (Traces)"]
        LFUSE["Langfuse (LLMOps & LangGraph)"]
        SENTRY["Sentry (Crash Reporting)"]
        GRAF["Grafana (Dashboards & Alertas)"]
    end

    UI -->|RUM & Erros| SENTRY
    UI -->|HTTP / WS| BE
    BE -->|REST / SSE| AI
    BE -->|Job HTTP| COMP
    BE --> PG & RD & MIN
    AI --> RD & PG

    BE & AI & COMP -.->|Traces & Métricas OTel| OTEL
    BE & AI & COMP -.->|Logs Estruturados JSON| LOKI
    BE & AI -.->|Exceções Não Tratadas| SENTRY
    AI -.->|Spans de Grafo, Tokens & Custos| LFUSE
    OTEL --> PROM & TEMPO
    PROM & LOKI & TEMPO --> GRAF
```

---

## 2. O Que Você Precisa Monitorar (Camada por Camada)

A observabilidade moderna divide-se em **Métricas**, **Logs**, **Traces Distribuídos** e, no caso da SCIA, **LLMOps**.

### 2.1. Frontend (React / Vite)
* **Real User Monitoring (RUM) & Core Web Vitals:**
  * **LCP (Largest Contentful Paint):** Tempo para renderizar o maior bloco visível.
  * **INP (Interaction to Next Paint):** Responsividade da interface às ações do usuário.
  * **CLS (Cumulative Layout Shift):** Estabilidade visual ao carregar componentes.
* **Erros de Runtime:**
  * Captura de exceções não tratadas via `ErrorBoundary` do React.
  * Mapeamento de bugs com **Source Maps** para apontar arquivo `.tsx` e linha exata.
* **Rede & Conectividade:**
  * Falhas em requisições HTTP (status 4xx/5xx e timeouts).
  * Conexões persistentes de WebSocket (colaboração em tempo real) e SSE (streaming do Copiloto).

### 2.2. Backend (Node.js + Fastify)
* **Métricas RED (Rate, Errors, Duration):**
  * **Rate:** Requisições por segundo (RPS) por rota (`/projects`, `/auth`, `/compile`).
  * **Errors:** Taxa de respostas 5xx (erros de servidor) e 4xx (erros de cliente).
  * **Duration:** Percentis de latência ($p50$, $p95$, $p99$) — fundamental para identificar degradações pontuais.
* **Saúde da Runtime Node.js:**
  * **Event Loop Lag:** Identifica se alguma rota síncrona pesada está bloqueando a thread principal.
  * **Uso de Memória Heap e Ciclos de Garbage Collection (GC):** Diagnóstico de memory leaks.
* **Dependências & Banco:**
  * **Prisma / PostgreSQL:** Tamanho do pool de conexões ativas, conexões em espera e queries lentas.
  * **Redis:** Latência de comandos, taxa de acerto de cache (`cache hit/miss ratio`).

### 2.3. AI Service (FastAPI + LangGraph) — LLMOps
Diferente de microsserviços tradicionais, o motor de IA possui **alto custo financeiro**, **não-determinismo** e **latência elevada**:
* **Latência de Geração & Streaming:**
  * **TTFT (Time To First Token):** Tempo até o primeiro byte ser emitido no streaming SSE do chat.
  * **Tempo total de execução do grafo:** Duração da geração completa de respostas.
* **Consumo e Custos de IA:**
  * Tokens de entrada (prompt tokens) e tokens de saída (completion tokens) por requisição.
  * Custo financeiro estimado por execução, agrupado por modelo (Gemini 2.5 Flash, GPT-4o, Ollama).
* **Fluxo do LangGraph & Sub-Agentes:**
  * Duração e taxa de sucesso por nó (`Supervisor`, `SearchSpecialist`, `Curation`, `Writer`).
  * Monitoramento de nós interrompidos (`interrupt`) aguardando aprovação humana (Human-in-the-Loop).
* **Conectores Acadêmicos Externos (arXiv, Semantic Scholar, OpenAlex):**
  * Tempo de resposta e conformidade de taxa (ex: cumprimento do semáforo unitário e throttle de 3s no arXiv).
  * Taxa de acionamento do fallback em cascata do `academic_search.py`.
  * Status 429 (Rate Limit Exceeded) de APIs externas.

### 2.4. Compilador LaTeX (Worker Sandbox)
* **Tempo de Compilação de Documentos:** Duração por motor (pdflatex, xelatex, lualatex).
* **Consumo de Recursos por Job:** Picos de CPU e Memória (prevenção de loops infinitos ou scripts maliciosos em pacotes TeX).
* **Taxa de Sucesso vs Timeout vs Erro de Sintaxe:**
  * Distinguir erro cometido pelo usuário (sintaxe TeX incorreta) de erro do worker (falta de memória, timeout de execução, disco cheio).
* **Uso de Disco Temporário:** Monitoramento do volume de cache e arquivos intermediários (`.aux`, `.log`, `.out`).

### 2.5. Armazenamento e Infraestrutura
* **PostgreSQL:** Conexões ativas vs limites do pool, tempo de lock de tabelas, tamanho de índices e dead tuples.
* **Redis:** Uso de memória RAM, política de expulsão (`evicted keys`), contagem de clientes conectados.
* **MinIO S3:** Latência de leitura/escrita de PDFs e figuras, taxa de requisições por bucket, espaço em disco.
* **Kubernetes (K8s):**
  * Reinicializações de Pods (`CrashLoopBackOff` ou `OOMKilled`).
  * Métricas de nós (CPU, Memória, IOPS de disco e Throughput de rede).
  * Saturação do Ingress Controller / balanceadores de carga.

---

## 3. Ferramentas Recomendadas e o Porquê

A estratégia ideal adota padrões abertos para evitar *vendor lock-in* (dependência de um único fornecedor pago):

| Pilar | Ferramenta Recomendada | Por que essa escolha? |
| :--- | :--- | :--- |
| **Padrão de Coleta** | **OpenTelemetry (OTel)** | Padrão unificado da CNCF para métricas, logs e traces. Instrumenta o Fastify e o FastAPI de forma neutra. |
| **Métricas** | **Prometheus** (ou VictoriaMetrics) | Padrão nativo para ecossistemas Docker e Kubernetes. Muito leve e confiável para séries temporais. |
| **Visualização** | **Grafana** | Dashboards centralizados, alertas integrados (Slack, Discord, E-mail) e capacidade de correlacionar métricas com logs em um só painel. |
| **Logs Estruturados** | **Grafana Loki** + **Pino/Loguru** | O Loki indexa apenas os metadados (labels), consumindo uma fração de memória e disco em comparação ao Elasticsearch. O Fastify gera JSON nativo via `pino`. |
| **Tracing Distribuído** | **Grafana Tempo** ou **Jaeger** | Rastreia a requisição de ponta a ponta: *Frontend -> Backend Fastify -> AI Service -> Consulta arXiv -> Banco de Dados*. |
| **LLMOps (IA)** | **Langfuse** | Feito especificamente para monitorar LLMs e LangGraph. Rastreia o grafo de execução, tokens, custos por modelo, latência por nó e prompts. Open-source e auto-hospedável. |
| **Monitoramento de Erros** | **Sentry** | Melhor ferramenta de captura de bugs em tempo real para React e Node.js/Python, agrupando erros por versão de release. |

---

## 4. Comparativo de Alternativas

| Abordagem | Ferramentas | Vantagens | Desvantagens | Quando escolher? |
| :--- | :--- | :--- | :--- | :--- |
| **Stack Open-Source Moderna (Recomendada)** | Prometheus + Grafana + Loki + Tempo + Langfuse + Sentry | • Custo de licenciamento zero.<br>• Controle total dos dados (LGPD).<br>• Integração nativa com o Kubernetes existente. | • Requer manter os containers da stack de observabilidade. | Para times que buscam previsibilidade de custos e usam Kubernetes/Docker. |
| **Plataforma All-in-One Open-Source** | **SigNoz** | • Interface unificada idêntica ao Datadog.<br>• 100% focado em OpenTelemetry.<br>• Armazenamento em ClickHouse (rápido). | • ClickHouse exige mais memória de base.<br>• Menor ecossistema de dashboards prontos que o Grafana. | Se você não quiser configurar Prometheus, Loki e Tempo separadamente. |
| **SaaS Proprietário All-in-One** | **Datadog** / **Dynatrace** / **New Relic** | • Configuração mínima em minutos.<br>• Dashboards prontos de fábrica.<br>• IA nativa de detecção de anomalias. | • Custo extremamente alto e imprevisível à medida que o volume de logs/traces cresce. | Se a prioridade absoluta for velocidade de implantação sem gestão de infraestrutura. |
| **LLMOps Alternativo** | **LangSmith** | • Oficial da LangChain Inc.<br>• Interface rica para depuração profunda. | • Pode se tornar oneroso em grande escala.<br>• Plano gratuito limitado. | Caso o Langfuse não atenda a algum requisito avançado de avaliação estatística. |

---

## 5. O Que Mais Você Precisa Saber (Conceitos e Boas Práticas)

### 5.1. Propagação de Contexto e `Trace ID`
Sem rastreamento distribuído, debugar um erro em microsserviços é como procurar agulha no palheiro.
* Cada requisição iniciada no Frontend ou no Backend deve receber ou gerar um identificador único de rastreamento (padrão W3C `traceparent` ou `X-Correlation-ID`).
* Esse identificador deve ser repassado em todas as chamadas HTTP entre **Fastify $\rightarrow$ FastAPI $\rightarrow$ LaTeX Compiler**.
* Todos os logs emitidos devem incluir esse identificador. Ao pesquisar um único `Trace ID` no Loki/Grafana, você visualiza o fluxo completo por todos os serviços.

### 5.2. Os 4 Sinais de Ouro do Google SRE
Para criar alertas sem causar fadiga na equipe:
1. **Latência:** Tempo de resposta das requisições (com foco em $p95$ e $p99$).
2. **Tráfego:** Volume de trabalho solicitado ao sistema (RPS, execuções de compilação).
3. **Erros:** Proporção de requisições que falharam.
4. **Saturação:** Quão perto do limite de capacidade os recursos estão (tamanho de fila, memória, threads).

> [!IMPORTANT]
> **Alerte sobre Sintomas, Não Causas:**
> Configure alertas prioritários (PagerDuty/Discord/Slack) quando os **usuários forem afetados** (ex: taxa de erro 5xx > 1% por 3 minutos ou latência $p95$ > 4s). Alertas de causa (ex: CPU em 85%) devem ser apenas informativos ou de aviso, pois o sistema pode estar trabalhando em capacidade normal sem falhas.

### 5.3. Logs Estruturados em JSON vs Texto Simples
* **Evite:** Logs desestruturados como `console.log("Erro ao salvar projeto " + id)`.
* **Adote:** Logs padronizados em JSON gerados nativamente por `pino` (Node.js) e `loguru` ou `structlog` (Python):
```json
{
  "timestamp": "2026-11-10T21:30:00.123Z",
  "level": "error",
  "service": "ai-service",
  "traceId": "4bf92f3577b34da6a3ce929d0e0e4736",
  "agent": "search_specialist",
  "provider": "arxiv",
  "message": "ArXiv connection throttled, retrying in 3s",
  "retryCount": 1
}
```

### 5.4. Governança e Mascaramento de Dados Sensíveis (LGPD / Segurança)
* **Nunca logar:**
  * Tokens de autenticação (`Authorization: Bearer ...`).
  * Senhas e chaves de API (`OPENAI_API_KEY`, `GEMINI_API_KEY`, `INTERNAL_SERVICE_KEY`).
  * Textos confidenciais completos de manuscritos não publicados, salvo se explicitamente necessário em ambiente de depuração isolado.

---

## 6. Exemplos Práticos de Implementação

### 6.1. Expondo Métricas no Backend (Fastify)
Instalação:
```bash
npm install fastify-metrics
```
Configuração no servidor Fastify:
```typescript
import Fastify from 'fastify';
import fastifyMetrics from 'fastify-metrics';

const app = Fastify({
  logger: true, // Já usa pino em formato JSON por padrão
});

// Registra métricas padrão do Prometheus e rota /metrics
await app.register(fastifyMetrics, {
  endpoint: '/metrics',
  defaultMetrics: { enabled: true },
  routeMetrics: {
    enabled: true,
    groupStatusCodes: true,
  },
});
```

### 6.2. Expondo Métricas e Langfuse no AI Service (FastAPI + LangGraph)
Instalação de dependências:
```bash
uv add prometheus-fastapi-instrumentator langfuse
```

Configuração no `app/main.py`:
```python
from fastapi import FastAPI
from prometheus_fastapi_instrumentator import Instrumentator

app = FastAPI(title="SCIA AI Service")

# Expõe métricas de latência e RPS do FastAPI na rota /metrics
Instrumentator().instrument(app).expose(app, endpoint="/metrics")
```

Integrando o Langfuse com o LangGraph:
```python
from langfuse.callback import CallbackHandler
from app.agents.sub_agents.supervisor import create_onboarding_graph

# Instancia o handler de observabilidade de LLM
langfuse_handler = CallbackHandler(
    public_key="pk-lf-...",
    secret_key="sk-lf-...",
    host="http://langfuse-server:3000"
)

# Ao invocar ou executar stream no grafo, passe o callback
graph = create_onboarding_graph()
async for event in graph.astream(
    input_state,
    config={"callbacks": [langfuse_handler]}
):
    # O Langfuse rastreia automaticamente cada nó, tempo de resposta e tokens consumidos
    pass
```

### 6.3. Stack Mínima de Observabilidade via Docker Compose
Crie um arquivo `docker-compose.observability.yml` para rodar os coletores e dashboards localmente ou no servidor de staging:

```yaml
version: '3.8'

services:
  prometheus:
    image: prom/prometheus:latest
    container_name: scia_prometheus
    restart: unless-stopped
    volumes:
      - ./infra/prometheus/prometheus.yml:/etc/prometheus/prometheus.yml
      - prometheus_data:/prometheus
    ports:
      - "9090:9090"

  grafana:
    image: grafana/grafana:latest
    container_name: scia_grafana
    restart: unless-stopped
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin
    ports:
      - "3001:3000"
    volumes:
      - grafana_data:/var/lib/grafana

  loki:
    image: grafana/loki:latest
    container_name: scia_loki
    restart: unless-stopped
    ports:
      - "3100:3100"

  langfuse:
    image: langfuse/langfuse:2
    container_name: scia_langfuse
    restart: unless-stopped
    depends_on:
      - postgres
    environment:
      - DATABASE_URL=postgresql://postgres:postgres@postgres:5432/sci_latex_db?schema=langfuse
      - NEXTAUTH_SECRET=supersecret
      - SALT=supersecret
      - NEXTAUTH_URL=http://localhost:3002
    ports:
      - "3002:3000"

volumes:
  prometheus_data:
  grafana_data:
```

---

## 7. Roteiro de Implantação em 4 Etapas

```mermaid
flowchart LR
    E1["Etapa 1<br>Captura de Falhas<br>(Sentry + /metrics)"] --> E2["Etapa 2<br>LLMOps & Custos<br>(Langfuse no LangGraph)"]
    E2 --> E3["Etapa 3<br>Painéis & Alertas<br>(Prometheus + Grafana)"]
    E3 --> E4["Etapa 4<br>Logs & Traces Fim a Fim<br>(Loki + OpenTelemetry)"]
```

1. **Etapa 1: Captura de Falhas Imediatas (1 a 2 dias)**
   * Configurar **Sentry** no Frontend (React) e no Backend (Fastify) para notificar falhas em produção.
   * Adicionar rotas `/metrics` no Fastify e FastAPI.
2. **Etapa 2: LLMOps e Visibilidade de IA (1 dia)**
   * Conectar o callback do **Langfuse** nas execuções de grafos do `ai-service`.
   * Passar a monitorar tokens consumidos, custos em dólar e latência por etapa de busca (arXiv/OpenAlex).
3. **Etapa 3: Dashboards e Alertas Centrais (2 a 3 dias)**
   * Subir Prometheus e Grafana no cluster Kubernetes (`k8s/` ou Docker Compose).
   * Importar dashboards prontos da comunidade (Node.js Application Dashboard ID `11159`, FastAPI Dashboard ID `16110`).
   * Configurar canais de alertas (Slack/Discord/E-mail) para notificações de indisponibilidade.
4. **Etapa 4: Centralização de Logs e Rastreamento Distribuído (3 a 5 dias)**
   * Enviar logs JSON de todos os containers para o Grafana Loki.
   * Configurar OpenTelemetry SDK com propagação do `traceparent` entre serviços.
