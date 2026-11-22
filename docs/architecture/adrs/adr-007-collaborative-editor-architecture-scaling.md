# ADR 007: Arquitetura Unificada do Editor Colaborativo, Fencing Monotônico e Persistência Resiliente

- **Status Geral:** APROVADO E VALIDADO EM PRODUÇÃO
- **Data Original:** 24 de Outubro de 2026
- **Consolidação Unificada & Validação:** 22 de Novembro de 2026
- **Autor(es):** Equipe de Engenharia e Arquitetura SCIA
- **Domínio:** Edição Colaborativa em Tempo Real, Transformação Operacional (OT), Orquestração Kubernetes, Local Outbox e Persistência ACID
- **Documento Técnico Operacional (Especificação Viva):** [`docs/specs/collaborative-editor-spec.md`](../../specs/collaborative-editor-spec.md)
- **Componentes:** `frontend` (CodeMirror 6 / `@codemirror/collab` / IndexedDB Local Outbox), `backend` (Fastify / WebSockets), `infra/redis` (Coordenação & Presença), `PostgreSQL 16` (Fonte de Verdade Transacional), `MinIO S3` (Storage Imutável)

---

## 1. Contexto & Desafio de Engenharia

O SCIA exige um ambiente de escrita colaborativa em LaTeX para múltiplos autores e revisores científicos com sensação de latência zero (60 fps), integridade sintática e persistência garantida sob normas institucionais.

Durante as fases de projeto, três alternativas foram avaliadas e descartadas:

1. **Abordagem Overleaf Legada (MongoDB + BSON Tree):** Agrupar projetos inteiros em documentos BSON únicos sofre com o limite de 16 MB do MongoDB em projetos com histórico longo e carece de integridade referencial ACID nativa (necessária no SCIA para ciclos acadêmicos, tarefas e governança NIT).
2. **Abordagem Git por Branch por Tarefa:** Criar branches Git e Pull Requests para cada parágrafo ou seção TeX causa atrito cognitivo severo em pesquisadores acadêmicos, além de inviabilizar a co-autoria simultânea no mesmo parágrafo.
3. **Escrita Síncrona a Cada Tecla no Banco (*Keystroke Flooding*):** Gravar cada caractere digitado diretamente no PostgreSQL causa saturação instantânea de conexões, inchaço descontrolado de WAL e degradação severa de I/O de disco.

Fazia-se necessária uma arquitetura **híbrida e desacoplada**, combinando coordenação em memória de altíssima frequência com durabilidade relacional transacional:

$$\text{A digitação não depende do PostgreSQL para acontecer, mas a durabilidade depende estritamente dele.}$$

---

## 2. Decisão Arquitetural Adotada

Fica estabelecida a arquitetura canônica e unificada do editor colaborativo, estruturada em **seis pilares fundamentais**, com taxonomia explícita de governança:

```
┌────────────────────────────────────────────────────────────────────────┐
│                        ARQUITETURA CANÔNICA DO EDITOR                  │
├────────────────────┬────────────────────┬──────────────┬───────────────┤
│ Frontend           │ Backend Fastify    │ Redis 7      │ PostgreSQL 16 │
├────────────────────┼────────────────────┼──────────────┼───────────────┤
│ - CodeMirror 6     │ - Document Owner   │ - Ownership  │ - Fonte da    │
│ - Zero Latência    │   (Single Writer)  │   Lease TTL  │   Verdade     │
│ - WS Estável       │ - @cm/collab em RAM│ - Presença   │ - Snapshots   │
│ - Buffer Local     │ - Rebase Server    │ - Eventos de │ - ProjectFile │
│   Resiliente       │ - Flush Híbrido    │   Negócio    │ - Versão ACID │
└────────────────────┴────────────────────┴──────────────┴───────────────┘
```

### Quadro de Governança de Decisões

| Pilar / Componente | Classificação | Responsabilidade / Justificativa |
| :--- | :---: | :--- |
| **Pilar 1: PostgreSQL Fonte Única** | `APROVADO` | Custódia canônica de `ProjectFile` (`TEXT` UTF-8) e `DocumentSnapshot`. |
| **Pilar 2: Zero Keystrokes Banco/Redis** | `APROVADO` | Digitação opera na RAM do Pod Dono ($< 2$ms). Redis apenas coordenação. |
| **Pilar 3: Single-Writer Document Ownership** | `APROVADO` | 1 Pod Dono por documento ativo. Leases no Redis (TTL 15s / Heartbeat 2s). |
| **Pilar 4: Fencing Token Atômico (Ciclo Completo)**| `VALIDADO` | Aquisição e Checkpoint registrados atomicamente no PostgreSQL contra TOCTOU. |
| **Pilar 5: Debounce Híbrido Multi-Critério** | `VALIDADO` | Checkpoint: 3s inativo, 15s teto contínuo, 50 ops ou encerramento/SIGTERM. |
| **Pilar 6: Resiliência do Cliente, Local Outbox & Reconciliação Canônica** | `VALIDADO` | IndexedDB Outbox FIFO, Despacho Síncrono Direto sem batching React e Reconciliação Prefixo/Sufixo. |

---

### Detalhamento dos Pilares

#### Pilar 1: PostgreSQL como Única Fonte de Verdade Persistente (`APROVADO`)
* O PostgreSQL 16 (via Prisma ORM) é a autoridade canônica durável para o conteúdo dos arquivos (`ProjectFile.content`) e histórico de versões (`DocumentSnapshot`).
* Textos (`.tex`, `.bib`, `.sty`) são persistidos como `TEXT` UTF-8 nativo (com compressão automática TOAST pelo SGBD).
* Binários pesados (figuras, PDFs e templates zip) são delegados ao **MinIO S3**, mantendo o banco relacional livre de inchaço de I/O.

#### Pilar 2: Zero Keystrokes no Banco e no Redis (`APROVADO`)
* A digitação opera com latência $< 2$ms na **memória RAM do Pod Dono** do backend Fastify.
* O Redis não atua como buffer de texto de digitação; atua estritamente para coordenação de estado e presença.

#### Pilar 3: Escala por Posse de Documento (*Document Ownership / Single-Writer*) (`APROVADO`)
* A escala horizontal no Kubernetes opera por **particionamento de documentos**: cada artigo ativo possui exatamente **um Pod Dono** responsável por ordenar operações e aplicar o `rebaseUpdates` do `@codemirror/collab`.
* A posse é negociada via chave no Redis com lease de 15 segundos renovado a cada 2 segundos por heartbeat enquanto houver conexões ativas:
  ```bash
  SET editor:document:<documentId>:owner "<podId>" NX EX 15
  ```

#### Pilar 4: Fencing Token com Ciclo Completo no PostgreSQL (`CORREÇÃO CRÍTICA`)
Para blindar o banco contra pods destronados (ex.: durante pausas longas de *Garbage Collection* ou partições de rede), a validação não pode depender de leitura prévia no Node.js (vulnerável a TOCTOU). O ciclo exige **duas operações SQL atômicas**:

1. **Aquisição da Propriedade (Ao assumir o documento):**
   ```sql
   UPDATE "Project"
   SET "ownerGeneration" = :newGeneration,
       "updatedAt" = NOW()
   WHERE "id" = :projectId
     AND "ownerGeneration" < :newGeneration;
   ```
   *Se zero linhas forem afetadas, o Pod falha em assumir o documento.*

2. **Persistência do Checkpoint (Igualdade Estrita na Gravação):**
   ```sql
   UPDATE "Project"
   SET "currentVersion" = :newVersion,
       "updatedAt" = NOW()
   WHERE "id" = :projectId
     AND "ownerGeneration" = :myGeneration
     AND "currentVersion" = :expectedOldVersion;
   ```
   *Se zero linhas forem afetadas, o checkpoint aborta com erro de conflito (`[Fencing Token Conflict]`). O pod destronado descarrega o documento da memória sem corromper o banco.*

#### Pilar 5: Persistência por Debounce Híbrido Multi-Critério (`APROVADO`)
A gravação física no PostgreSQL ocorre através de uma transação atômica (`prisma.$transaction`) disparada por qualquer um dos quatro gatilhos:
1. **Inatividade:** 3 segundos sem digitação.
2. **Teto Máximo Contínuo:** 15 segundos de digitação ininterrupta.
3. **Volume Acumulado:** Lote de 50 operações atômicas pendentes.
4. **Encerramento:** Desconexão do último autor ativo na sala WebSocket ou recebimento de sinal `SIGTERM`/`SIGINT` (*Graceful Shutdown*).

#### Pilar 6: Resiliência do Cliente com Local Outbox, Despacho Síncrono e Reconciliação Canônica (`VALIDADO`)
* **Local Outbox no IndexedDB (`sci_latex_outbox`):**
  * Toda mutação (`APPLY_DELTA` ou `PUSH_UPDATES`) é enfileirada no IndexedDB de forma persistente com chave de idempotência (`idempotencyKey`).
  * Em caso de perda de conexão (modo offline), o usuário continua digitando normalmente no CodeMirror 6 local. Cada tecla gera uma entrada FIFO no outbox.
  * O outbox sobrevive ao fechamento acidental da aba, pane de energia ou recarga da página (`F5`).
* **Drenagem FIFO na Reconexão (`drainOutbox`):**
  * No evento `ws.onopen`, o cliente drena sequencialmente as mutações enfileiradas no IndexedDB para o backend via WebSocket.
  * O expurgo de deltas confirmados é desacoplado e seguro: mutações são confirmadas localmente após o envio e expurgadas definitivamente após o `PERSISTENCE_ACK` / `PULL_UPDATES_RESPONSE` emitido pelo backend com a versão consolidada no PostgreSQL.
* **Eliminação de Batching Assíncrono do React no Caminho Crítico (`onRegisterRemoteDeltaListener`):**
  * Deltas remotos transmitidos pelo WebSocket (`DELTA_BROADCAST`) **não** transitam por `useState` do React, eliminando o problema clássico de *event batching* onde rajadas de deltas eram descartadas antes de atingir o editor.
  * O CodeMirror 6 registra um listener direto no contexto de colaboração: cada operação é aplicada imediatamente e síncrona via `view.dispatch({ changes, annotations: [Transaction.remote.of(true), Transaction.addToHistory.of(false)] })`.
* **Protocolo de Reconciliação Canônica (`REQUEST_RECONCILE` & `RECONCILE_SYNC`):**
  * Ao concluir a drenagem do outbox (ou na reconexão), o cliente envia `REQUEST_RECONCILE`.
  * O backend obtém o estado quente mais recente em memória (`getActiveFileContent`) e transmite `RECONCILE_SYNC` com `{ file, content, version }` para a sala.
* **Algoritmo de Reconciliação Inteligente por Prefixo/Sufixo Comum no CodeMirror:**
  * O cliente calcula o prefixo e sufixo idênticos entre o texto local e o canônico recebido do servidor.
  * Apenas o intervalo divergente é substituído de forma atômica no CodeMirror (`Transaction.remote.of(true)`), **preservando estritamente a posição do cursor do usuário**, sem causar *flicker*, sem saltos de tela e sem exigir refresh (`F5`).
* **Circuit Breaker de 10 Minutos:** O editor trava novas edições dinamicamente via `EditorState.readOnly.of(true)` caso fique offline por mais de 10 minutos ininterruptos, evitando árvores de rebase excessivamente divergentes.

---

## 3. Avaliação no Teorema de PACELC e Trade-offs

$$\text{Editor Colaborativo em Tempo Real: } \mathbf{PC / EL}$$
* **Em Partição de Rede (P):** Prioriza a **Consistência (C)** da versão canônica centralizada. Se um autor perder a rede, suas alterações ficam salvas no buffer local/Outbox e aguardam a reconexão para rebase ordenado e reconciliação canônica.
* **Em Operação Normal (E):** Prioriza a **Baixa Latência (L)** da digitação via otimismo local e sincronização em RAM no servidor.

$$\text{Governança Institucional, Tarefas e NIT: } \mathbf{PC / EC}$$
* Opera sob consistência transacional estrita ACID em qualquer cenário.

---

## 4. Evoluções Mapeadas na Especificação Técnica (Ordem de Execução)

As implementações complementares seguem a ordem prioritária de mitigação de risco:

```
P0: Fencing Token Atômico (Ciclo Completo) ──► Blindagem Imediata contra Split-Brain (TOCTOU) [VALIDADO]
                     ▼
P1: Local Outbox & Reconciliação Canônica  ──► Resiliência Offline, Zero Keystrokes Perdidos e Sync Live [VALIDADO]
                     ▼
P1: Snapshot Multi-Arquivo (Manifesto)     ──► Rollback Fiel com Binários Imutáveis no MinIO [VALIDADO]
                     ▼
P1: Protocolo de Duplo ACK no WebSocket    ──► Separação entre Sincronização em RAM e Durabilidade [VALIDADO]
                     ▼
P2: Compilation Manifest Hash              ──► Cache Determinístico de Compilação TeX Live [PROPOSTO]
                     ▼
P2: Snapshot Pruning Inteligente           ──► Higiene do Storage respeitando Vínculos Formais [PROPOSTO]
```

### Detalhamento das Evoluções:

1. **Local Outbox & Reconciliação Canônica (`VALIDADO`):**
   * IndexedDB local outbox com retenção de deltas offline.
   * Drenagem sequencial na reconexão e protocolo `REQUEST_RECONCILE` / `RECONCILE_SYNC`.
   * Despacho síncrono no CodeMirror eliminando descarte de eventos por batching de estado do React.
2. **Snapshot Multi-Arquivo (`VALIDADO`):**
   * Manifesto JSONB versionado (`schemaVersion: 1`, `projectId`, `projectVersion`, `files: [{ path, type, content/storageKey, sha256 }]`).
   * **Binários Imutáveis no MinIO:** Upload sob chave única `projects/:projectId/assets/:sha256-:filename`, garantindo que snapshots históricos nunca apontem para assets sobrescritos.
   * **Restauração por Substituição:** O rollback substitui a árvore inteira do artigo, garantindo a reaparição de arquivos excluídos e remoção de arquivos adicionados posteriormente.
3. **Compilation Manifest Hash Determinístico (`PROPOSTO`):**
   * $H = \text{SHA256}(\text{CanonicalManifest})$, consolidando: `mainFile`, `templateVersion`, hashes dos arquivos de texto e binários, e parâmetros do compilador (`imageDigest`, `engine`, `arguments`, `bibliographyTool`).
   * Habilita reutilização de PDFs em cache por projeto e futuro cache global entre artigos com mesmo manifesto.
4. **Snapshot Pruning com Preservação de Vínculos (`PROPOSTO`):**
   * Preservação perpétua de snapshots referenciados por `Release`, `ReleaseCandidate` ou marcos institucionais (Gatekeeper NIT).
   * Checkpoints automáticos intermediários: retenção de 100% nas primeiras 48h; amostragem diária entre 3 e 30 dias; expurgo controlado em pequenos lotes com logs de auditoria após 30 dias.

---

## 5. Matriz de Critérios de Aceitação & Testes de Falhas Reais

Nenhuma evolução é promovida ao status `VALIDADO` sem aprovação nos testes de estresse, concorrência e partição real:

| Cenário de Teste | Comportamento Esperado | Status |
| :--- | :--- | :---: |
| **1. Pod Dono sofre crash durante digitação** | Clientes reconectam no novo Pod eleito, puxam a versão do banco e reenviam deltas pendentes sem perda de texto. | `VALIDADO` |
| **2. Pod antigo retorna após expiração do lease** | PostgreSQL rejeita a gravação do Pod zumbi via cláusula atômica `ownerGeneration = :myGen`. | `VALIDADO` |
| **3. Dois Pods tentam assumir o mesmo artigo** | Apenas um obtém sucesso no `UPDATE ownerGeneration < :newGen`; o segundo aborta e redireciona. | `VALIDADO` |
| **4. Autor digita offline e reconecta com edições concorrentes** | Outbox drena deltas locais via FIFO, backend faz rebase no servidor e ambos os clientes sincronizam via `RECONCILE_SYNC` sem F5. | `VALIDADO` |
| **5. Rajada de 50 deltas recebida do WebSocket** | Despacho direto e síncrono no CodeMirror evita que batching do React descarte deltas intermediários. | `VALIDADO` |
| **6. Restauração de Snapshot Histórico** | Todos os arquivos textuais e figuras retornam exatamente ao estado daquela versão (árvore integral com manifesto). | `VALIDADO` |
| **7. Imagem é substituída no MinIO** | Snapshots antigos continuam recuperando a imagem histórica via chave imutável baseada em hash. | `VALIDADO` |
| **8. Compilação com manifesto idêntico** | Backend ignora despacho ao container TeX Live e retorna URL do PDF em cache instantaneamente. | `PROPOSTO` |
| **9. Snapshot referenciado por Release formal** | Rotina de pruning detecta chave estrangeira/vínculo de negócio e ignora a exclusão do registro. | `PROPOSTO` |
| **10. Reconexão WebSocket após ACK perdido** | Protocolo de reconciliação canônica restaura paridade exata com o servidor preservando a seleção do cursor. | `VALIDADO` |
