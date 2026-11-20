# Plano de Implementação: AIOps Copilot no SCIA Admin Center

- **Documento:** `aiops-copilot-implementation-plan.md`
- **Referência:** [ADR-012](file:///mnt/c0b6217c-c2f3-4c1f-8ba2-c8d177f718a9/development/professional/sci-latex-vscode/docs/architecture/adrs/adr-012-m2m-security-evolution.md), [ADR-013](file:///mnt/c0b6217c-c2f3-4c1f-8ba2-c8d177f718a9/development/professional/sci-latex-vscode/docs/architecture/adrs/adr-013-observabilidade-on-premise-licenca-zero.md), [ADR-014](file:///mnt/c0b6217c-c2f3-4c1f-8ba2-c8d177f718a9/development/professional/sci-latex-vscode/docs/architecture/adrs/adr-014-painel-admin-saude-e-metricas-aplicacao.md) e [ADR-018](file:///mnt/c0b6217c-c2f3-4c1f-8ba2-c8d177f718a9/development/professional/sci-latex-vscode/docs/architecture/adrs/adr-018-aiops-copilot-mcp-root-cause-analysis-admin-center.md)
- **Status:** PLANEJADO & PRONTO PARA EXECUÇÃO
- **Alvo:** Frontend React (`src/features/admin/`), Backend Fastify (`src/modules/admin/aiops/`), Prisma (`schema.prisma`), `ai-service` e MCP Gateway

---

## 1. Princípios de Engenharia e Regras de Ouro

Todos os componentes desenvolvidos neste plano devem atender estritamente aos seguintes padrões:

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                        DIRETRIZES DE QUALIDADE DE CÓDIGO                               │
├─────────────────────┬──────────────────────────────────────────────────────────────────┤
│ 1. SOLID            │ • SRP: Controllers orquestram HTTP; Services contêm regra de    │
│                     │   negócio; Gateways lidam com I/O de rede e MCP.                 │
│                     │ • OCP: Novos servidores MCP são plugados via interface genérica. │
│                     │ • DIP: Injeção de dependências em controllers e services via     │
│                     │   construtores (Parameter Properties do TypeScript).             │
├─────────────────────┼──────────────────────────────────────────────────────────────────┤
│ 2. DRY              │ • Schemas Zod compartilhados como fonte única da verdade.        │
│                     │ • Centralização de chamadas de rede no cliente HTTP configurado. │
├─────────────────────┼──────────────────────────────────────────────────────────────────┤
│ 3. Zero Fallbacks   │ • Proibido mascarar erros com dados fictícios / mocks em catch.  │
│                     │ • Falhas de rede ou de MCP propagam exceções tipadas de domínio. │
├─────────────────────┼──────────────────────────────────────────────────────────────────┤
│ 4. React Patterns   │ • NUNCA usar `React.FC`. Usar funções puras com props tipadas.  │
│                     │ • Usar EXCLUSIVAMENTE Named Exports (`export const Component`).  │
│                     │ • Camadas rígidas: Axios Service ➔ Custom Hook (TanStack Query)  │
│                     │   ➔ Componente de UI.                                            │
├─────────────────────┼──────────────────────────────────────────────────────────────────┤
│ 5. Tipagem Estrita  │ • ZERO uso de `any`. Tipagem estrita com TypeScript e Zod.       │
│                     │ • Discriminated Unions para estados de incidentes e diagnósticos.│
└─────────────────────┴──────────────────────────────────────────────────────────────────┘
```

---

## 2. Arquitetura da Solução e Divisão em Camadas

```mermaid
flowchart TD
    subgraph Frontend["Frontend React (/admin)"]
        UI[AIOpsDrawer.tsx]
        Hook[useAIOps.ts (TanStack Query + SSE)]
        Service[aiopsService.ts (Axios Client)]
    end

    subgraph Backend["Backend Fastify BFF (/api/v1/admin/aiops/)"]
        Route[aiops.routes.ts]
        Controller[AiopsController (Zod Validation)]
        AiopsSvc[AiopsService (Business Logic & RCA Engine)]
        AuditSvc[ActionAuditService (Imutabilidade)]
        MCPGateway[McpGatewayService (JSON-RPC Client)]
    end

    subgraph MCPBus["MCP Servers (Barramento de Ferramentas)"]
        K8sMCP["K8s MCP Server"]
        PromMCP["Prometheus MCP Server"]
        LokiMCP["Loki MCP Server"]
        GlitchMCP["GlitchTip / Sentry MCP Server"]
        OpikMCP["Opik MCP Server (LLMOps)"]
    end

    subgraph Database["PostgreSQL + pgvector (Prisma ORM)"]
        TIncidents[(AiopsIncident)]
        TRca[(AiopsRcaReport)]
        TChat[(AiopsChatMessage)]
        TAudit[(AiopsActionAuditLedger)]
    end

    UI --> Hook
    Hook --> Service
    Service -->|HTTP REST / SSE| Route
    Route --> Controller
    Controller --> AiopsSvc
    AiopsSvc --> MCPGateway
    AiopsSvc --> AuditSvc
    MCPGateway --> MCPBus
    AiopsSvc --> Database
    AuditSvc --> TAudit
```

---

## 3. Fases de Execução e Roadmap Detalhado

### 🚀 Fase 1: Modelagem de Dados no Prisma e Banco de Dados (Backend)
- [ ] **1.1.** Atualizar `backend/prisma/schema.prisma` com as entidades:
  - `AiopsIncident`: Registro de incidentes, status (`OPEN`, `INVESTIGATING`, `MITIGATED`, `RESOLVED`), severidade e `traceId`.
  - `AiopsRcaReport`: Laudos estruturados com classificação (`INFRASTRUCTURE`, `APPLICATION`, `HYBRID`), evidências JSONB e recomendações.
  - `AiopsChatMessage`: Histórico das mensagens do chat com ferramentas invocadas (`toolCalls`).
  - `AiopsActionAuditLedger`: Registro imutável de ações executadas pelo administrador humano logado.
- [ ] **1.2.** Gerar e aplicar a migração Prisma (`prisma migrate dev`).
- [ ] **1.3.** Criar repositórios tipados com validações estritas de domínio.

---

### 🚀 Fase 2: Schemas Zod e MCP Gateway Service (Backend)
- [ ] **2.1. Schemas Zod (`aiops.schemas.ts`):**
  - Schema de consulta de incidentes com paginação e filtros.
  - Schema de envio de mensagem de chat do AIOps (`userPrompt`, `incidentId`, `serviceContext`).
  - Schema de retorno de diagnóstico de Causa-Raiz (RCA).
  - Schema de aprovação de ação remediadora (`actionId`, `parameters`).
- [ ] **2.2. McpGatewayService (`src/infra/mcp/mcp-gateway.service.ts`):**
  - Implementação do cliente MCP com suporte a transporte SSE / stdio / HTTP.
  - Métodos fortemente tipados:
    - `queryK8sPodStatus(namespace, podName)`
    - `queryK8sClusterEvents(namespace, resourceName)`
    - `queryPrometheusInstant(query)`
    - `queryLokiLogs(query, level, limit)`
    - `queryGlitchTipExceptions(serviceName)`
    - `queryOpikTraces(projectName, traceId)`
  - Tratamento de erro sem fallbacks: propagar `McpUnavailableException` com metadados claros.

---

### 🚀 Fase 3: Regras de Negócio e Controlador Fastify (Backend)
- [ ] **3.1. AiopsService (`src/modules/admin/aiops/aiops.service.ts`):**
  - Motor de inferência e árvore de decisão para categorização de RCA (Infraestrutura vs. Aplicação vs. Mista).
  - Orquestrador de ferramentas MCP para coletar evidências em paralelo (`Promise.allSettled` com agregação estruturada).
  - Persistência das mensagens no banco e geração de resposta com streaming SSE.
- [ ] **3.2. ActionAuditService (`src/modules/admin/aiops/action-audit.service.ts`):**
  - Validação de que a ação pretendida está na **Allowlist** segura.
  - Execução no Kubernetes usando Impersonation da identidade do administrador autenticado (`request.user.email`).
  - Gravação do ledger com IP, timestamp e parâmetros antes e depois da execução.
- [ ] **3.3. AiopsController & Rotas Fastify (`aiops.routes.ts`):**
  - `GET /api/v1/admin/aiops/incidents` — Lista incidentes em aberto.
  - `GET /api/v1/admin/aiops/incidents/:id` — Detalhes e laudo de RCA.
  - `POST /api/v1/admin/aiops/chat` — Interação conversacional (suporta SSE para streaming).
  - `POST /api/v1/admin/aiops/actions/execute` — Aprovação e execução de ação Human-in-the-Loop.
  - Proteção por middleware `Role.ADMIN`.

---

### 🚀 Fase 4: Camada de API e Hooks no Frontend (React + TanStack Query)
- [ ] **4.1. Tipos Estritos (`src/features/admin/types/aiops.types.ts`):**
  - Tipos TypeScript para incidentes, laudos RCA, mensagens de chat e propostas de ação (zero `any`).
- [ ] **4.2. Cliente de API (`src/features/admin/api/aiopsApi.ts`):**
  - Funções com Axios configurado chamando os endpoints do BFF Fastify.
  - Streaming SSE para o chat com processamento de chunks em tempo real.
- [ ] **4.3. Custom Hooks (`src/features/admin/hooks/useAIOps.ts`):**
  - `useAiopsIncidentsQuery`: React Query para listagem e polling de novos incidentes.
  - `useAiopsIncidentDetailsQuery`: Detalhes do laudo de RCA do incidente selecionado.
  - `useAiopsChatMutation`: Envio de mensagens com atualização otimista da lista de mensagens.
  - `useAiopsExecuteActionMutation`: Disparo da aprovação de remediação com invalidação de cache.

---

### 🚀 Fase 5: Interface de Usuário no SCIA Admin Center (React)
- [ ] **5.1. Componente `AIOpsChatDrawer.tsx`:**
  - Drawer lateral retrátil que pode ser aberto globalmente no `/admin` ou via clique contextual.
  - Renderização de mensagens com Markdown (tabelas, blocos de código com syntax highlighting).
  - Indicador visual da classificação da falha:
    - 🔴 Badge "Falha de Infraestrutura"
    - 🔵 Badge "Falha de Aplicação"
    - 🟡 Badge "Falha Mista"
- [ ] **5.2. Componente `AIOpsActionCard.tsx`:**
  - Card interativo quando a IA formula uma proposta de remediação.
  - Exibe o comando exato que será executado e o nível de risco.
  - Botão de confirmação explícita `[Aprovar e Executar Ação]`.
- [ ] **5.3. Integração na `InfrastructureTab.tsx`:**
  - Botão `[🤖 Investigar com AIOps]` em cada card de serviço (Fastify, Redis, Compiler, SciAI, K8s).
  - Ao clicar, abre o drawer já contextualizado com o nome do serviço e timestamp atual.

---

### 🚀 Fase 6: Testes Automatizados e Homologação
- [ ] **6.1. Testes Unitários de Backend (Vitest):**
  - Testes do `AiopsService` validando a matriz de classificação (cenários de OOMKilled vs. Cenários de 500 do Fastify).
  - Testes do `ActionAuditService` garantindo que comandos fora da allowlist são sumariamente rejeitados com erro 403.
  - Testes do `McpGatewayService` validando o tratamento de indisponibilidade de ferramentas.
- [ ] **6.2. Testes de Integração de Rotas:**
  - Teste de autenticação exigindo `Role.ADMIN`.
- [ ] **6.3. Testes de Frontend (Vitest + Testing Library):**
  - Renderização do drawer de chat.
  - Renderização do card de ação e disparo da mutação com confirmação humana.

---

## 4. Matriz de Rastreabilidade com as ADRs

| Componente a Implementar | ADR de Referência | Requisito Satisfeito |
| :--- | :---: | :--- |
| `aiops_action_audit_ledger` | [ADR-012](file:///mnt/c0b6217c-c2f3-4c1f-8ba2-c8d177f718a9/development/professional/sci-latex-vscode/docs/architecture/adrs/adr-012-m2m-security-evolution.md) | Auditoria imutável e não-repúdio |
| K8s User Impersonation | [ADR-012](file:///mnt/c0b6217c-c2f3-4c1f-8ba2-c8d177f718a9/development/professional/sci-latex-vscode/docs/architecture/adrs/adr-012-m2m-security-evolution.md) | Identidade humana executando a ação |
| Human-in-the-Loop Card | [ADR-012](file:///mnt/c0b6217c-c2f3-4c1f-8ba2-c8d177f718a9/development/professional/sci-latex-vscode/docs/architecture/adrs/adr-012-m2m-security-evolution.md) | IA proibida de executar comandos autônomos |
| K8s, Prom, Loki, GlitchTip, Opik MCPs | [ADR-013](file:///mnt/c0b6217c-c2f3-4c1f-8ba2-c8d177f718a9/development/professional/sci-latex-vscode/docs/architecture/adrs/adr-013-observabilidade-on-premise-licenca-zero.md) | Consumo exclusivo da telemetria on-premise |
| Rotas no BFF Fastify (`/aiops/*`) | [ADR-014](file:///mnt/c0b6217c-c2f3-4c1f-8ba2-c8d177f718a9/development/professional/sci-latex-vscode/docs/architecture/adrs/adr-014-painel-admin-saude-e-metricas-aplicacao.md) | Frontend não acessa portas de infra diretamente |
| Drawer Lateral no Admin Center | [ADR-014](file:///mnt/c0b6217c-c2f3-4c1f-8ba2-c8d177f718a9/development/professional/sci-latex-vscode/docs/architecture/adrs/adr-014-painel-admin-saude-e-metricas-aplicacao.md) | Integração fluida na Área 3 de Infraestrutura |
| Matriz RCA (Infra vs. App) | [ADR-018](file:///mnt/c0b6217c-c2f3-4c1f-8ba2-c8d177f718a9/development/professional/sci-latex-vscode/docs/architecture/adrs/adr-018-aiops-copilot-mcp-root-cause-analysis-admin-center.md) | Classificação determinística da causa-raiz |
