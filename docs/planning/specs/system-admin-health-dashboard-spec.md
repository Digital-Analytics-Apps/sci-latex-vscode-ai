# Especificação Técnica: Painel Administrativo de Saúde da Aplicação e Métricas Operacionais

- **Documento:** `system-admin-health-dashboard-spec.md`
- **Referência:** ADR 014
- **Status:** APROVADO
- **Alvo:** Frontend (`src/features/system-admin/`), Backend Fastify (`src/modules/system-admin/`), `Role.ADMIN`

---

## 1. Escopo e Propósito

Esta especificação define os contratos de API, schemas de dados, componentes de frontend e fluxo de atualização em tempo real para o **Painel Administrativo de Saúde da Aplicação** (`/system-admin`), destinado com exclusividade ao perfil `Role.ADMIN`.

O objetivo desta tela é fornecer uma **visão operacional e de infraestrutura**, sem misturar artefatos ou regras do domínio acadêmico (artigos, revisões, metas letivas), permitindo que o administrador diagnostique com precisão qualquer gargalo ou falha de sistema.

---

## 2. Contratos de API (Backend Fastify)

Todas as rotas pertencem ao prefixo `/api/v1/system-admin` e exigem autenticação JWT com validação estrita de `request.user.role === Role.ADMIN`.

### 2.1 `GET /api/v1/system-admin/overview`
Retorna os dados consolidados das 5 abas, cacheados no Redis com TTL de 15 segundos.

#### Resposta HTTP 200 (TypeScript Contract):
```typescript
export interface SystemAdminOverviewResponse {
  timestamp: string; // ISO 8601
  
  // Aba 1: Microsserviços e Uptime
  servicesHealth: {
    backend: {
      status: 'UP' | 'DEGRADED' | 'DOWN';
      uptimeSeconds: number;
      eventLoopLagMs: number;
      heapUsedMb: number;
      heapTotalMb: number;
      rps: number;
      errorRate5xxPercentage: number;
    };
    aiService: {
      status: 'UP' | 'DEGRADED' | 'DOWN';
      latencyMs: number;
      activeRunsCount: number;
    };
    compiler: {
      status: 'UP' | 'DEGRADED' | 'DOWN';
      workerPoolAvailable: number;
      workerPoolTotal: number;
    };
    postgres: {
      status: 'UP' | 'DOWN';
      pingLatencyMs: number;
      activeConnections: number;
      maxConnections: number;
    };
    redis: {
      status: 'UP' | 'DOWN';
      pingLatencyMs: number;
      usedMemoryMb: number;
      maxMemoryMb: number;
    };
    minio: {
      status: 'UP' | 'DOWN';
      bucketHealthy: boolean;
      latencyMs: number;
    };
  };

  // Aba 2: Compilador TeX & Sandbox
  compilerMetrics: {
    queueLength: number;
    activeCompilations: number;
    avgDurationMs: number;
    p95DurationMs: number;
    statsLastHour: {
      success: number;
      syntaxErrors: number;
      timeoutsKilled: number; // Abortados por passar de 30s
    };
    scratchDiskUsedMb: number;
  };

  // Aba 3: SciAI Engine & LLMOps (Integrado com Opik)
  sciaiMetrics: {
    activeSseStreams: number;
    avgTtftMs: number; // Time To First Token
    externalApis: {
      arxiv: {
        semaphoreFree: boolean;
        throttleWindowActive: boolean; // Janela obrigatória de 3s
        rateLimit429Count: number;
      };
      semanticScholar: {
        circuitBreakerOpen: boolean;
        rateLimit429Count: number;
      };
      openAlex: {
        activeConnections: number;
        rateLimit429Count: number;
      };
    };
    tokensAndCost: {
      monthlyPromptTokens: number;
      monthlyCompletionTokens: number;
      monthlyEstimatedCostUsd: number;
      modelsUsagePercentage: {
        geminiFlash: number;
        gpt4o: number;
        ollamaLocal: number;
      };
    };
  };

  // Aba 4: Infraestrutura de Dados & Cache
  dataStorageMetrics: {
    postgres: {
      activeConnectionsRatio: number; // 0.0 a 1.0
      waitingPoolRequests: number;
      slowQueriesCount: number;
    };
    redis: {
      activeDocumentLeasesCount: number; // Quantidade de editor:document:<id>:owner
      connectedClients: number;
      evictedKeysLastHour: number;
    };
    minio: {
      collabAssetsSizeBytes: number;
      totalObjectsCount: number;
    };
  };

  // Aba 5: Conexões Vivas & Auditoria Técnica
  liveConnectionsAndSecurity: {
    activeCollaborativeRoomsCount: number;
    connectedWebSocketsCount: number;
    otOperationsPerSecond: number;
    securityEventsLast24h: Array<{
      id: string;
      timestamp: string;
      eventType: 'INVALID_TOKEN' | 'M2M_AUTH_FAILURE' | 'ACCESS_DENIED' | 'RATE_LIMIT_TRIGGERED';
      sourceIp: string;
      serviceTarget: string;
      details: string;
    }>;
  };
}
```

---

## 3. Arquitetura de Frontend (React 19 + Material UI)

### 3.1 Estrutura de Arquivos e Componentes
```
frontend/src/features/system-admin/
├── SystemAdminDashboardPage.tsx       # Componente mestre com layout e abas
├── api/
│   └── systemAdminApi.ts              # Cliente Axios para /api/v1/system-admin
├── hooks/
│   └── useSystemAdminMetrics.ts       # Hook TanStack Query com auto-refresh (15s)
└── tabs/
    ├── ServicesHealthTab.tsx          # Aba 1: Semáforos e latências dos 5 serviços
    ├── CompilerMetricsTab.tsx         # Aba 2: Fila TeX, tempos p95 e timeouts
    ├── SciAiMetricsTab.tsx            # Aba 3: Conexões SSE, arXiv status e tokens Opik
    ├── DataStorageTab.tsx             # Aba 4: Pool Postgres, Leases Redis e MinIO
    └── LiveConnectionsTab.tsx         # Aba 5: WebSockets ativos e log de segurança
```

### 3.2 Comportamento da Interface & UX
* **Auto-Refresh Inteligente:** Os dados são atualizados automaticamente a cada 15 segundos via `refetchInterval` do TanStack Query, com botão de *Pausar / Retomar Atualização Automática* e botão manual de *Atualizar Agora*.
* **Semáforos Visuais:**
  * Verde (`success.main`): Saudável / Normal.
  * Amarelo (`warning.main`): Alerta (ex: fila do compilador > 3, pool do Postgres > 80%, arXiv throttle ativo).
  * Vermelho (`error.main`): Crítico (ex: serviço offline, erro 5xx > 2%, estouro de memória).
* **Guarda de Acesso:** Inserido no `routes/index.tsx` protegido com `allowedRoles={[Role.ADMIN]}`.

---

## 4. Plano de Tarefas Detalhado (WBS)

### Fase A: Backend BFF & Coleta de Métricas
- [ ] **ADM-01:** Criar módulo `backend/src/modules/system-admin/` com rota, controller e service.
- [ ] **ADM-02:** Implementar agregador de healthcheck em `system-admin.service.ts` que executa chamadas assíncronas aos serviços internos (`ai-service:8000/health`, `compiler:4000/health`, MinIO, Prisma e Redis).
- [ ] **ADM-03:** Conectar leitura de métricas do Redis: contagem de chaves `editor:document:*:owner` e memória utilizada via comando `INFO MEMORY`.
- [ ] **ADM-04:** Adicionar camada de cache com TTL de 15 segundos no Redis para proteger o backend contra chamadas concorrentes ao endpoint.

### Fase B: Frontend & Componentes de Tela
- [ ] **ADM-05:** Criar hook `useSystemAdminMetrics` com TanStack Query consumindo a rota protegida.
- [ ] **ADM-06:** Implementar a página mestre `SystemAdminDashboardPage.tsx` com `Tabs` do Material UI.
- [ ] **ADM-07:** Implementar `ServicesHealthTab.tsx` com cards e medidores de latência dos microsserviços.
- [ ] **ADM-08:** Implementar `CompilerMetricsTab.tsx` com gráfico de compilações vs timeouts de 30s.
- [ ] **ADM-09:** Implementar `SciAiMetricsTab.tsx` com status dos conectores acadêmicos e resumo de tokens Opik.
- [ ] **ADM-10:** Implementar `DataStorageTab.tsx` (barras de progresso do pool Postgres e memória Redis).
- [ ] **ADM-11:** Implementar `LiveConnectionsTab.tsx` (tabela de eventos de auditoria e salas ativas).
- [ ] **ADM-12:** Registrar a rota `/system-admin` no roteador do React (`routes/index.tsx`) isolada para `Role.ADMIN`.
