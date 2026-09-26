# ADR 004: Gestão Resiliente do Ciclo de Vida de Pods Kubernetes com Redis TTL e Heartbeat

**Status:** Aceito e Implementado  
**Data:** 2026-09-22  
**Contexto:** Resolução de Vazamento de Pods Kubernetes e Sincronização de Sessões de Workspace  

---

## 1. Contexto e Problema Identificado

Durante a operação do sistema, detectou-se o acúmulo e vazamento de Pods Kubernetes no cluster (`workspace-pod-*`), mantendo 4 a 6 pods ativos indefinidamente, mesmo após os usuários fecharem seus navegadores ou encerrarem suas abas.

### Análise de Causa Raiz:

1. **Estado 100% Volátil em Memória no Backend:**
   - O `EventsManagerService` gerenciava o monitoramento de conexões ativas SSE (`clients`), contadores de projeto (`activeProjectConnections`) e timers de inatividade (`releaseTimers`) exclusivamente através de `Map`s e `Array`s em memória do Node.js.
   - Sempre que o servidor backend reiniciava (deploy, atualização de código ou crash do container), todos os timers `setTimeout` para encerramento de Pods **eram destruídos**.
   - Como não havia um processo de varredura/reconciliação no boot do servidor, os Pods em execução no Kubernetes tornavam-se **Pods Órfãos (Zumbis)** e continuavam rodando indefinidamente.

2. **Diferença de Granularidade (Projeto vs. Tríade Workspace):**
   - O `K8sPodManagerService` aloca um Pod Kubernetes para a tríade isolada `(projectId, userId, taskId)`.
   - O `EventsManagerService` incrementava/decrementava conexões apenas por `projectId`.
   - Se um usuário abrisse 3 tarefas no mesmo projeto, o Kubernetes criava 3 Pods distintos, mas o contador do projeto ficava em `3`. Fechar 2 abas reduzia o contador para `1`, de modo que o evento de destruição de Pod nunca era disparado para os Pods das 2 tarefas fechadas.

3. **Falha na Detecção de Desconexões e Throttling de Navegador em Abas em Segundo Plano:**
   - A remoção de conexões dependia unicamente do socket SSE.
   - Navegadores modernos (Chrome, Firefox, Edge) reduzem ou suspendem os timers `setInterval` em abas em segundo plano (perda de foco), fazendo com que pings de batimento cardíaco atrasassem e os Pods fossem derrubados indevidamente.

4. **Inconsistência da Tabela `Workspace` no PostgreSQL:**
   - A atualização do status da workspace para `TERMINATED` no PostgreSQL ocorria apenas ao final do timer em memória. Com a perda do timer, a tabela no banco permanecia travada com `status = 'READY'`, criando um estado falso de atividade.

---

## 2. Decisão de Arquitetura

Decidimos introduzir o **Redis** (`sci_latex_redis`, Redis 7 Alpine) como camada de controle de presença em memória distribuída, combinado com um mecanismo de **Heartbeat via Web Worker** no frontend e um **Worker de Reconciliação (Garbage Collector de Pods)** no backend.

```
┌──────────────────────────────────────┐     (1) Web Worker Heartbeat (20s)     ┌─────────────────────────┐
│ Browser (useSSEEventSource / Worker) │ ─────────────────────────────────────> │ Fastify Backend         │
└──────────────────────────────────────┘                                        └────────────┬────────────┘
                                                                                             │
                                                               (2) SETEX (TTL 180s)          │ (3) Periodic Sync (60s)
                                                                                             v
                                                                                ┌─────────────────────────┐
                                                                                │ Redis Cache             │
                                                                                │ (workspace:active:*)    │
                                                                                └────────────┬────────────┘
                                                                                             │
                                                               (4) Key Expired /             │ Orphan Sweep
                                                                   Sweeper Check             v
                                                                                ┌─────────────────────────┐
                                                                                │ K8sPodManagerService    │
                                                                                │ (deleteNamespacedPod)   │
                                                                                └─────────────────────────┘
```

### Componentes da Solução:

### A. Registro de Presença no Redis (Chave com Tríade e TTL)
1. O backend expõe o endpoint `POST /api/v1/events/heartbeat` que recebe a tríade `{ projectId, userId, taskId }`.
2. A presença é gravada no Redis com TTL (Time-To-Live) de **180 segundos (3 minutos)** via comando atômico:
   `SET workspace:active:<projectId>:<userId>:<taskId> "true" EX 180`
3. Enquanto o cliente estiver com a workspace aberta, o heartbeat renova o TTL no Redis. Ao fechar a aba ou desconnectar, a chave expira em no máximo 180s.

### B. Batimento Cardíaco com Web Worker Inline (Resiliente a Abas em 2º Plano)
- No frontend, o hook `useSSEEventSource` instancia um **Blob Web Worker** inline executando um timer de **20 segundos**.
- Web Workers são imunes ao throttling/suspensão de timers imposto pelos navegadores para abas sem foco, garantindo envio contínuo do heartbeat HTTP sem derrubar o Pod indevidamente quando o usuário alterna de aba.
- Eventos de `visibilitychange` na janela reativam e forçam um heartbeat imediato quando a aba recupera o foco.

### C. Grace Period Configurável e Sweeper (Garbage Collector de Pods)
- O backend utiliza `GRACE_PERIOD_MS = 120_000` (2 minutos) em ambiente de desenvolvimento/testes antes de encerrar o Pod após o cancelamento do registro.
- No boot do servidor Fastify e a cada 60 segundos, o `K8sPodManagerService.reconcileOrphanPods()` realiza a varredura:
  1. Consulta a API do Kubernetes para listar Pods `role=user-workspace`.
  2. Extrai as labels `projectId`, `claimedBy` (userId) e `taskId`.
  3. Consulta o Redis via `RedisService.isWorkspaceActive(projectId, userId, taskId)`.
  4. **Se a chave NÃO existir** no Redis:
     - Deleta o Pod no Kubernetes via `deleteNamespacedPod`.
     - Atualiza a Workspace no PostgreSQL para `TERMINATED` e `podName = null`.
     - Desativa o monitor de arquivos (`workspaceWatcher.unwatchProject`).

### D. Trava de Concorrência e Exclusividade de Tarefa (Task Occupied Lock)
1. A chave de presença no Redis (`workspace:active:<projectId>:<userId>:<taskId>`) funciona também como Trava de Ocupação (*Lock*) por Tarefa.
2. A API de listagem `GET /api/v1/projects/:projectId/tasks` utiliza `redisService.getTaskPresenceMap(projectId)` para retornar metadados `isOccupied: true` e `occupiedBy: { id, name }` em cada tarefa.
3. Se um segundo usuário tentar abrir uma tarefa ocupada (`POST /api/v1/projects/:projectId/tasks/:taskId/workspace`), o backend rejeita com **HTTP 409 Conflict** (`TASK_WORKSPACE_OCCUPIED`), impedindo edições concorrentes na mesma branch Git.

---

## 3. Consequências e Benefícios

- **Imunidade a Reinícios do Backend:** Se o servidor backend reiniciar, o estado de presença é preservado no Redis. Na inicialização (boot), a varredura de reconciliação limpa instantaneamente Pods abandonados.
- **Isolamento Estrito por Tríade:** A presença e a destruição de Pods utilizam rigorosamente a chave `(projectId, userId, taskId)`, impedindo que uma tarefa encerrada mantenha um Pod aberto ou que o encerramento de uma aba afete outra tarefa do mesmo projeto.
- **Navegação em Abas em 2º Plano:** O uso de Web Worker garante heartbeats contínuos mesmo com a aba em segundo plano, evitando encerramentos acidentais de Pods.
- **Zero Sobrecarga no Banco Relacional:** O heartbeat periódico é processado exclusivamente em memória RAM pelo Redis. O PostgreSQL recebe atualizações pontuais de estado.
