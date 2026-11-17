# Especificação Técnica: Visualizador em Tempo Real da Topologia de Serviços no SCIA Admin Center

- **Documento:** `service-topology-visualizer-spec.md`
- **Referência:** ADR 014 (Admin Center), ADR 018 (AIOps Copilot), Relatório de Comunicação Inter-serviços
- **Status:** APROVADO / EM IMPLEMENTAÇÃO
- **Alvo:** Frontend (`src/features/admin/components/topology/`, `src/features/admin/tabs/ServiceTopologyTab.tsx`), `@xyflow/react`

---

## 1. Escopo e Propósito

Esta especificação define a arquitetura, modelo de nós, arestas customizadas e fluxos de telemetria em tempo real para a nova **Aba 6: Topologia de Serviços** no **SCIA Admin Center**.

O objetivo é proporcionar ao Administrador (`Role.ADMIN`) uma visualização interativa em grafo da malha de microsserviços do SCIA, indicando:
1. **Saúde e Estado Operacional de Cada Serviço:** Atualizado dinamicamente via consultas ao backend Fastify (`/api/v1/admin/dashboard/infrastructure` e `/api/v1/admin/dashboard/events`).
2. **Canais e Protocolos de Comunicação Inter-serviços:** Identificando REST, SSE, WebSockets (OT), Tokens M2M e TCP Pools.
3. **Ponto de Entrada Direto para AIOps:** Botão em cada nó e aresta degradada para abrir o AIOps Copilot Drawer com o contexto pré-selecionado para diagnóstico de causa-raiz.

---

## 2. Topologia dos Componentes SCIA no React Flow

```
+-----------------------------------------------------------------------------------------+
|                                    SCIA SERVICE MESH                                    |
|                                                                                         |
|       [Client: Frontend SPA]                                                            |
|                 │  (HTTP / SSE / WebSocket OT)                                          |
|                 ▼                                                                       |
|       [Core: Backend Fastify] ───────────────┬────────────────────────┐                 |
|            │                 │               │                        │                 |
|            │ (M2M Token)     │ (ACID Pool)   │ (Fencing Monotônico)   │ (M2M JWT)       |
|            ▼                 ▼               ▼                        ▼                 |
|   [Compiler Sandbox]   [Postgres+PgBouncer] [Redis 7 (Leases)]   [SciAI Engine]         |
|            │                                                          │                 |
|            │ (Internal S3)                                            │ (LLMOps Traces) |
|            ▼                                                          ▼                 |
|   [MinIO Object Storage]                                     [Opik Observability]       |
+-----------------------------------------------------------------------------------------+
```

---

## 3. Contratos de Tipagem de Nós e Arestas

```typescript
export interface ServiceMetricItem {
  label: string;
  value: string | number;
  highlight?: boolean;
}

export interface ServiceNodeData {
  id: string;
  name: string;
  description: string;
  category: 'frontend' | 'gateway' | 'service' | 'storage' | 'observability';
  status: 'UP' | 'DEGRADED' | 'DOWN';
  metrics: ServiceMetricItem[];
  grafanaUrl?: string;
  onInvestigate?: (serviceId: string) => void;
}

export interface CommunicationEdgeData {
  protocol: string;
  description?: string;
  latency?: string;
  throughput?: string;
  status?: 'healthy' | 'warning' | 'error';
}
```

---

## 4. Preservação das Funcionalidades Existentes
As abas 1 a 5 do Admin Center permanecem intactas, preservando o fluxo de trabalho e layouts consolidados.
