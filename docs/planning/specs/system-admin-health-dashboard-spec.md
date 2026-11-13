# Especificação Técnica: SCIA Admin Center — Painel Administrativo de Observabilidade, Operação e Governança Científica

- **Documento:** `system-admin-health-dashboard-spec.md`
- **Referência:** ADR 014
- **Status:** APROVADO
- **Alvo:** Frontend (`src/features/admin/`), Backend Fastify (`src/modules/admin/`), `Role.ADMIN`

---

## 1. Escopo e Propósito

Esta especificação define os contratos de API, schemas tipados de dados, modelo de streaming em tempo real via Server-Sent Events (SSE) e componentes de frontend para o **SCIA Admin Center** (`/admin`).

O objetivo deste módulo é atuar como uma **Central de Inteligência Operacional**, combinando:
1. **Saúde de Serviços & Infraestrutura:** Microsserviços, latências, custos/tokens do Opik, fila do compilador TeX e bancos.
2. **Governança do Fluxo Científico:** Distribuição de manuscritos nas 6 etapas fixas, atrasos e gargalos no NIT (Etapa 5) e submissões (Etapa 6).
3. **Colaboração em Tempo Real:** Distribuição de salas por Pod dono, taxa de operações OT/s e persistência de checkpoints.
4. **Auditoria:** Linha do tempo ao vivo das atividades e incidentes de segurança.

---

## 2. Contratos de API (Backend Fastify)

Todas as rotas pertencem ao prefixo `/api/v1/admin/dashboard` e exigem autenticação JWT com validação estrita de `request.user.role === Role.ADMIN`.

```
┌────────────────────────────────────────────────────────────────────────┐
│                      ROTAS DA API DO ADMIN CENTER                      │
├────────────────────────────────────────┬───────────┬───────────────────┤
│ Rota                                   │ Método    │ Finalidade        │
├────────────────────────────────────────┼───────────┼───────────────────┤
│ /api/v1/admin/dashboard/overview       │ GET (REST)│ Resumo executivo  │
│ /api/v1/admin/dashboard/workflow       │ GET (REST)│ Funil 6 etapas/NIT│
│ /api/v1/admin/dashboard/infrastructure │ GET (REST)│ Saúde de serviços │
│ /api/v1/admin/dashboard/collaboration  │ GET (REST)│ Editor / Pods / OT│
│ /api/v1/admin/dashboard/activity       │ GET (REST)│ Timeline auditoria│
│ /api/v1/admin/dashboard/events         │ GET (SSE) │ Streaming ao vivo │
└────────────────────────────────────────┴───────────┴───────────────────┘
```

---

### 2.1 `GET /api/v1/admin/dashboard/overview`
Retorna os indicadores consolidados para o card mestre e o gráfico de atividade por hora:

```typescript
export interface AdminOverviewResponse {
  systemStatus: 'OPERATIONAL' | 'DEGRADED' | 'CRITICAL';
  activeUsersCount: number;         // Sessões válidas no sistema
  activeProjectsCount: number;      // Artigos em andamento
  activeWebSocketsCount: number;    // Conexões estabelecidas no /ws
  errorsLastHourCount: number;      // Erros 5xx e exceptions GlitchTip
  hourlyActivity: Array<{
    hour: string;                   // "14h", "15h", ...
    requestsCount: number;          // Requisições HTTP
    collaborativeOpsCount: number;  // Operações de digitação
  }>;
}
```

---

### 2.2 `GET /api/v1/admin/dashboard/workflow`
Retorna a distribuição de projetos nas 6 etapas oficiais e alertas de gargalos acadêmicos:

```typescript
export interface AdminWorkflowResponse {
  totalProjects: number;
  stagesDistribution: Array<{
    stageNumber: 1 | 2 | 3 | 4 | 5 | 6;
    stageName: string;
    projectsCount: number;
  }>;
  bottlenecks: {
    delayedProjectsCount: number;          // Cronograma estourado
    stagnantProjectsCount: number;         // > 15 dias sem edição
    pendingNitValidationsCount: number;    // Etapa 5 aguardando NIT
    upcomingDeadlinesCount: number;        // Etapa 6 próximos da data
  };
  averageDaysPerStage: Record<number, number>; // Ex: { 1: 12.5, 2: 24.0, ... }
}
```

---

### 2.3 `GET /api/v1/admin/dashboard/infrastructure`
Retorna o estado operacional agregado da infraestrutura, alimentado pelo Prometheus, Opik e GlitchTip:

```typescript
export interface AdminInfrastructureResponse {
  services: {
    backendFastify: {
      status: 'UP' | 'DEGRADED' | 'DOWN';
      rps: number;
      latencyP95Ms: number;
      errorRate5xx: number;
      eventLoopLagMs: number;
      grafanaUrl: string;
    };
    aiService: {
      status: 'UP' | 'DEGRADED' | 'DOWN';
      avgTtftMs: number;
      activeSseStreams: number;
      monthlyEstimatedCostUsd: number;
      opikUrl: string;
    };
    compiler: {
      status: 'UP' | 'DEGRADED' | 'DOWN';
      queueLength: number;
      activeJobs: number;
      avgDurationMs: number;
      timeoutsLast24h: number;
      grafanaUrl: string;
    };
    postgres: {
      status: 'UP' | 'DOWN';
      activeConnections: number;
      maxConnections: number;
      slowQueriesCount: number;
    };
    redis: {
      status: 'UP' | 'DOWN';
      usedMemoryMb: number;
      activeLeasesCount: number;
    };
    kubernetes: {
      healthyPodsCount: number;
      totalPodsCount: number;
      recentRestartsCount: number;
    };
  };
}
```

---

### 2.4 `GET /api/v1/admin/dashboard/collaboration`
Retorna o estado do motor de colaboração em tempo real (ADR-007 / ADR-007.1):

```typescript
export interface AdminCollaborationResponse {
  activeDocumentsCount: number;       // Artigos sendo editados simultaneamente
  connectedUsersCount: number;        // Usuários dentro das salas
  otOperationsPerSecond: number;      // Throughput de operações colaborativas
  avgMemoryProcessingMs: number;      // Latência de processamento na RAM do pod
  pendingCheckpointsCount: number;    // Checkpoints em fila de debounce
  reconnectsLastHourCount: number;    // Reconexões WebSocket
  documentsByPod: Array<{
    podName: string;
    documentsCount: number;
    memoryUsageMb: number;
  }>;
}
```

---

### 2.5 `GET /api/v1/admin/dashboard/activity`
Retorna a linha do tempo recente de auditoria e operações:

```typescript
export interface AdminActivityResponse {
  events: Array<{
    id: string;
    timestamp: string;
    category: 'EDITORIAL' | 'COLLABORATION' | 'COMPILER' | 'SECURITY';
    title: string;
    description: string;
    severity: 'INFO' | 'WARNING' | 'ERROR';
    entityId?: string; // projectId, userId
  }>;
}
```

---

### 2.6 `GET /api/v1/admin/dashboard/events` (Server-Sent Events)
Canal persistente unidirecional transmitindo eventos em tempo real para o frontend:
* **Headers:**
  * `Content-Type: text/event-stream`
  * `Cache-Control: no-cache`
  * `Connection: keep-alive`
* **Exemplo de Eventos:**
  ```
  event: OVERVIEW_TICK
  data: {"activeUsers": 129, "activeWebSockets": 87, "errors": 3}

  event: ACTIVITY_EVENT
  data: {"title": "Revisão Concluída", "category": "EDITORIAL", "timestamp": "2026-11-12T20:45:00Z"}
  ```

---

## 3. Arquitetura do Frontend (React 19 + Material UI)

### 3.1 Estrutura de Pastas e Componentes
```
frontend/src/features/admin/
├── AdminCenterPage.tsx               # Página Mestre com Tabs do SCIA Admin Center
├── api/
│   └── adminCenterApi.ts             # Cliente Axios e wrapper SSE
├── hooks/
│   ├── useAdminOverview.ts           # TanStack Query + SSE Listener
│   ├── useAdminWorkflow.ts           # Dados das 6 etapas
│   ├── useAdminInfrastructure.ts     # Dados de infraestrutura e links Grafana
│   ├── useAdminCollaboration.ts      # Dados em tempo real dos Pods
│   └── useAdminActivity.ts           # Timeline de auditoria
└── tabs/
    ├── OverviewTab.tsx               # Aba 1: Resumo, cards e gráfico de atividade
    ├── WorkflowTab.tsx               # Aba 2: Funil 6 etapas e gargalos NIT
    ├── InfrastructureTab.tsx         # Aba 3: Semáforos e links de serviços
    ├── CollaborationTab.tsx          # Aba 4: Documentos por Pod e OT/s
    └── ActivityTab.tsx               # Aba 5: Linha do tempo ao vivo
```

### 3.2 Comportamento da Interface & UX
* **Visual Soft UI:** Adota 100% dos estilos do Design System do SCIA (sem preto absoluto, paleta profissional Light/Dark).
* **Navegação Modular:** Alternância instantânea de abas sem perda de estado.
* **Resiliência SSE:** Reconexão automática do `EventSource` com fallback transparente para polling de 15 segundos caso a conexão SSE caia.

---

## 4. Plano de Implementação em 4 Fases (WBS)

### Fase 1: Fundação do SCIA Admin Center & Visão Geral
- [ ] **ADM-01:** Criar módulo `backend/src/modules/admin/` com controller, routes e service.
- [ ] **ADM-02:** Implementar rota `GET /api/v1/admin/dashboard/overview` agregando contadores do PostgreSQL e sessões em memória.
- [ ] **ADM-03:** Desenvolver `AdminCenterPage.tsx` e `OverviewTab.tsx` no frontend com cards e gráfico de atividade por hora.
- [ ] **ADM-04:** Configurar guarda de rota no frontend (`routes/index.tsx`) restrita estritamente a `Role.ADMIN`.

### Fase 2: Fluxo Científico & Gargalos Editoriais
- [ ] **ADM-05:** Implementar rota `GET /api/v1/admin/dashboard/workflow` com agregações Prisma das 6 etapas e cálculo de estagnação.
- [ ] **ADM-06:** Desenvolver `WorkflowTab.tsx` com gráfico de funil das 6 etapas, indicadores de atraso e lista de validações do NIT pendentes.

### Fase 3: Infraestrutura & Colaboração em Tempo Real
- [ ] **ADM-07:** Implementar rota `GET /api/v1/admin/dashboard/infrastructure` consultando endpoints de health e agregando dados do Opik/Prometheus.
- [ ] **ADM-08:** Implementar rota `GET /api/v1/admin/dashboard/collaboration` lendo leases ativas no Redis e agrupando por Pod dono.
- [ ] **ADM-09:** Desenvolver `InfrastructureTab.tsx` (semáforos e links Grafana) e `CollaborationTab.tsx` (Pods e métricas OT).

### Fase 4: Auditoria & Streaming em Tempo Real (SSE)
- [ ] **ADM-10:** Implementar endpoint SSE `GET /api/v1/admin/dashboard/events` no Fastify com barramento de eventos interno.
- [ ] **ADM-11:** Implementar rota `GET /api/v1/admin/dashboard/activity` consultando a tabela `AuditLog`.
- [ ] **ADM-12:** Desenvolver `ActivityTab.tsx` com linha do tempo de eventos ao vivo e listener SSE no frontend.
