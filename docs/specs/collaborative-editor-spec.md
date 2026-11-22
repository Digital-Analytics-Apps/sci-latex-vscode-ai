# 📝 Especificação Técnica: Editor Colaborativo LaTeX & Persistência em Tempo Real

- **Documento:** `collaborative-editor-spec.md`
- **Referência Arquitetural:** [ADR-007: Arquitetura Unificada do Editor Colaborativo](../../architecture/adrs/adr-007-collaborative-editor-architecture-scaling.md)
- **Status Geral:** APROVADO / ESPECIFICAÇÃO DE ENGENHARIA DE PADRÃO INDUSTRIAL
- **Público-Alvo:** Engenheiros Backend, Frontend, Arquitetos de Software e Agentes Autônomos de Implementação
- **Stack Tecnológica:**
  - Frontend: React 19 + TypeScript Estrito + CodeMirror 6 (`@codemirror/collab`) + `idb` (IndexedDB Wrapper)
  - Backend: Node.js 22 LTS + Fastify + `@fastify/websocket` + `@codemirror/state` (Headless Engine)
  - Coordenação: Redis 7 (Leases de Dono com TTL e Presença)
  - Banco de Dados: PostgreSQL 16 Alpine via Prisma ORM v7 com `@prisma/adapter-pg`
  - Armazenamento de Objetos: MinIO S3 (Assets imutáveis e PDFs compilados)
  - Compilador: Microserviço TeX Live Worker isolado

---

## 📑 Sumário

1. [Princípios Arquiteturais & Taxonomia de Governança](#1-princípios-arquiteturais--taxonomia-de-governança)
2. [Modelo de Dados Relacional (`schema.prisma`)](#2-modelo-de-dados-relacional-schemaprisma)
3. [Protocolo WebSocket & Contratos de Comunicação](#3-protocolo-websocket--contratos-de-comunicação)
4. [Coordenação Distribuída & Ciclo Completo de Fencing Token](#4-coordenação-distribuída--ciclo-completo-de-fencing-token)
5. [Contratos de Implementação Backend (`documents.repository.ts`)](#5-contratos-de-implementação-backend-documentsrepositoryts)
6. [Resiliência Frontend: Local Outbox, Web Locks & Circuit Breaker](#6-resiliência-frontend-local-outbox-web-locks--circuit-breaker)
7. [Snapshot Multi-Arquivo: Estrutura, Manifesto e Restauração](#7-snapshot-multi-arquivo-estrutura-manifesto-e-restauração)
8. [Compilation Manifest Hash: Cache Determinístico de Compilação](#8-compilation-manifest-hash-cache-determinístico-de-compilação)
9. [Snapshot Pruning: Política de Retenção e Auditoria](#9-snapshot-pruning-política-de-retenção-e-auditoria)
10. [Matriz de Testes de Falhas Reais & Critérios de Aceitação](#10-matriz-de-testes-de-falhas-reais--critérios-de-aceitação)

---

## 1. Princípios Arquiteturais & Taxonomia de Governança

A plataforma opera sob um modelo híbrido: **sincronização colaborativa em tempo real com Transformação Operacional (OT) em memória RAM e persistência transacional periódica desacoplada no PostgreSQL 16**.

$$\text{A digitação não depende do PostgreSQL para acontecer, mas a confirmação de durabilidade depende estritamente dele.}$$

### Taxonomia de Status das Entregas

* **`APROVADO`**: Decisão canônica aprovada e base estrutural em operação.
* **`CORREÇÃO CRÍTICA (P0)`**: Ajuste de segurança ou consistência com implementação prioritária e mandatória.
* **`PROPOSTO (P1-P3)`**: Especificação técnica refinada e aprovada para execução nas sprints seguintes.
* **`VALIDADO`**: Funcionalidade com cobertura total comprovada pela matriz de testes de falha real.

```
┌────────────────────────────────────────────────────────────────────────┐
│                        ARQUITETURA CANÔNICA DO EDITOR                  │
├────────────────────┬────────────────────┬──────────────┬───────────────┤
│ Frontend           │ Backend Fastify    │ Redis 7      │ PostgreSQL 16 │
├────────────────────┼────────────────────┼──────────────┼───────────────┤
│ - CodeMirror 6     │ - Document Owner   │ - Ownership  │ - Fonte da    │
│ - Zero Latência    │   (Single Writer)  │   Lease TTL  │   Verdade     │
│ - Local Outbox idb │ - @cm/collab em RAM│ - Presença   │ - Snapshots   │
│ - Duplo ACK        │ - Rebase Server    │ - Eventos de │ - ProjectFile │
│ - Web Locks Co-op  │ - Flush Híbrido    │   Negócio    │ - Versão ACID │
└────────────────────┴────────────────────┴──────────────┴───────────────┘
```

---

## 2. Modelo de Dados Relacional (`schema.prisma`)

```prisma
// Entidade principal do Artigo / Projeto
model Project {
  id               String            @id @default(uuid())
  name             String
  currentVersion   Int               @default(1)
  ownerGeneration  Int               @default(0) // Token Monotônico de Fencing
  templateId       String?
  template         LatexTemplate?    @relation(fields: [templateId], references: [id], onDelete: SetNull)
  files            ProjectFile[]
  snapshots        DocumentSnapshot[]
  operations       DocumentOperation[]
  comments         ReviewComment[]
  createdAt        DateTime          @default(now())
  updatedAt        DateTime          @updatedAt
  deletedAt        DateTime?
}

// Arquivos que compõem o artigo (árvore virtual)
model ProjectFile {
  id         String   @id @default(uuid())
  projectId  String
  path       String   // ex: "main.tex", "sections/01_intro.tex", "references.bib"
  fileType   String   // "text" | "binary" | "image" | "bib" | "style" | "tex"
  mimeType   String   // "text/x-tex", "text/plain", "image/png"
  sizeBytes  BigInt   // Tamanho exato em bytes
  content    String?  @db.Text // Texto puro para .tex/.bib. Null para binários
  storageKey String?  // Chave MinIO S3 para binários. Null para textos
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt
  project    Project  @relation(fields: [projectId], references: [id], onDelete: Cascade)

  @@unique([projectId, path])
  @@index([projectId])
}

// Snapshots históricos consolidados com suporte a Multi-Arquivo
model DocumentSnapshot {
  id         String   @id @default(uuid())
  projectId  String
  version    Int      // Versão sequencial consolidada
  content    String   @db.Text // Texto consolidado do arquivo raiz (retrocompatibilidade)
  manifest   Json?    // Manifesto JSONB completo da árvore de arquivos naquela versão
  savedBy    String   // Nome do último autor ou 'Sistema'
  reason     String   // 'checkpoint_50_operacoes', 'versao_inicial', 'release_candidate'
  createdAt  DateTime @default(now())
  project    Project  @relation(fields: [projectId], references: [id], onDelete: Cascade)

  @@index([projectId])
  @@index([createdAt])
}
```

---

## 3. Protocolo WebSocket & Contratos de Comunicação

A comunicação cliente-servidor opera sobre `/ws/documents/:projectId` com protocolo determinístico tipado em TypeScript:

### 3.1 Definição de Tipos dos Payloads

```typescript
// Envelope base das mensagens WebSocket cliente -> servidor
export type CollabClientMessage =
  | { type: 'SYNC_INIT' }
  | { type: 'PULL_UPDATES'; file?: string; version?: number }
  | { type: 'PUSH_UPDATES'; file: string; version: number; updates: CollabUpdateJSON[]; idempotencyKey?: string }
  | { type: 'APPLY_DELTA'; file: string; delta: DeltaOperation }
  | { type: 'REQUEST_RECONCILE'; file: string }
  | { type: 'CURSOR_MOVE'; file: string; position: number; selectionStart?: number; selectionEnd?: number }
  | { type: 'RESTORE_SNAPSHOT'; snapshotId: string };

// Envelope base das mensagens WebSocket servidor -> cliente
export type CollabServerMessage =
  | { 
      type: 'SYNC_INIT'; 
      document: DocumentData;
      version: number; 
      fileVersions: Record<string, number>; 
      comments: ReviewComment[];
      collaborators: Array<{ userId: string; userName: string; color: string }>;
    }
  | { 
      type: 'PULL_UPDATES_RESPONSE'; 
      file: string; 
      version: number; 
      updates: CollabUpdateJSON[];
      author?: { userId: string; userName: string; color: string };
      status: 'synced' | 'pending_debounce';
    }
  | {
      type: 'DELTA_BROADCAST';
      file: string;
      operation: DeltaOperation;
      version: number;
      author: { userId: string; userName: string; color: string };
      status: 'pending_debounce';
    }
  | {
      type: 'ACK_DELTA';
      file: string;
      operationId: string;
      version: number;
      status: 'pending_debounce';
    }
  | {
      type: 'RECONCILE_SYNC';
      file: string;
      content: string;
      version: number;
    }
  | { 
      type: 'SNAPSHOT_SAVED'; 
      snapshot: DocumentSnapshot;
      version: number; 
      time: string;
    }
  | { 
      type: 'PERSISTENCE_ACK'; 
      snapshotId: string; 
      version: number; 
      timestamp: number;
    }
  | {
      type: 'SNAPSHOT_RESTORED';
      snapshot: DocumentSnapshot;
      version: number;
      content: string;
      files: ProjectFile[];
      restoredBy: string;
      time: string;
    }
  | { 
      type: 'ERROR'; 
      code?: string;
      message: string;
    };

export interface DeltaOperation {
  id?: string;
  type: 'insert' | 'delete';
  position: number;
  text?: string;
  length?: number;
  userId: string;
  userName: string;
  timestamp: number;
}
```

### 3.2 Diagrama Sequencial de Duplo ACK e Reconciliação Offline

```mermaid
sequenceDiagram
    autonumber
    participant Cli as Autor Offline (CodeMirror 6 + IndexedDB)
    participant Peer as Autor Online
    participant Pod as Pod Dono (Fastify RAM)
    participant PG as PostgreSQL 16

    Note over Cli: Queda de Rede / Modo Offline
    Cli->>Cli: Digita offline (aplica no CodeMirror local e salva no IndexedDB Outbox)
    Peer->>Pod: Digita online (APPLY_DELTA / PUSH_UPDATES)
    Pod->>Peer: ACK_DELTA (confirmação em RAM)

    Note over Cli: Rede Restaurada (ws.onopen)
    Cli->>Pod: drainOutbox() envia APPLY_DELTA enfileirados
    Pod->>Pod: applyDelta() / pushUpdates() rebaseia contra versão do servidor
    Pod-->>Peer: DELTA_BROADCAST (despacho direto e síncrono no CodeMirror)
    Pod-->>Cli: ACK_DELTA (confirmação de cada operação)

    Note over Cli: Fim da drenagem do Outbox
    Cli->>Pod: REQUEST_RECONCILE (file: "main.tex")
    Pod->>Pod: getActiveFileContent() obtém texto consolidado
    Pod-->>Cli: RECONCILE_SYNC (content: "Texto Mesclado", version: 53)
    Pod-->>Peer: RECONCILE_SYNC (garantia de paridade byte a byte)

    Note over Cli: CodeMirror roda Diff Prefixo/Sufixo: atualiza tela sem F5 e preserva cursor!

    Note over Pod: Debounce Híbrido atinge 3s inativo / 15s teto / 50 ops
    Pod->>PG: saveCheckpointAtomic() no PostgreSQL com Fencing Token
    PG-->>Pod: Checkpoint confirmado (Snapshot v53 gravado)
    Pod-->>Cli: PERSISTENCE_ACK (snapshotId, version: 53)
    Pod-->>Peer: PERSISTENCE_ACK (snapshotId, version: 53)
    Note over Cli: IndexedDB purga deltas confirmados com segurança total.
```

---

## 4. Coordenação Distribuída & Ciclo Completo de Fencing Token

### 4.1 Posse Única no Redis (Document Ownership)
Quando o primeiro usuário conecta a um artigo, o Pod tenta adquirir o lease distribuído:
```bash
SET editor:document:<projectId>:owner "<podId>" NX EX 15
```
* **Heartbeat:** Enquanto houver clientes na sala, um timer a cada 2 segundos renova a chave (`EX 15`).
* **Expiração Limpa:** Se o Pod morrer, a chave expira em 15 segundos, permitindo que outro Pod assuma a liderança.

### 4.2 O Ciclo Atômico no PostgreSQL (`CORREÇÃO CRÍTICA - P0`)
A autoridade da geração reside estritamente no PostgreSQL para eliminar vulnerabilidades de TOCTOU e dependência de durabilidade do Redis:

#### Passo 1: Aquisição Atômica da Geração (No Boot da Sala)
```sql
UPDATE "Project"
SET "ownerGeneration" = "ownerGeneration" + 1,
    "updatedAt" = NOW()
WHERE "id" = :projectId
RETURNING "ownerGeneration";
```
* O valor retornado é o `podGeneration` exclusivo daquele Pod para aquela sessão.

#### Passo 2: Persistência do Checkpoint com Igualdade Estrita
Toda gravação de checkpoint exige que a geração do processo seja exatamente igual à geração ativa no banco:
```sql
UPDATE "Project"
SET "currentVersion" = :newVersion,
    "updatedAt" = NOW()
WHERE "id" = :projectId
  AND "ownerGeneration" = :myGeneration
  AND "currentVersion" = :expectedOldVersion;
```
* **Comportamento sob Falha:** Se `affectedRows === 0`:
  1. Aborta a transação do PostgreSQL imediatamente via `ROLLBACK`.
  2. Lança exceção `[Fencing Token Conflict]`.
  3. O Pod rejeitado descarrega o documento da sua memória RAM ativa (`activeDocs.delete(projectId)`).

---

## 5. Contratos de Implementação Backend (`documents.repository.ts`)

Abaixo está a implementação de referência padrão industrial para a gravação de checkpoints com Fencing Token e manifesto multi-arquivo:

```typescript
export interface CheckpointPayload {
  projectId: string;
  version: number;
  expectedOldVersion: number;
  ownerGeneration: number;
  mainEntryPath: string;
  files: Array<{
    path: string;
    fileType: string;
    mimeType: string;
    content?: string;
    storageKey?: string;
    sha256: string;
  }>;
  savedBy: string;
  reason: string;
}

export class PrismaDocumentsRepository {
  async saveCheckpointAtomic(data: CheckpointPayload): Promise<string> {
    return prisma.$transaction(async (tx) => {
      // 1. Validação Atômica de Fencing Token e Versão Esperada no SQL
      const updateResult = await tx.$executeRaw`
        UPDATE "Project"
        SET "currentVersion" = ${data.version},
            "updatedAt" = NOW()
        WHERE "id" = ${data.projectId}
          AND "ownerGeneration" = ${data.ownerGeneration}
          AND "currentVersion" = ${data.expectedOldVersion};
      `;

      if (updateResult === 0) {
        throw new Error(
          `[Fencing Token Conflict] Pod destronado ou versão divergente. projectId=${data.projectId}, gen=${data.ownerGeneration}, expectedVer=${data.expectedOldVersion}`
        );
      }

      // 2. Upsert Atômico de todos os arquivos textuais alterados
      for (const file of data.files) {
        if (file.content !== undefined) {
          const sizeBytes = BigInt(Buffer.byteLength(file.content, 'utf-8'));
          await tx.projectFile.upsert({
            where: { projectId_path: { projectId: data.projectId, path: file.path } },
            create: {
              projectId: data.projectId,
              path: file.path,
              fileType: file.fileType,
              mimeType: file.mimeType,
              sizeBytes,
              content: file.content,
              storageKey: null,
            },
            update: {
              content: file.content,
              sizeBytes,
            },
          });
        }
      }

      // 3. Montagem do Manifesto Canônico do Snapshot Multi-Arquivo
      const snapshotId = crypto.randomUUID();
      const mainFile = data.files.find((f) => f.path === data.mainEntryPath);

      const manifestPayload = {
        schemaVersion: 1,
        projectId: data.projectId,
        projectVersion: data.version,
        mainEntryPath: data.mainEntryPath,
        files: data.files.map((f) => ({
          path: f.path,
          type: f.fileType,
          sha256: f.sha256,
          storageKey: f.storageKey || null,
          content: f.content !== undefined ? f.content : null,
        })),
      };

      // 4. Inserção do Snapshot Consolidado
      await tx.documentSnapshot.create({
        data: {
          id: snapshotId,
          projectId: data.projectId,
          version: data.version,
          content: mainFile?.content || '',
          manifest: manifestPayload,
          savedBy: data.savedBy,
          reason: data.reason,
        },
      });

      return snapshotId;
    });
  }
}
```

---

## 6. Resiliência Frontend: Local Outbox, Web Locks & Circuit Breaker

### 6.1 Schema do Local Outbox no IndexedDB (`outboxDb.service.ts`)

O cliente utiliza o IndexedDB nativo do navegador sob a base `sci_latex_editor_db` com dois object stores:

1. `sci_latex_outbox`: Fila FIFO de mutações com chave de idempotência (`idempotencyKey`), arquivo, payload, versão e status (`pending` / `confirmed`).
2. `sci_latex_doc_cache`: Cache completo de documentos para carregamento instantâneo offline (`documentId`, `file`, `content`, `version`).

```typescript
export interface OutboxMutation {
  id?: number;
  idempotencyKey: string;
  documentId: string;
  file: string;
  type: 'APPLY_DELTA' | 'PUSH_UPDATES';
  payload: unknown;
  version: number;
  status: 'pending' | 'confirmed';
  timestamp: number;
}

export interface CachedDoc {
  documentId: string;
  file: string;
  content: string;
  version: number;
  timestamp: number;
}
```

* **Drenagem FIFO Segura (`drainOutbox`):**
  Ao estabelecer conexão (`ws.onopen`), o `useCollabWebSocket` recupera todas as mutações pendentes ordenadas por timestamp e despacha via WebSocket. Mutações são removidas localmente conforme transmitidas e confirmadas duravelmente no banco pelo evento `PERSISTENCE_ACK`.

### 6.2 Despacho Direto e Síncrono de Deltas Remotos (Eliminação de Batching React)

**Problema Arquitetural Identificado em Produção:**
Quando múltiplos autores digitam concorrentemente ou quando um autor reconecta e drena dezenas de deltas acumulados no outbox, o WebSocket emite uma rajada contínua de mensagens `DELTA_BROADCAST`. Caso esses deltas sejam encaminhados através do estado do React (`useState`), o reconciliador do React aplica *event batching* assíncrono, descartando mutações intermediárias e aplicando apenas o último estado. Isso corrompia o texto visual antes do `F5`.

**Solução Canônica Implementada:**
O CodeMirror registra um ouvinte de despacho direto (`onRegisterRemoteDeltaListener`) no `CollabEditorContext`. A cada mensagem `DELTA_BROADCAST`, a mutação é despachada **imediatamente e de forma síncrona** para a instância do `EditorView`:

```typescript
// Registro direto no CodeMirrorEditor.tsx
const applyRemoteDelta = useCallback(
  (op: DeltaOperation, targetFile: string) => {
    if (targetFile !== activeFile || !viewRef.current) return;
    try {
      const doc = viewRef.current.state.doc;
      const pos = Math.max(0, Math.min(op.position, doc.length));

      if (op.type === 'insert' && op.text) {
        viewRef.current.dispatch({
          changes: { from: pos, insert: op.text },
          annotations: [Transaction.remote.of(true), Transaction.addToHistory.of(false)],
        });
        updateLinePositions(viewRef.current);
      } else if (op.type === 'delete' && op.length) {
        const to = Math.min(pos + op.length, doc.length);
        viewRef.current.dispatch({
          changes: { from: pos, to },
          annotations: [Transaction.remote.of(true), Transaction.addToHistory.of(false)],
        });
        updateLinePositions(viewRef.current);
      }
    } catch (err) {
      console.warn('[Collab Remote Delta] Falha ao aplicar delta remoto no editor:', err);
    }
  },
  [activeFile]
);

useEffect(() => {
  onRegisterRemoteDeltaListener?.(applyRemoteDelta);
  return () => {
    onRegisterRemoteDeltaListener?.(null);
  };
}, [applyRemoteDelta, onRegisterRemoteDeltaListener]);
```

### 6.3 Protocolo de Reconciliação Canônica (`REQUEST_RECONCILE` & `RECONCILE_SYNC`)

Após a conclusão da drenagem do Local Outbox (ou em caso de reconexão de rede com edições remotas não recebidas enquanto offline), o cliente solicita ao backend o estado canônico consolidado:

1. O cliente emite `{ type: 'REQUEST_RECONCILE', file: activeFile }`.
2. O backend consulta o documento mais quente em memória (`getActiveFileContent`) e transmite `{ type: 'RECONCILE_SYNC', file, content, version }` para a sala.
3. Ambos os clientes (autor que reconectou e pares ativos) recebem a confirmação de sincronismo.

### 6.4 Algoritmo de Diff por Prefixo/Sufixo Comum no CodeMirror 6

Para aplicar o texto canônico sem substituir o documento inteiro (o que causaria perda de seleção, salto de scroll e flicker), o CodeMirror executa um diff linear O(N) buscando o prefixo e sufixo idênticos:

```typescript
const reconcileContent = useCallback(
  (targetFile: string, newContent: string) => {
    if (targetFile !== activeFile || !viewRef.current) return;
    const currentDoc = viewRef.current.state.doc.toString();
    if (currentDoc === newContent) return; // Nenhuma modificação necessária

    // 1. Encontra o comprimento do prefixo comum
    let start = 0;
    while (
      start < currentDoc.length &&
      start < newContent.length &&
      currentDoc[start] === newContent[start]
    ) {
      start++;
    }

    // 2. Encontra o comprimento do sufixo comum
    let oldEnd = currentDoc.length;
    let newEnd = newContent.length;
    while (
      oldEnd > start &&
      newEnd > start &&
      currentDoc[oldEnd - 1] === newContent[newEnd - 1]
    ) {
      oldEnd--;
      newEnd--;
    }

    // 3. Aplica a substituição apenas na fatia divergente
    const replacement = newContent.slice(start, newEnd);
    const sel = viewRef.current.state.selection.main;

    viewRef.current.dispatch({
      changes: { from: start, to: oldEnd, insert: replacement },
      annotations: [Transaction.remote.of(true), Transaction.addToHistory.of(false)],
    });

    // 4. Mapeia e restaura a seleção do cursor do usuário sem saltos
    try {
      const mappedAnchor = Math.max(0, Math.min(sel.anchor, viewRef.current.state.doc.length));
      const mappedHead = Math.max(0, Math.min(sel.head, viewRef.current.state.doc.length));
      viewRef.current.dispatch({
        selection: { anchor: mappedAnchor, head: mappedHead },
      });
    } catch {
      // Seleção mantida graciosamente
    }
    updateLinePositions(viewRef.current);
  },
  [activeFile]
);
```

### 6.5 Coordenação de Múltiplas Abas com Web Locks Cooperativos

```typescript
export function useDocumentTabLock(projectId: string) {
  const [isLeader, setIsLeader] = useState(false);
  const releaseLockRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    let unmounted = false;
    const lockName = `lock:project:${projectId}`;
    const channel = new BroadcastChannel(`channel:project:${projectId}`);

    const acquireLock = () => {
      if (unmounted) return;
      navigator.locks.request(lockName, { ifAvailable: true }, (lock) => {
        if (!lock) {
          setIsLeader(false);
          return;
        }
        setIsLeader(true);
        return new Promise<void>((resolve) => {
          releaseLockRef.current = () => {
            resolve();
            channel.postMessage({ type: 'LOCK_RELEASED' });
          };
        });
      });
    };

    acquireLock();

    channel.onmessage = (e) => {
      if (e.data?.type === 'LOCK_RELEASED') {
        acquireLock();
      } else if (e.data?.type === 'TAKEOVER_REQUEST') {
        // Aba líder cede graciosamente a liderança após flush
        if (releaseLockRef.current) {
          releaseLockRef.current();
          releaseLockRef.current = null;
          setIsLeader(false);
        }
      }
    };

    return () => {
      unmounted = true;
      if (releaseLockRef.current) releaseLockRef.current();
      channel.close();
    };
  }, [projectId]);

  const requestTakeover = () => {
    const channel = new BroadcastChannel(`channel:project:${projectId}`);
    channel.postMessage({ type: 'TAKEOVER_REQUEST' });
    channel.close();
  };

  return { isLeader, requestTakeover };
}
```

### 6.6 NetworkConnectivityBoundary & Gestão de Conectividade do Navegador

Para garantir que o estado de conectividade reflita instantaneamente a realidade da máquina física ou emulações via DevTools (onde o Chromium bloqueia requisições HTTP mas mantém sockets TCP em estado zumbi até timeout), o frontend implementa o `NetworkStatusProvider` (`NetworkConnectivityBoundary`):

1. **Escuta Reativa de Eventos de Rede**:
   - `window.addEventListener('online', ...)` e `window.addEventListener('offline', ...)`.
   - Consulta imediata de `navigator.onLine`.
   - Propagação instantânea para o `onlineManager` do TanStack Query (`onlineManager.setOnline(isOnline)`).
2. **Desconexão Proativa e Enfileiramento**:
   - Ao transicionar para offline (`!isOnline`), o hook `useCollabWebSocket` força o fechamento limpo do WebSocket (`ws.close(1000)`), impede tentativas de reconexão automática enquanto offline e roteia todas as mutações locais imediatamente para a fila IndexedDB `sci_latex_outbox` (`status: 'offline'`).
3. **Indicadores Visuais de Resiliência Offline**:
   - **`IdeNavbar`**: O indicador de pulso do logo Overleaf transiciona para vermelho (`#ef4444`) com tooltip explicativo; o status ao lado do título exibe `WifiOff` com o rótulo `"Offline (Salvo no IndexedDB)"`.
   - **`EditorTabBar`**: O badge de status do arquivo ativo exibe `WifiOff` com `"Offline (Salvo no IndexedDB)"`.
   - **`EditorStatusBar`**: O rodapé exibe `WifiOff` com `"Modo Offline (Local Outbox Ativo)"` e legenda informativa.
   - **`AppHeaderBar`**: O chip de status real-time do topo do sistema muda imediatamente para `"Offline"` com visual atenuado.
4. **Reconexão e Drenagem Automática**:
   - Ao recuperar o sinal online (`window.ononline`), o `NetworkStatusProvider` emite toast informativo, o `useCollabWebSocket` reabre a conexão WebSocket, drena sequencialmente o IndexedDB e executa o protocolo canônico `REQUEST_RECONCILE` -> `RECONCILE_SYNC`.

---

## 7. Snapshot Multi-Arquivo: Estrutura, Manifesto e Restauração

### 7.1 Schema JSONB do Manifesto (`schemaVersion: 1`)

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "DocumentSnapshotManifest",
  "type": "object",
  "properties": {
    "schemaVersion": { "type": "integer", "const": 1 },
    "projectId": { "type": "string", "format": "uuid" },
    "projectVersion": { "type": "integer" },
    "mainEntryPath": { "type": "string" },
    "files": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "path": { "type": "string" },
          "type": { "type": "string", "enum": ["text", "binary", "image", "bib", "style", "tex"] },
          "sha256": { "type": "string" },
          "storageKey": { "type": ["string", "null"] },
          "content": { "type": ["string", "null"] }
        },
        "required": ["path", "type", "sha256"]
      }
    }
  },
  "required": ["schemaVersion", "projectId", "projectVersion", "mainEntryPath", "files"]
}
```

### 7.2 Imutabilidade de Binários no MinIO
Arquivos enviados para o MinIO utilizam particionamento estrito baseado no hash SHA-256 do conteúdo:
```
projects/{projectId}/assets/{sha256}-{sanitizedFilename}
```
* **Garantia:** Como a chave é baseada no hash, uma figura substituída no artigo gera uma nova chave. Os snapshots antigos continuam apontando eternamente para o binário exato daquela versão histórica.

### 7.3 Restauração por Substituição Integral (Rollback Fiel)
Ao restaurar uma versão histórica:
1. A transação lê o `manifest` do `DocumentSnapshot`.
2. Remove da tabela `ProjectFile` qualquer arquivo que não conste no manifesto da versão restaurada (eliminando arquivos criados posteriormente).
3. Atualiza o conteúdo dos arquivos existentes e recria arquivos que haviam sido deletados.
4. Incrementa o `currentVersion` do projeto no PostgreSQL e emite evento de recarga para a sala WebSocket.

---

## 8. Compilation Manifest Hash: Cache Determinístico de Compilação

Para impedir re-compilações desnecessárias que consomem CPU e memória dos workers TeX Live, o backend calcula o **Compilation Manifest Hash**:

$$H = \text{SHA256}(\text{CanonicalCompilationManifest})$$

### Estrutura Canônica Serializada

```json
{
  "mainEntryPath": "main.tex",
  "templateId": "ieee-artigo",
  "compiler": {
    "imageDigest": "sha256:d84f8...",
    "engine": "pdflatex",
    "bibliographyTool": "bibtex"
  },
  "files": [
    { "path": "main.tex", "sha256": "4b227..." },
    { "path": "references.bib", "sha256": "8f31a..." }
  ],
  "assets": [
    { "path": "figures/arch.png", "sha256": "e3b0c..." }
  ]
}
```

* **Comportamento de Execução:**
  1. Se existir um PDF no MinIO com a chave `compilations/cache/{projectId}/{hash}.pdf`, o backend retorna a URL pré-assinada imediatamente com status `HTTP 200 (Cache Hit)`.
  2. Caso contrário, despacha o job para o `compiler`, grava o PDF no MinIO e atualiza o hash de compilação.

---

## 9. Snapshot Pruning: Política de Retenção e Auditoria

Para evitar crescimento desenfreado da tabela `DocumentSnapshot`, a rotina opera sob regras estritas de governança:

### 9.1 Matriz de Retenção

| Idade do Snapshot | Regra de Retenção |
| :--- | :--- |
| **0 a 48 horas** | Retenção de 100% dos checkpoints automáticos. |
| **3 a 30 dias** | Compactação: retém 1 checkpoint representativo por dia (o último gravado no dia). |
| **Mais de 30 dias** | Expurgado, **exceto** se atender à regra de imunidade. |
| **Regra de Imunidade** | **Nunca expurgar** se referenciado por `Release`, `ReleaseCandidate`, marco NIT ou se possuir tag manual do autor. |

### 9.2 Execução Segura em Lotes
A rotina roda como um cron job noturno executando exclusões em lotes pequenos (`LIMIT 100`) com pausas de 500ms para não gerar contenção de locks na tabela:
```sql
DELETE FROM "DocumentSnapshot"
WHERE "id" IN (
  SELECT "id" FROM "DocumentSnapshot"
  WHERE "createdAt" < NOW() - INTERVAL '30 days'
    AND "reason" LIKE 'checkpoint_%'
    AND "id" NOT IN (SELECT "snapshotId" FROM "ReleaseCandidate" WHERE "snapshotId" IS NOT NULL)
  LIMIT 100
);
```

---

## 10. Matriz de Testes de Falhas Reais & Critérios de Aceitação

A promoção do código para o status `VALIDADO` exige aprovação nos seguintes testes automatizados de integração e estresse:

| ID | Cenário de Teste de Caos | Ação de Simulação | Resultado Esperado Obrigatório |
| :---: | :--- | :--- | :--- |
| **T01** | Queda do Pod Dono | `kill -9` no processo Node.js durante digitação contínua. | Novo Pod assume via Redis; clientes reconectam, fazem PULL e reenviam deltas sem perda de texto. |
| **T02** | Pod Zumbi retorna de GC | Pausa de thread de 16s no Pod A; Pod B assume com geração $G+1$; Pod A tenta flush. | PostgreSQL rejeita gravação do Pod A com `[Fencing Token Conflict]`. |
| **T03** | Concorrência de Posse | Dois Pods disparam boot simultâneo para a mesma sala. | Apenas um executa `UPDATE ownerGeneration < :newGen`; o segundo recebe 0 linhas e aborta. |
| **T04** | Queda de Aba / F5 Offline | Cliente edita offline, fecha a aba bruscamente e reabre. | `restoreEditorState` recupera o texto e os deltas do IndexedDB antes de abrir a rede. |
| **T05** | Múltiplas Abas Locais | Usuário abre o mesmo artigo na Aba A e Aba B do Chrome. | Aba A obtém o Web Lock; Aba B bloqueia com botão "Editar nesta aba" e transfere cooperativamente. |
| **T06** | Rollback Multi-Arquivo | Restauração de snapshot v10 onde um arquivo `sec2.tex` foi excluído na v15. | O rollback recria `sec2.tex` e devolve todos os arquivos ao estado exato da v10. |
| **T07** | Substituição de Imagem | Usuário faz upload de nova versão de `logo.png`. | Nova chave MinIO gerada; snapshot anterior continua exibindo a imagem antiga. |
| **T08** | Cache de Compilação | Usuário clica em compilar duas vezes sem alterar o texto. | Segunda requisição retorna em $< 50$ms com PDF servido diretamente do cache MinIO. |
| **T09** | Imunidade no Pruning | Execução de rotina de limpeza sobre projeto antigo com Release formal. | Snapshots de Release e RC permanecem 100% intactos no PostgreSQL. |
| **T10** | ACK Perdido na Reconexão | Cliente envia delta; servidor aceita; rede cai antes do ACK; cliente reconecta. | Protocolo PULL-First detecta o próprio `clientID`, avança a versão e não duplica caracteres. |
