# 🤖 Guia Operacional: Perguntas e Comandos para o Agente AIOps Copilot

- **Documento:** `GUIA_PERGUNTAS_AIOPS_COPILOT.md`
- **Referência:** [ADR-018: AIOps Copilot no SCIA Admin Center](file:///mnt/c0b6217c-c2f3-4c1f-8ba2-c8d177f718a9/development/professional/sci-latex-vscode/docs/architecture/adrs/adr-018-aiops-copilot-mcp-root-cause-analysis-admin-center.md)
- **Público-Alvo:** Administradores de Sistema, Engenheiros de Confiabilidade (SRE) e DevOps
- **Interface:** SCIA Admin Center (`/admin`) ➔ Botão **`[AIOps Copilot]`** ou **`[Investigar com AIOps]`**

---

## ⚡ 1. Visão Geral das Capacidades do Agente

O **AIOps Copilot** do SCIA está conectado diretamente a 5 servidores **Model Context Protocol (MCP)** da plataforma:
1. ☸️ **Kubernetes MCP:** Inspeciona pods, nós, containers, exit codes (`OOMKilled`), describe e eventos de cluster.
2. 📈 **Prometheus MCP:** Executa consultas em tempo real em PromQL (saturação de pools, uso de RAM/CPU, RPS, latências $p95$).
3. 📜 **Loki MCP:** Busca inteligente em logs estruturados filtrados por nível (`ERROR`, `FATAL`, `WARN`) e labels.
4. 🐛 **GlitchTip MCP (Sentry API):** Captura stacktraces e volume de exceções de código da aplicação.
5. 🧠 **Opik MCP (LLMOps):** Inspeciona a árvore de spans dos agentes LangGraph no `ai-service`, tokens e custos.

Abaixo está o catálogo completo de perguntas que você pode fazer em linguagem natural.

---

## 🔍 Categoria 1: Diagnóstico de Causa-Raiz (Infraestrutura vs. Aplicação)

*Use estas perguntas quando houver degradação, lentidão ou queda de qualquer serviço e você precisar saber onde está o problema.*

| Pergunta / Prompt | O que o Agente Faz nos Bastidores | O que Esperar de Resposta |
| :--- | :--- | :--- |
| **"Por que o serviço do compilador está instável nos últimos 20 minutos?"** | Consulta pods do compilador via K8s MCP, checa fila no Prometheus e busca erros no Loki. | Laudo de Causa-Raiz discriminando se foi loop de macro TeX (Aplicação) ou falta de memória no nó (Infraestrutura). |
| **"O erro recente no backend foi provocado por código ou por saturação do cluster?"** | Cruza stacktraces do GlitchTip com condições dos nós (`NodePressure`) e limites de cgroups. | Veredito com badge categorizado: 🔴 **[INFRAESTRUTURA]**, 🔵 **[APLICAÇÃO]** ou 🟡 **[MISTA]**. |
| **"Houve algum pod que reiniciou por OOMKilled (ExitCode 137) hoje?"** | Varre `lastTerminationExitCode == 137` em todos os pods do namespace `production`. | Lista dos pods afetados, horário da queda e se o resource limit está subdimensionado. |
| **"Qual foi a causa da lentidão do checkout/login às 14:10?"** | Analisa séries temporais de latência no Prometheus e busca logs correlacionados no Loki. | Linha do tempo (timeline) detalhando o momento exato em que a latência começou a subir. |
| **"Identifique se a queda do pod foi provocada por vazamento de memória (memory leak) contínuo."** | Analisa a curva de alocação de memória no tempo e logs de `heap out of memory`. | Diferenciação entre pico súbito de tráfego vs. vazamento progressivo de heap no Node.js/Python. |

---

## ☸️ Categoria 2: Inspeção do Cluster Kubernetes (K8s MCP)

*Perguntas diretas sobre integridade de nós, réplicas, cgroups e probes de saúde.*

* **"Liste todos os pods que estão com problemas (`CrashLoopBackOff`, `Pending` ou restarts > 0)."**
* **"Algum nó do cluster está em estado de alerta (`MemoryPressure`, `DiskPressure` ou `PIDPressure`)?"**
* **"Quais foram os últimos 15 eventos de `Warning` gerados no namespace do sistema?"**
* **"O pod do `compiler-worker` está sofrendo com CPU throttling ou falha nas probes de liveness/readiness?"**
* **"Mostre o motivo e o exit code do último encerramento do pod do Fastify."**
* **"Verifique se o CoreDNS e a rede CNI estão saudáveis e resolvendo nomes internos normalmente."**

---

## 📜 Categoria 3: Análise de Logs Estruturados e Bugs (Loki & GlitchTip MCP)

*Investigação em profundidade nos logs sem sobrecarregar a janela de contexto com texto bruto.*

* **"Quais são os 5 erros mais frequentes registrados nos logs do backend na última hora?"**
* **"Existem erros de timeout ou falha de conexão com o banco de dados PostgreSQL nos logs?"**
* **"Mostre a stacktrace completa, com arquivo e linha, do erro mais recente capturado no GlitchTip."**
* **"O compilador LaTeX registrou erros de pacotes ausentes (`package_missing`) nas últimas compilações?"**
* **"Busque se houve respostas HTTP 5xx nas rotas de colaboração em tempo real (`/ws/documents`)."**
* **"Houve erro de comunicação com provedores acadêmicos externos (arXiv, Semantic Scholar ou OpenAlex)?"**

---

## 📈 Categoria 4: Métricas de Desempenho e Capacidade (Prometheus MCP)

*Consultas instantâneas traduzidas em indicadores claros para o operador.*

* **"Como está o consumo do pool de conexões do PostgreSQL neste momento? Estamos perto do limite máximo?"**
* **"Qual é a latência $p95$ e $p99$ das requisições HTTP do Fastify nos últimos 15 minutos?"**
* **"Quantas compilações LaTeX estão ativas simultaneamente e qual é o tamanho atual da fila de espera?"**
* **"Como está o consumo de memória RAM do Redis e quantas leases de documentos colaborativos estão ativas?"**
* **"O throughput global da plataforma (RPS) sofreu alguma queda brusca durante a última hora?"**
* **"Qual é o lag do Event Loop do Node.js no backend? Ele está bloqueado por processamento pesado?"**

---

## 🧠 Categoria 5: LLMOps e Agentes de IA (Opik MCP)

*Visibilidade operacional sobre os grafos LangGraph e modelos do `ai-service`.*

* **"Quais nós do grafo LangGraph falharam nas execuções recentes do `ai-service`?"**
* **"Alguma requisição para modelo de linguagem estourou o limite máximo de tokens de contexto?"**
* **"O semáforo distribuído de 3 segundos do arXiv no Redis está bloqueando ou enfileirando requisições?"**
* **"Qual é a latência média de Time to First Token (TTFT) das respostas de streaming da IA hoje?"**
* **"Houve erro de quebra de contrato JSON nas saídas geradas pelos modelos externos (Gemini/OpenAI)?"**
* **"Qual foi o custo estimado de tokens de IA gerado pela plataforma nas últimas 24 horas?"**

---

## 🛠️ Categoria 6: Proposta de Ações e Remediação (Human-in-the-Loop)

*O AIOps Copilot nunca executa ações de escrita sozinho. Você pode pedir para ele planejar e formular uma remediação segura.*

* **"O que você recomenda fazer para mitigar a saturação do pool de conexões do banco agora?"**
* **"Elabore uma proposta segura para reiniciar o deployment do `compiler-worker` sem perder jobs em andamento."**
* **"Como podemos liberar a memória travada no container sem derrubar os pesquisadores com salas ativas?"**
* **"Gere um plano de ação preventiva definitivo para que essa falha de dependência não ocorra no próximo deploy."**

---

## 📋 Como o Agente Responde

Quando você faz uma pergunta diagnóstica, o agente estrutura a resposta no seguinte formato:

```markdown
# 📋 Laudo de Análise de Causa-Raiz (RCA) — Incidente #a1b2c3d4
**Classificação Principal:** [INFRAESTRUTURA]
**Serviço Afetado:** `compiler-worker` | **Namespace:** `production`

### 1. Resumo Executivo
O pod `compiler-worker-7f8d9b-x2k9q` foi terminado por OOMKilled (ExitCode 137). 
Excedeu a cota de memória de 512MiB configurada no cgroup do Kubernetes.

### 2. Evidências Coletadas via MCP
- **Kubernetes:** 3 reinicializações nos últimos 15 minutos com status CrashLoopBackOff.
- **Prometheus:** Uso de RAM atingiu 100% do limit sem indício de memory leak linear prévio.
- **Loki:** O processo pdflatex foi interrompido abruptamente com SIGKILL do kernel.

### 3. Ações Recomendadas (Human-in-the-Loop)
[Card Interativo com Botão: Aprovar e Executar Ação]
Comando: kubectl rollout restart deployment/compiler-worker -n production
Risco: Baixo
```

---

## 💡 Dicas de Uso no Painel

1. **Investigação Contextual em 1 Clique:**
   Na aba **3. Infraestrutura** do `/admin`, clique no botão `[Investigar com AIOps]` dentro de qualquer card (*Backend Fastify*, *SciAI*, *Compilador* ou *Postgres*). O drawer abre com o foco já pré-configurado para aquele componente.
2. **Histórico e Auditoria:**
   Toda proposta de remediação aprovada por você é assinada pelo seu usuário e gravada na tabela imutável `AiopsActionAuditLedger` para fins de governança e auditoria (ADR-012/ADR-018).
