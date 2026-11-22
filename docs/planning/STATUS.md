# 📌 Status de Desenvolvimento & Guia de Retomada (`STATUS.md`)

**Projeto:** SCIA — Scientific Collaboration and Intelligent Assistance (`sci-latex-vscode`)  
**Última Atualização:** 20 de Novembro de 2026  
**Status Geral do Projeto:** 🟢 **Reestruturação e Centralização da Documentação (`docs/`) e Visualizador de Topologia Concluídos.**
- **Reorganização Estrutural da Documentação (`docs/`):**
  1. **Taxonomia Padronizada:** A raiz de `docs/` foi saneada e organizada em domínios canônicos: `architecture/` (análises, banco e topologia), `product/` (diretrizes e jornadas), `specs/` (pasta única com TRD, design system e features), `planning/` (status, roadmap, planos e discussões), `guides/` (infraestrutura, observabilidade e AIOps) e `assets/` (imagens, mídia e apresentações).
  2. **Unificação e Eliminação de Duplicidades:** Pasta `specs` duplicada removida de `planning/`, mapa mental de literatura incorporado em [`literature-intelligence-spec.md`](../specs/literature-intelligence-spec.md) e guias redundantes de observabilidade consolidados em [`guia-observabilidade.md`](../guides/observability/guia-observabilidade.md).
  3. **Portal Central Unificado:** Criado [`docs/README.md`](file:///mnt/c0b6217c-c2f3-4c1f-8ba2-c8d177f718a9/development/professional/sci-latex-vscode/docs/README.md) com tabela de navegação rápida orientada à necessidade do desenvolvedor/arquiteto e índice temático completo.
- **Funcionalidades da Topologia Inter-Serviços (Aba 6):**
  1. **Visualizador em Tempo Real Ponta a Ponta:** Tráfego entre Frontend SPA, Fastify Gateway, Compiler TeX Live, MinIO S3, PostgreSQL/PgBouncer, Redis, SciAI Engine e Opik LLMOps transmitido via Server-Sent Events (`telemetryBus`).
  2. **Persistência de Nós em Processamento Ativo:** O nó do compilador (`compiler-worker`) e o da IA (`sciai-engine`) mantêm-se acesos com badge `⚡ Ativo` e pulso suave durante 100% da duração da compilação e do streaming de tokens SSE.
  3. **Suporte a Múltiplas Réplicas de Pods K8s (HPA):** Suporte nativo à renderização dinâmica de réplicas de pods Fastify baseadas em document ownership leases do Redis (`documentsByPod`), com cenário de simulação de escalabilidade horizontal.
  4. **Design e UX Refinados:** Removidos cards saltantes e botões desnecessários; arestas com linhas vibrantes roxo/índigo (`#6366f1`) e partículas ciano/magenta disparadas sob demanda.
  5. **Resiliência Fail-Open no AI Service:** Flush do Opik isolado em thread pool assíncrona (`asyncio.to_thread` com timeout de 2.0s), eliminando qualquer risco de travamento do event loop do Uvicorn ou das probes `/health`.
- **Métricas Atuais de Testes:** 85/85 testes de backend aprovados, 6/6 testes de frontend aprovados e build de produção concluído com 0 erros.
- **Evolução Arquitetural Aprovada e Implementada (ADR-018 & ADR-012 & ADR-015):** 
  1. **Separação Estrita de Domínios:** O domínio SRE/AIOps está 100% isolado do domínio científico da plataforma (Belisa e agentes acadêmicos). Código hospedado em `ai-service/app/agents/aiops/` com ferramentas e especialistas dedicados.
  2. **Topologia Hierárquica de Especialistas (Substituição de Regex por Tool Calling):** 
     - SRE Supervisor Agent orquestrando 6 Especialistas Operacionais: Kubernetes/Containers, Loki (Logs), Prometheus (Métricas), GlitchTip (Exceções), Opik (LLMOps) e PostgreSQL/PgBouncer.
     - **Provisionamento e Telemetria do PgBouncer (ADR-015):** Contêiner `sci_latex_pgbouncer` provisionado na porta `6543` em modo `transaction pooling` com monitoramento via console administrativa (`SHOW POOLS;`, `SHOW STATS;`).
     - **Ferramentas MCP de Banco:** `postgres_inspect_health`, `postgres_check_slow_queries_and_locks` e `pgbouncer_inspect_pools`.
     - **Skill Modular Oficial PostgreSQL & PgBouncer:** 25 arquivos modulares estruturados em `references/`, `diagnostics/`, `workflows/`, `sql/` e `schemas/` com limiares de SLA (Cache Hit Ratio >= 99%, `cl_waiting == 0`, detecção de `idle in transaction`, contenção de locks).
     - Integração com o Servidor MCP oficial do Opik (`mcp==2.3.0`, `opik-mcp`) e as Skills oficiais (`.agents/skills/opik*`).
     - **Skills de Runtime Autocontidas com Lazy Loading:** Estruturadas em `ai-service/app/agents/aiops/skills/` com carregador `loader.py` memoizado (`@lru_cache`) que suporta carregamento pontual por subtópico (`read_operational_skill(skill_name, topic)`), prevenindo sobrecarga de contexto na LLM.
     - **Skill Modular Oficial de Operações Kubernetes:** 19 arquivos modulares com base na documentação oficial (`kubernetes.io/docs/home/`), com playbooks de `crashloopbackoff.md`, `oomkilled.md`, `pending-and-scheduling.md`, `probe-failures.md`, `node-pressure-and-eviction.md` e `image-pull-errors.md`.
  3. **Autenticação Machine-to-Machine Criptográfica via JWT (ADR-012):**
     - O Fastify emite tokens JWT assinados (`type: 'SERVICE'`, `sub: 'service:aiops'`, `scopes: ['aiops:chat', 'observability:read']`, `actor: { userId, email }`, `exp: 15m`).
     - O `ai-service` valida a assinatura criptográfica via `verify_m2m_token` (`app/core/m2m_auth.py`), garantindo o princípio do menor privilégio, rejeitando acessos não autorizados com 401 e eliminando o risco de *Prompt Injection* como administrador.
  4. **Isolamento de Banco de Dados (`sci_aiops_db`):** Base `sci_aiops_db` provisionada no PostgreSQL para isolamento de carga operacional, logs de auditoria e retenção segregada (60 dias), garantindo blast radius zero sobre `sci_latex_db`.
  5. **Frontend Otimizado com Zero Lag de Digitação & Quick Actions:**
     - Digitação no chat drawer isolada no componente memoizado `ChatInputBar` e renderizador Markdown (`ChatMarkdownRenderer`) com `React.memo` (elimina reparsing contínuo da AST).
     - Botão "Nova Conversa" para reinicialização limpa de sessão.
     - 6 Quick Action Chips para guiar o operador humano sem tela cega.
- **Métricas Atuais de Testes:** 85/85 testes de backend aprovados, 6/6 testes de frontend aprovados e build de produção concluído com 0 erros.

---

## ⚡ 1. Onde Parei & Como Retomar (Session Checkpoint)

> [!IMPORTANT]
> **Consulte esta seção sempre que iniciar ou retomar uma sessão de desenvolvimento.** Ela indica exatamente a última alteração realizada e qual o primeiro comando/tarefa a ser executado.

### 🔍 Estado Atual da Aplicação
  * **Branch Ativa:** `feature/admin-service-topology-react-flow`
  * **Visualizador em Tempo Real da Topologia de Serviços no Admin Center (Nova Aba 6 com React Flow):**
    * **Diretriz de Não Substituição Atendida:** Todas as 5 abas originais do SCIA Admin Center (ADR-014) permanecem 100% preservadas e intactas.
    * **Nova Aba Implementada:** `6. Topologia de Serviços` adicionada no [AdminCenterPage.tsx](file:///mnt/c0b6217c-c2f3-4c1f-8ba2-c8d177f718a9/development/professional/sci-latex-vscode/frontend/src/features/admin/AdminCenterPage.tsx) e [ServiceTopologyTab.tsx](file:///mnt/c0b6217c-c2f3-4c1f-8ba2-c8d177f718a9/development/professional/sci-latex-vscode/frontend/src/features/admin/tabs/ServiceTopologyTab.tsx).
    * **Integração em Tempo Real Ponta a Ponta via Server-Sent Events (SSE):**
      * `backend/src/infra/telemetry-bus.ts`: Barramento leve `telemetryBus` transmitindo `TrafficTelemetryEvent`.
      * `backend/src/modules/documents/documents.service.ts`: Disparo automático de eventos de tráfego inter-serviços ao executar `compileDocument()` (Frontend $\rightarrow$ Fastify $\rightarrow$ Compiler:4000 $\rightarrow$ MinIO:9000 $\rightarrow$ Fastify $\rightarrow$ Frontend).
      * `backend/src/modules/admin/admin.controller.ts`: Transmissão contínua de eventos `TRAFFIC_EVENT` no endpoint SSE `/admin/dashboard/events`.
      * `frontend/src/features/admin/hooks/useAdminTrafficStream.ts`: Hook reativo capturando eventos do cluster em tempo real com streaming `fetch`.
    * **Componentes de Grafo com `@xyflow/react`:**
      * `ServiceTopologyNode.tsx`: Card informativo de serviço puro (sem botões), com ícone, semáforo (`UP`, `DEGRADED`, `DOWN`), métricas-chave em tempo real, sem saltos de posição (`transform: none`) com efeito de piscar suave (`@keyframes topologyNodeBlink`) durante processamento ativo (`isProcessing`). Exibe métrica explícita de `Documentos (Owner)` gerenciados pela autoridade single-writer OT.
      * `LiveCommunicationEdge.tsx`: Aresta SVG com linhas vibrantes roxo/índigo (`#6366f1`) e animação de partículas (`<animateMotion>`) em ciano brilhante acionadas sob demanda durante requisições reais ou simulação (`isTransmitting`).
      * `ServiceTopologyFlow.tsx`: Canvas interativo responsivo renderizado via `AutoSizer` (100% viewport), Background de pontos, Controls de zoom e MiniMap.
      * `topologyConfig.ts`: Mapeamento espacial dos 8 nós com espaçamento amplo, suporte dinâmico a múltiplas réplicas de Pods Kubernetes (`documentsByPod`), cenário de simulação de escalabilidade HPA e métricas discriminando `Processando (Ativos)` vs `Em Fila (Aguardando)`.
      * `backend/src/modules/ai/ai.routes.ts`: Instrumentação em tempo real via `telemetryBus` para conversas com a **Agente Belisa** e Copiloto SciAI (`Frontend -> Fastify -> SciAI Engine -> Opik`), acendendo a malha e mantendo o nó de IA ativo durante a geração de tokens.
    * **Especificação Técnica:** Documentada em [`service-topology-visualizer-spec.md`](file:///mnt/c0b6217c-c2f3-4c1f-8ba2-c8d177f718a9/development/professional/sci-latex-vscode/docs/planning/specs/service-topology-visualizer-spec.md).
    * **Testes e Build:** 85/85 testes de backend aprovados, 12/12 testes de frontend aprovados (`npm test`), compilação TypeScript com 0 erros (`tsc -b`) e bundle de produção concluído com sucesso (`npm run build`).
  * **AIOps Copilot com MCP e Diagnóstico de Causa-Raiz (ADR-018 Concluída com Sucesso):**
    * **Decisão Arquitetural Formalizada:** Documentada em [`ADR-018`](file:///mnt/c0b6217c-c2f3-4c1f-8ba2-c8d177f718a9/development/professional/sci-latex-vscode/docs/architecture/adrs/adr-018-aiops-copilot-mcp-root-cause-analysis-admin-center.md).
    * **Manual Operacional de Perguntas:** Catálogo com mais de 30 perguntas operacionais estruturadas em 6 categorias documentado em [`GUIA_PERGUNTAS_AIOPS_COPILOT.md`](file:///mnt/c0b6217c-c2f3-4c1f-8ba2-c8d177f718a9/development/professional/sci-latex-vscode/docs/GUIA_PERGUNTAS_AIOPS_COPILOT.md).
    * **Roteamento Dinâmico de Prompts:** `chatWithAgent` em `backend/src/modules/admin/aiops/aiops.service.ts` inspeciona a intenção da mensagem e consulta as ferramentas MCP em tempo real:
      * `K8S_INSPECTION`: Inspeciona pods, nós, exit codes (`OOMKilled 137`) e condições de pressão.
      * `PROMETHEUS_METRICS`: Executa consultas instantâneas de uso de heap, pools de conexão do Postgres e RPS.
      * `LOKI_LOGS`: Executa buscas de logs de erro (`{service_name=~".+"} |= "error"`), extraindo amostras recentes e distribuição de níveis.
      * `GLITCHTIP_ISSUES`: Rastreia exceções não resolvidas e culprits de código.
      * `OPIK_TRACES`: Monitora traces e spans de grafos LangGraph no `ai-service`.
      * `REMEDIATION_ACTION`: Gera card interativo `AiopsRcaSuggestedAction` para execução com Human-in-the-Loop.
      * `SYSTEM_OVERVIEW`: Matriz consolidada de saúde com cross-telemetria dos 5 pilares de observabilidade.
    * **Testes e Compilação:**
      * Backend: 83/83 testes aprovados no Vitest (`npm test`).
      * Frontend: 6/6 testes aprovados no Vitest (`npm test`), build de produção concluído com sucesso (`npm run build`).
  * **Governança de Templates LaTeX Oficiais e Storage Architecture (ADR-017 Atualizada e Concluída):**
    * **Decisão Arquitetural e Especificação Aprovadas:** Documentadas em [`ADR-017`](file:///mnt/c0b6217c-c2f3-4c1f-8ba2-c8d177f718a9/development/professional/sci-latex-vscode/docs/architecture/adrs/adr-017-latex-templates-governance-and-storage-architecture.md) e [`latex-templates-governance-spec.md`](file:///mnt/c0b6217c-c2f3-4c1f-8ba2-c8d177f718a9/development/professional/sci-latex-vscode/docs/specs/latex-templates-governance-spec.md).
    * **Centralização no Admin (Aba 7 "7. Templates LaTeX"):** Implementada `TemplatesTab.tsx` com `GenericDataGrid`, upload drag-and-drop, download temporário do `.zip` via URL pré-assinada do MinIO e exclusão segura.
    * **Slugs Estritos `[editora]-[tipo]` & Sobrescrita Mandatória:** Identificadores canônicos determinísticos sem sufixos de anos (ex: `ieee-artigo`, `sbc-resumo`). Sobrescrita imediata no MinIO e banco a cada upload institucional.
    * **Armazenamento Dinâmico no MinIO:** Eliminação de nomes estáticos (`bundle.zip`), higienizando e preservando o nome original do arquivo compactado enviado pelo administrador (`templates/${slug}/${cleanFileName}`).
    * **Metadados Obrigatórios Sem Fallback do TeX:**
      * Editora/Sociedade (`publisher`): Campo aberto de texto livre (não restrito a select).
      * Nome de Exibição (`name`): Campo obrigatório no cadastro. Removido qualquer fallback automático que extraísse `\title{...}` de arquivos TeX de exemplo.
    * **Autonomia dos Artigos & Desacoplamento:** Artigos clonam arquivos para `ProjectFile` no ato da criação. Exclusão de templates do catálogo aplica `onDelete: SetNull`, mantendo todos os projetos existentes íntegros e compiláveis.
  * **Qualidade de Código e Arquitetura Frontend:**
    * **Remoção de Anti-Pattern no CodeMirrorEditor:** Eliminado bloco artificial de re-exportações para retrocompatibilidade em `CodeMirrorEditor.tsx`; módulos consumidores importam diretamente de seus arquivos modulares de extensão.
    * **Resolução de Warnings de Hooks:** 0 warnings no ESLint (`npm run lint`), com memoização adequada de sources e efeitos de ciclo de vida devidamente documentados.
      * `backend/src/modules/documents/documents.repository.ts`: Consultas e checkpoints salvam o arquivo apontado por `mainEntryPath`, lançando `DocumentIntegrityError` se faltar no banco.
      * `backend/src/modules/documents/documents.service.ts` & `documents.websocket.ts`: OT, broadcast, versionamento e snapshots atrelados dinamicamente ao `mainEntryPath`.
      * `compiler/src/server.ts`: Compilador TeXLive exige que `mainEntry` conste explicitamente na lista de arquivos recebidos (*fail-fast* 400).
      * `frontend`: `EditorWorkspace.tsx`, `FileTreeSidebar.tsx` e `CollabEditorContext.tsx` renderizam a árvore fiel aos arquivos do evento e vinculam a digitação e compilação ao arquivo principal original.
  * **Stack de Observabilidade On-Premise Integral (ADR-013 Finalizada):**
    * **Visualização no Grafana:**
      * Criado dashboard pré-moldado oficial em [`scia-overview-dashboard.json`](file:///home/gilson-russo/development/professional/sci-latex-vscode/infra/observability/grafana/provisioning/dashboards/scia-overview-dashboard.json) contendo: RPS do backend, Latência P95, Conexões WebSocket ativas, Checkpoints pendentes (RAM -> PostgreSQL), Salas ativas de edição, Taxa de compilações TeX por status e tempo médio.
    * **Propagação W3C Trace Context (`traceparent` / `x-trace-id`):**
      * `backend/src/infra/tracing/tracing.plugin.ts`: Plugin Fastify com geração/propagação de cabeçalhos W3C `traceparent` (`00-{traceId}-{spanId}-01`), com 2/2 testes unitários aprovados.
      * `ai-service/app/main.py`: Middleware ASGI injetando e propagando `traceparent` e `x-trace-id` nas respostas HTTP.
    * **Rate-Limiting Distribuído do arXiv no Redis:**
      * `ai-service/app/agents/tools/arxiv.py`: Implementada coordenação atômica de 3.1s via lock no Redis (`rate_limit:arxiv:global_lock`) compartilhada entre múltiplos pods no Kubernetes, com fail-open automático para throttle local em RAM.
    * **LLMOps com Opik & Gestão de Exceções com GlitchTip:**
      * `infra/observability/docker-compose.yml`: Adicionados serviços `opik` (Comet Opik UI na porta 5174 e API na 8081), `opik-mysql`, `opik-clickhouse`, `opik-server`, `glitchtip-web` (:8005) e `glitchtip-worker`.
      * `infra/observability/.env.example`: Template de variáveis de ambiente sem dados sensíveis hardcoded.
      * `ai-service/app/core/opik_tracer.py`: Helper assíncrono `get_correlated_opik_tracer` correlacionado com o W3C Trace Context e fail-open estrito, com testes aprovados.
    * **Governança Kubernetes & Helm (`k8s/`):**
      * Todos os arquivos YAML comentados linha a linha com explicações didáticas em português.
      * Criados arquivos `README.md` dedicados em cada subpasta (`k8s/manifests/`, `k8s/monitoring/`, `k8s/argocd/`, `k8s/kind/`, `scripts/`).
      * Helper local `scripts/argocd-ui.sh` atualizado para abrir túneis dinâmicos de Frontend, Backend, ArgoCD, Grafana (:3001) e Prometheus (:9090) com um comando.
  * **Stack de Observabilidade On-Premise Operacionalizada (ADR-013 Integrada):**
    * **Infraestrutura Declarativa de Observabilidade (`infra/observability/`):**
      * `docker-compose.yml`: Orquestração completa de 6 serviços de observabilidade isolados na rede `scia-network`: Grafana (porta 3001), Prometheus (porta 9090), Loki (porta 3100), Grafana Alloy (porta 12345), OpenTelemetry Collector (portas 4317 gRPC, 4318 HTTP, 8889 metrics) e Grafana Tempo (porta 3200).
      * `prometheus.yml`: Configuração de scraping periódico (10s-15s) nos 3 serviços principais (`scia-backend:3333/metrics`, `scia-ai-service:8000/metrics`, `scia-compiler:4000/metrics`) e no próprio coletor OTel.
      * `otelcol-config.yaml`: Processador de *tail-sampling* configurado com retenção a 100% para erros HTTP $\ge 500$, spans com status de erro nativo, latência $> 2000$ms e microsserviços críticos (`ai-service` e `compiler`), com amostragem probabilística de 10% nas rotas de rotina.
      * `config.alloy`: Agente moderno Grafana Alloy para descoberta de contêineres Docker e encaminhamento para o Loki com *Structured Metadata* (`trace_id`, `user_id`, `article_id`), evitando explosão de cardinalidade em streams.
      * `loki-config.yaml`: Modo TSDB v13 com retenção de 15 dias e suporte nativo a metadados estruturados.
      * `tempo.yaml`: Armazenamento local de traces com WAL e receptores OTLP gRPC/HTTP ativos.
      * `grafana/provisioning/`: Data Sources provisionados automaticamente (Prometheus default, Loki, Tempo com Data Link bidirecional entre traces e logs).
      * `README.md`: Guia de inicialização local com `docker compose up -d`, mapa de portas e descrição das métricas.
    * **Instrumentação de Telemetria no Backend Fastify (`backend/`):**
      * Migração para o pacote oficial e moderno `@prometheus-io/client` (eliminando o aviso de deprecation do antigo `prom-client`).
      * `backend/src/infra/metrics/metrics.plugin.ts`: Plugin de métricas ativado com coleta padrão de runtime (`scia_backend_*`), métricas HTTP com normalização de rotas (`scia_backend_http_requests_total`, `scia_backend_http_request_duration_seconds`) e métricas de colaboração (`scia_backend_collab_active_rooms`, `scia_backend_collab_connected_sockets`, `scia_backend_collab_pending_checkpoints`).
      * Endpoint `/metrics` exposto e coberto por testes unitários (`src/infra/metrics/__tests__/metrics.plugin.test.ts`).
    * **Instrumentação de Telemetria no AI Service (`ai-service/`):**
      * Instalação de `prometheus-fastapi-instrumentator>=8.1.0` via `uv`.
      * Instrumentação global no `app/main.py` com métricas HTTP e indicador de concorrência (`scia_ai_requests_inprogress`), expondo `/metrics`.
      * Suíte de testes criada em `tests/test_metrics.py` com 100% de aprovação.
    * **Instrumentação de Telemetria no Compilador LaTeX (`compiler/`):**
      * Instalação de `@prometheus-io/client` e instrumentação do Fastify worker em `compiler/src/server.ts`.
      * Métricas expostas: `scia_compiler_jobs_total{status="success|compilation_error|internal_error"}`, `scia_compiler_duration_seconds`, `scia_compiler_active_jobs` e `/metrics`.
    * **Qualidade, Compilação e Testes Automatizados:**
      * Backend Vitest: 15/15 suítes passando (70/70 testes unitários).
      * AI Service Pytest: 11/11 testes passando.
      * Monorepo Build: 0 erros no TypeScript do backend (`tsc`), frontend (`tsc -b && vite build`) e compilador (`tsc --noEmit`).
  * **SCIA Literature Intelligence & Ficha Científica (ADR-016 Integrada):**
    * **Decisão Arquitetural e Especificações Formais:**
      * Registrada a [`ADR-016`](file:///home/gilson-russo/development/professional/sci-latex-vscode/docs/architecture/adrs/adr-016-scia-literature-intelligence-paper-analysis-and-react-flow.md) cobrindo os 4 pilares: Skill de auditoria em 6 etapas, subagente em quarentena de contexto (`methodology-reviewer`), mapa mental com `@xyflow/react` sob licença MIT livre e cache relacional com deduplicação por DOI.
      * Criada a especificação técnica em [`docs/planning/specs/literature-intelligence-spec.md`](file:///home/gilson-russo/development/professional/sci-latex-vscode/docs/planning/specs/literature-intelligence-spec.md).
      * Atualizado o [`docs/planning/ROADMAP.md`](file:///home/gilson-russo/development/professional/sci-latex-vscode/docs/planning/ROADMAP.md) com a Fase 10.
    * **Skill Acadêmica Especializada (`scientific-article-analysis`):**
      * Importada para `ai-service/skills/scientific-article-analysis/SKILL.md`, `ai/skills/` e `~/.gemini/config/skills/`.
    * **Subagente e Schemas Pydantic no `ai-service`:**
      * `app/schemas/paper_analysis.py`: Contrato tipado da Ficha Científica (`ScientificPaperAnalysis`) com pontos fortes, limitações declaradas, ameaças de validade interna/externa e aderência ao artigo do autor.
      * `app/agents/sub_agents/methodology_reviewer.py`: Subagente com saída estruturada via LLM (`with_structured_output`) e fallback resiliente.
      * `app/api/v1/endpoints/paper_analysis.py`: Rotas `POST /internal/v1/papers/analyze` e `/analyze-batch` registradas no roteador oficial.
      * `tests/test_paper_analysis.py`: Suíte de testes automatizados com 10/10 testes aprovados (`uv run pytest`).
      * Teste prático gerado em `ai-service/reports/exemplo_analise_artigo.md` comprovando extração empírica de métricas, pontos fortes e limitações.
  * **Implementação Completa do SCIA Admin Center (ADR-014):**
    * **Backend BFF Fastify (`backend/src/modules/admin/`):**
      * Zod Schemas tipados (`admin.schemas.ts`) para os 5 domínios operacionais e streaming SSE.
      * Serviço agregador analítico (`admin.service.ts`) coletando métricas ativas de `activeDocs`, salas WebSocket, distribuição de artigos nas 6 etapas do funil oficial, gargalos (atrasos, estagnações, travas NIT), saúde dos 5 serviços com links profundos para Grafana e Opik, autoridade Single-Writer dos pods donos e logs de auditoria imutáveis.
      * Controller Fastify (`admin.controller.ts`) com handlers REST e streaming Server-Sent Events (`GET /dashboard/events`) com heartbeat a cada 5 segundos.
      * Rotas registradas (`admin.routes.ts` e `app.ts`) em `/api/v1/admin/dashboard/*` protegidas rigorosamente por JWT e RBAC `requireAdmin` (`Role.ADMIN`).
      * Testes unitários com Vitest (`admin.service.test.ts`): 6/6 testes passando com sucesso.
    * **Frontend React 19 (`frontend/src/features/admin/`):**
      * Cliente HTTP tipado (`adminCenterApi.ts`) e hooks com TanStack Query v5 (`useAdminCenterQueries.ts`) com suporte a auto-refresh parametrizado.
      * Master Page (`AdminCenterPage.tsx`) com navegação fluida em 5 abas, botão de atualização manual forçada e alternador de auto-refresh.
      * 5 Abas independentes em conformidade com o Design System:
        * `OverviewTab.tsx`: KPIs executivos (usuários ativos, artigos em produção, salas WebSocket, erros/hora) e taxa horária de requisições e OT.
        * `WorkflowTab.tsx`: Gargalos institucionais (atrasos, estagnações, travas NIT) e funil visual das 6 etapas com tempo médio.
        * `InfrastructureTab.tsx`: Semáforos operacionais de Backend Fastify, SciAI Engine, Compilador LaTeX, PostgreSQL e Redis, com deep-links para Grafana e Opik.
        * `CollaborationTab.tsx`: Métricas de Transformação Operacional em memória, latência RAM e tabela de pods com contagem de documentos e status de checkpoints ACID.
        * `ActivityTab.tsx`: Linha do tempo de auditoria com filtros por categoria (`EDITORIAL`, `COLLABORATION`, `COMPILER`, `SECURITY`).
      * Layout e Roteamento Exclusivo (`AdminLayout.tsx`, `RoleLayoutResolver.tsx`, `PersonaRootResolver.tsx` e `routes/index.tsx`): Isolamento total da persona `ADMIN`, sem misturar com a visão de autores, coordenadores ou gerentes.
      * Compilação Frontend e Backend com 0 erros (`tsc -b && vite build` e `tsc` no backend aprovados).
  * **Refatoração e Blindagem do Editor Colaborativo (ADR-007 Implementada e Aprovada):**
    * **Limpeza do Hot Path no Redis:** Removido o `rpush` de deltas de texto no Redis em `documents.service.ts`. A digitação opera em memória RAM do Pod dono com latência < 2ms.
    * **Debounce Híbrido Multi-Critério:** Implementado timer de inatividade (3s), teto máximo contínuo (15s) e corte por volume (50 ops) para garantir checkpoints regulares no PostgreSQL sem risco de perda sob digitação ininterrupta.
    * **Graceful Shutdown (`server.ts`):** Tratamento de `SIGTERM`/`SIGINT` para persistir todos os documentos ativos de `activeDocs` no PostgreSQL antes de encerrar o processo.
    * **Concorrência Otimista & Transação Atômica (`documents.repository.ts`):** `saveCheckpoint` unifica a atualização da versão do projeto, `ProjectFile.content` (`main.tex`), arquivos secundários (`filesCollab`) e `DocumentSnapshot` em uma única chamada `prisma.$transaction`, com validação de `expectedOldVersion`.
    * **Coordenação de Posse (Document Ownership Lease):** Primitivas `acquireDocumentLease` e `renewDocumentLease` no Redis (`editor:document:<docId>:owner`, TTL 10s renovado a cada 3s) garantindo autoridade Single-Writer por documento para orquestração multi-pod em Kubernetes.
    * **Estabilização do WebSocket no Frontend (`useCollabWebSocket.ts`):** Removido `activeFile` das dependências do socket para eliminar reconexões indesejadas ao alternar abas, e adicionada fila de retry offline (`messageQueueRef`).
    * **Sincronização Multi-Arquivo em Tempo Real:** O backend expõe `getAllCollabVersions` no `SYNC_INIT` e une o estado em memória quente em `listProjectFiles`. O frontend rastreia `fileCollabVersions` de forma isolada, corrigindo a propagação de alterações entre arquivos secundários.
  * **Auditoria de Segurança Inter-Serviços e Planejamento de Hardening:**
    * **ADR-012 Refinada (Identidade de Serviço e Delegação):** Documentada em [`docs/architecture/adrs/adr-012-m2m-security-evolution.md`](file:///home/gilson-russo/development/professional/sci-latex-vscode/docs/architecture/adrs/adr-012-m2m-security-evolution.md) a separação estrita das 4 dimensões (Autenticação, Autorização, Delegação e Auditoria), modelo `AuthenticatedPrincipal` (`type: 'USER' | 'SERVICE'`) e tokens de delegação verificáveis.
    * **Relatório Geral de Comunicação Inter-Serviços Revisado:** Consolidado em [`docs/RELATORIO_COMUNICACAO_INTER_SERVICOS_E_SEGURANCA.md`](file:///home/gilson-russo/development/professional/sci-latex-vscode/docs/RELATORIO_COMUNICACAO_INTER_SERVICOS_E_SEGURANCA.md) cobrindo requisitos de Sandbox Real do Compiler (usuário não privilegiado, limits cgroups, zero rede no TeX), privacidade estrita do MinIO (URLs pré-assinadas com sanitização de logs e anti-SSRF), separação de responsabilidades do Redis e roadmap em 4 fases por redução de risco.
    * **Guia de Defesa do Banco de Dados para Especialistas:** Consolidado em [`docs/FAQ_BANCO_DE_DADOS_ESPECIALISTAS.md`](file:///home/gilson-russo/development/professional/sci-latex-vscode/docs/FAQ_BANCO_DE_DADOS_ESPECIALISTAS.md) contendo respostas executivas e técnicas para sabatinas de DBAs sobre Capacidade, PgBouncer, CloudNativePG, Read Replicas e Fencing Tokens.
    * **ADR-015 Consolidada (Estratégia de Banco de Dados PostgreSQL 16):** Documentada em [`docs/architecture/adrs/adr-015-postgresql-scalability-ha-pgbouncer-and-read-replicas.md`](file:///home/gilson-russo/development/professional/sci-latex-vscode/docs/architecture/adrs/adr-015-postgresql-scalability-ha-pgbouncer-and-read-replicas.md) a decisão formal de topologia de alta disponibilidade (CloudNativePG 1 Primário + 2 Standbys com failover automático em 10-15s), gestão de conexões com PgBouncer na porta 6543 e o adiamento deliberado de Read Replicas com gatilho objetivo de CPU > 75%.
  * **Estruturação da Nova Camada de IA (`ai-service/`):**
    * **Triagem Limpa do `sci-project`**: Descartados códigos legados e complexidade acidental (compilador Docker síncrono bloqueante, WebSockets colaborativos YRoom com vazamento de memória, autenticação duplicada e CRUDs SQLModel locais).
    * **Extração do Núcleo de Agentes LangGraph**:
      * `ai-service/app/agents/state.py`: Estado compartilhado tipado (`OnboardingState`, `Article`, `TaskItem`).
      * `ai-service/app/agents/sub_agents/supervisor.py`: Orquestrador geral do fluxo guiado de 4 estágios.
      * `ai-service/app/agents/sub_agents/idea_refiner.py`: Guia de Exploração para refinamento de hipóteses e tema de pesquisa.
      * `ai-service/app/agents/sub_agents/search_specialist.py`: Especialista de busca bibliográfica prioritária no arXiv com fallback para Semantic Scholar e OpenAlex (`interrupt` Human-in-the-Loop).
      * `ai-service/app/agents/sub_agents/curation.py`: Curadoria de artigos e cálculo proporcional de datas nas 6 etapas fixas institucionais (sem criação artificial de tarefas por IA e respeitando o template do MinIO).
      * `ai-service/app/agents/writer.py`: Redator acadêmico LaTeX.
    * **Ferramentas de Pesquisa Científica com Connection Pooling & Rate-Limiting**:
      * `ai-service/app/agents/tools/arxiv.py`: Conector oficial do arXiv com semáforo unitário (`Semaphore(1)`), throttle mandatório de 3 segundos (ToU), timeout de 12s, fail-fast e parser nativo Atom 1.0 (XML).
      * `ai-service/app/agents/tools/openalex.py`: Conector com semáforo de concorrência e reaproveitamento de conexões TCP.
      * `ai-service/app/agents/tools/semantic_scholar.py`: Conector Semantic Scholar com retries e exponential backoff.
      * `ai-service/app/agents/tools/academic_search.py`: Facade unificada com contingência em 3 níveis (arXiv ➡️ S2 ➡️ OpenAlex).
      * `ai-service/app/agents/tools/tavily_search.py`: Busca web com Tavily.
    * **APIs e Streaming SSE**:
      * `ai-service/app/api/v1/endpoints/chat.py`: Endpoints `/chat/stream` e `/chat/resume` para o chat interativo.
      * `ai-service/app/api/v1/endpoints/runs.py`: Endpoints M2M assíncronos (`POST /runs`, `/resume`, `/cancel`) com autenticação `X-Internal-Service-Key`.
      * `ai-service/app/streaming/stream_processor.py`: Formatador enxuto de eventos Server-Sent Events.
    * **ADR 009 Proposta (Em Discussão):** Documentada em [`docs/architecture/adrs/adr-009-sciai-api-first-experimentation-and-service-enablement.md`](file:///home/gilson-russo/development/professional/sci-latex-vscode/docs/architecture/adrs/adr-009-sciai-api-first-experimentation-and-service-enablement.md) a estratégia de experimentação headless via API, sem acoplamento ao frontend, cobrindo o harness CLI, injeção de `MemorySaver` para suportar `interrupt()`, alinhamento do Ollama local (`qwen3.5:4b`) e rota para o redator LaTeX (`writer.py`).
  * **Referências de Chat Copilot & Onboarding no Frontend (`frontend/references-ai-chat/`):**
    * Copiados como modelo de implementação: `OnboardingChat.reference.tsx`, `onboardingApi.reference.ts` e `AIChatSidebar.reference.tsx`.
    * Criado `frontend/references-ai-chat/README.md` com diretrizes para adaptação ao design system do SCIA, tipagens e proxy Fastify.
  * **Arquitetura de Observabilidade Open Source e Soberania Institucional (ADR-013 Consolidada Definitiva):**
    * **ADR-013 Aprovada e Consolidada:** Documentada em [`docs/architecture/adrs/adr-013-observabilidade-on-premise-licenca-zero.md`](file:///home/gilson-russo/development/professional/sci-latex-vscode/docs/architecture/adrs/adr-013-observabilidade-on-premise-licenca-zero.md) a consolidação final de engenharia: rate-limiting distribuído do arXiv via Redis, topologia de tail-sampling em 2 camadas com atributos canônicos, fail-open assíncrono do Opik com `${__trace.traceId}`, GlitchTip desacoplado (Web + Celery Worker), dimensionamento estático de workers do compilador TeX (KEDA formalmente postergado para fase futura sob demanda de carga real), sanitização universal nos 4 emissores (incluindo Compiler) e pipeline self-monitoring.
    * **Especificação Técnica & WBS em 5 Fases:** Documentada em [`docs/planning/specs/observability-spec.md`](file:///home/gilson-russo/development/professional/sci-latex-vscode/docs/planning/specs/observability-spec.md) com compose completo e contratos de código.
    * **Tutorial Técnico Didático:** Atualizado em [`docs/TUTORIAL_OBSERVABILIDADE_ON_PREMISE.md`](file:///home/gilson-russo/development/professional/sci-latex-vscode/docs/TUTORIAL_OBSERVABILIDADE_ON_PREMISE.md).
  * **Diretrizes Oficiais de Gestão da Produção Científica no SCIA:**
    * Consolidado em [`docs/DIRETRIZES_GESTAO_PRODUCAO_CIENTIFICA_SCIA.md`](file:///home/gilson-russo/development/professional/sci-latex-vscode/docs/DIRETRIZES_GESTAO_PRODUCAO_CIENTIFICA_SCIA.md) o modelo de gestão por escopo unificado para Gerente (`Role.MANAGER`) e Coordenador (`Role.COORDINATOR`), o papel futuro do Diretor (visão global) e a separação estrita do Administrador (`Role.ADMIN`).
    * **Kanban como Visualização Pura (Read-Only):** Formalizado que o Kanban no SCIA é estritamente uma lente visual para acompanhamento de tarefas da Etapa 3, sem drag-and-drop de etapas nem quebra dos Gatekeepers (NIT e Congresso).
  * **SCIA Admin Center: Painel Administrativo de Observabilidade, Operação e Governança Científica (ADR-014 Consolidada):**
    * **ADR-014 Aprovada e Consolidada:** Documentada em [`docs/architecture/adrs/adr-014-painel-admin-saude-e-metricas-aplicacao.md`](file:///home/gilson-russo/development/professional/sci-latex-vscode/docs/architecture/adrs/adr-014-painel-admin-saude-e-metricas-aplicacao.md) a concepção do **SCIA Admin Center** (`/admin`), exclusivo para `Role.ADMIN`, estruturado em 5 áreas fundamentais: (1) Visão Geral ao vivo, (2) Fluxo Científico (6 etapas, atrasos, NIT), (3) Infraestrutura com semáforos e links Grafana, (4) Colaboração em Tempo Real (Pods donos, OT/s, leases) e (5) Atividade & Auditoria (timeline ao vivo).
    * **Especificação Técnica & WBS em 4 Fases:** Detalhada em [`docs/planning/specs/system-admin-health-dashboard-spec.md`](file:///home/gilson-russo/development/professional/sci-latex-vscode/docs/planning/specs/system-admin-health-dashboard-spec.md) com contratos REST (`/api/v1/admin/dashboard/*`), canal SSE em tempo real (`/events`) e componentização no React 19.
  * **Workflow Editorial & Persistência ACID (ADR-008 & ADR-010):**
    * **Versionamento Relacional Nativo:** Toda colaboração é gerenciada por Transformação Operacional e snapshots no PostgreSQL.
    * **Régua Institucional de 6 Etapas Fixas:** Imutabilidade da ordem 1 a 6 e travas invioláveis de Gatekeepers (Etapa 5 NIT 🔒 e Etapa 6 Congresso Alvo 🔒).
    * **Persistência Durável de Apontamentos (`ReviewComment`):** Anotações inline ancoradas no TeX, respostas e resoluções salvas com atomicidade relacional no PostgreSQL.
  * **Encapsulamento Arquitetural de Frontend (SOC & TanStack Query Hooks):**
    * **Hooks de Mutação Reutilizáveis**: Modais (`CreateTaskModal`, `AddMemberModal`, `CreateStageModal`, `ProjectSettingsModal`) desprovidos de chamadas diretas a `api.post`/`tasksService` ou `queryClient.invalidateQueries`. Mutação e invalidação de cache centralizadas em `frontend/src/hooks/` (`useTaskQueries.ts`, `useProjectQueries.ts`).
    * **Promises Assíncronas no `onSuccess`**: Callbacks `onSuccess` configurados como `async () => { await queryClient.invalidateQueries(...); }` eliminando avisos do ESLint (`@typescript-eslint/no-floating-promises`).
  * **Qualidade de Código, Padrões React & Desempenho:**
    * **Exclusividade de Named Exports**: Removidos todos os `export default` dos componentes React (`ProjectSettingsModal`, `ReleaseCandidatesModal`, `GanttTimelineView`, `GanttHeaderStats`, `GanttChartGrid`). Padrão `export const ComponentName = ...` adotado em 100% dos componentes.
    * **Refatoração DRY & Eliminação de Ternários Complexos**: Criados sub-componentes auxiliares reutilizáveis (`EmptyStateCard`, `LoadingStateSpinner`) e helpers utilitários (`getGatekeeperStatusChipProps`, `getRcStatusChipProps`, `getStagePlannedDateString`) no `ProjectSettingsModal.tsx`.
    * **Processamento Paralelo (`Promise.all`)**: Substituídas as repetições sequenciais `for (const x of arr) { await ... }` por requisições paralelas via `Promise.all(...)`, resolvendo o aviso `no-await-in-loop` e otimizando a resposta ao salvar configurações.
    * **Remoção de Mocked Fallbacks**: Removidos valores hardcoded de testes, exibindo diretamente as propriedades do modelo de dados real.
  * **Validação de Compilação, Linter & Formatação:**
    * Monorepo Lint: 0 erros e 0 warnings no ESLint do backend e frontend (`npm run lint`).
    * Monorepo Prettier: `npm run format` executado e `npm run format:check` passando com 100% dos arquivos ajustados.
    * Backend Unit Tests: 18/18 suítes de teste passando (63/63 testes unitários aprovados).
    * Backend & Frontend Build: Compilação TypeScript e Vite estática concluída com 0 erros (`npm run build`).

---

### 🚀 Próximas Atividades Imediatas (Escolha para Retomar)

#### 🎯 Opção 1 (Recomendada - Camada de IA): Integração da Gaveta SciAI no Frontend
1. **Atividade 1.1:** Transpor os componentes de referência (`frontend/references-ai-chat/`) para o layout oficial do editor no frontend, criando a `<AIChatSidebar />`.
2. **Atividade 1.2:** Conectar a gaveta ao endpoint de streaming SSE do backend Fastify `/api/v1/ai/chat/stream`.
3. *Arquivo de Referência:* [`docs/planning/specs/sciai-chat-copilot-spec.md`](file:///home/gilson-russo/development/professional/sci-latex-vscode/docs/planning/specs/sciai-chat-copilot-spec.md)

#### 🛠️ Opção 2 (Novo Recurso): Painel Admin em Tempo Real
1. **Atividade 2.1:** Criar endpoint SSE de administração `/api/v1/admin/events` no backend para transmitir status de conexões WebSocket ativas, taxa de checkpoints e métricas do cluster.
2. **Atividade 2.2:** Desenvolver página `/admin` no frontend para visualização de usuários online e duração de sessões ativas.

## 📊 2. Visão Geral do Status por Bloco

| Bloco | Descrição | Status | Referência |
| :--- | :--- | :---: | :--- |
| **Fase I** | Modelagem Relacional Prisma 7, Autenticação JWT e RBAC | 🟢 Concluído | [`DATABASE.md`](file:///home/gilson-russo/development/professional/sci-latex-vscode/docs/DATABASE.md) |
| **Fase II & III** | Editor Colaborativo CodeMirror 6, OT, Debounce Híbrido e Fencing Monotônico | 🟢 Concluído | [`ADR-007`](../architecture/adrs/adr-007-collaborative-editor-architecture-scaling.md) / [`collaborative-editor-spec.md`](../specs/collaborative-editor-spec.md) |
| **Fase IV** | Workflow em 6 Etapas Fixas e Modelo de Revisão em 2 Níveis | 🟢 Concluído | [`ADR-008`](file:///home/gilson-russo/development/professional/sci-latex-vscode/docs/architecture/adrs/adr-008-workflow-6-etapas-revisao-desacoplamento-git.md) |
| **Fase V** | Persistência Relacional de Apontamentos (`ReviewComment`) | 🟢 Concluído | [`ADR-010`](adrs/adr-010-review-comment-persistence-and-db-alignment.md) |
| **Fase VI** | Camada de IA Científica Multi-Agente (`ai-service` / SciAI) | 🟡 **Em Execução** | [`ADR-009`](adrs/adr-009-sciai-api-first-experimentation-and-service-enablement.md) |
| **Fase VII**| Painel Admin em Tempo Real & Observabilidade Live SSE | 🟢 **Concluído** | [`ADR-014`](adrs/adr-014-painel-admin-saude-e-metricas-aplicacao.md) |
| **Fase VIII**| Arquitetura de Evidências de Tarefas & Upload Direto MinIO | 🟢 Concluído | [`ADR-011`](adrs/adr-011-task-evidences-storage-architecture.md) |
| **Fase IX** | Governança de Templates LaTeX, Catálogo Global e Extração Direta | 🟢 **Aprovado** | [`ADR-017`](adrs/adr-017-latex-templates-governance-and-storage-architecture.md) |
---

## 🔄 3. Protocolo de Pausa e Atualização de Status

Toda vez que pausar ou encerrar uma atividade:
1. Atualize a seção **1. Onde Parei & Como Retomar** deste arquivo ([`STATUS.md`](STATUS.md)).
2. Descreva o que foi alterado na sessão e qual o primeiro passo para o próximo desenvolvedor / IA.
3. Se finalizar uma tarefa, marque como `[x]` no [`ROADMAP.md`](ROADMAP.md).
