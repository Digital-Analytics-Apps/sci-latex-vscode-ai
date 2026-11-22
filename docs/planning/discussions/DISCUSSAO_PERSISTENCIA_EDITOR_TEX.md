# 📑 Discussão Arquitetural: Persistência, Integridade e Evolução do Editor TeX

- **Data:** 21 de Novembro de 2026
- **Status:** EM DISCUSSÃO / ALINHAMENTO TÉCNICO
- **Contexto:** Análise crítica do formato de salvamento do arquivo `.tex`, garantias de consistência ACID, resiliência do editor colaborativo e roadmap de evolução.
- **Documentos Relacionados:**
  - [`ADR-007: Arquitetura Unificada do Editor Colaborativo`](../../architecture/adrs/adr-007-collaborative-editor-architecture-scaling.md)
  - [`collaborative-editor-spec.md: Especificação Canônica do Editor`](../../specs/collaborative-editor-spec.md)
  - [`DATABASE.md: Dicionário de Dados e ERD`](../../architecture/database/DATABASE.md)

---

## 🎯 Síntese do Alinhamento

A estratégia atual está **conceitualmente correta e aprovada**. Não há necessidade de substituição ou adoção de salvamento por tecla/CRDTs puros. A atuação concentra-se em blindar a atomicidade e evoluir pontos específicos sem comprometer o desempenho da colaboração em tempo real ($< 2$ms na RAM do Pod Dono).

A discussão foi estruturada em **quatro decisões fundamentais**:

---

## 1. O que Devemos Preservar (Arquitetura Canônica)

Fica mantida a integridade dos seguintes pilares estabelecidos na [ADR-007](../../architecture/adrs/adr-007-collaborative-editor-architecture-scaling.md):

* **PostgreSQL 16 como Única Fonte da Verdade Persistente:** Transações ACID garantem conformidade com tarefas, etapas de governança (NIT, submissões) e histórico unificado.
* **Arquivos Textuais em `TEXT` UTF-8:** Padrão ótimo para código-fonte LaTeX (sem custo de serialização e com compressão nativa TOAST em disco).
* **Binários no MinIO S3:** Figuras pesadas (PNG/JPG), assets de templates e PDFs compilados ficam fora do banco relacional, garantindo backups ágeis e zero inchaço de WAL.
* **Digitação e Operações OT na RAM do Pod Dono:** `@codemirror/collab` mantido no processo Node.js Fastify para latência ultra-baixa.
* **Redis Exclusivamente para Coordenação:** Gestão de posse de documento (`editor:document:<id>:owner` com TTL 15s / Heartbeat 2s) e presença online. Zero keystrokes de texto no Redis.
* **Debounce Híbrido Multi-Critério:** Checkpoint disparado por inatividade (3s), teto máximo contínuo (15s), volume acumulado (50 ops) ou encerramento de sala/SIGTERM.
* **Fencing Token:** Proteção arquitetural contra anomalias de *Split-Brain*.

---

## 2. As Três Evoluções Identificadas

| Evolução | Avaliação Técnica | Prioridade |
| :--- | :--- | :---: |
| **A. Snapshot Multi-Arquivo** | Essencial para garantir rollbacks integrais e fiéis do artigo | **Alta** |
| **B. Hash SHA-256 e Cache** | Muito útil para otimização de compilação TeX Live incremental | **Média** |
| **C. Snapshot Pruning** | Necessário para controlar o crescimento sustentável do PostgreSQL | **Alta** |

### A. Snapshot Multi-Arquivo
* **Cenário:** Artigos reais são modulares (ex: `main.tex`, `sections/introduction.tex`, `sections/methodology.tex`, `references.bib`, `figures/architecture.png`).
* **Problema Atual:** O `DocumentSnapshot.content` grava apenas a string do `main.tex`. Um rollback atual restaura o arquivo raiz mas deixa os arquivos secundários na versão mais recente.
* **Solução:** `DocumentSnapshot` deve conter um manifesto JSONB (`manifest Json`) mapeando todos os arquivos textuais consolidados e as referências de binários no MinIO no instante exato do snapshot.

### B. Hash SHA-256 & Compilation Manifest Hash
* **Constatação Crítica:** O hash de um arquivo isolado não basta para o cache de compilação em LaTeX, pois macros, preâmbulos, bibliografias e versões do compilador alteram o resultado das múltiplas passadas (`pdflatex` $\to$ `bibtex` $\to$ `pdflatex`).
* **Solução:** Implementar um **Compilation Manifest Hash** composto:
  $$\text{Hash} = \text{SHA256}(\text{hashes dos arquivos textuais} + \text{chaves dos assets MinIO} + \text{templateId} + \text{compilerImageVersion})$$
  Permite reutilização imediata de PDFs já compilados no MinIO sem nova invocação do motor TeX Live.

### C. Snapshot Pruning Inteligente
* **Princípio:** Não executar expurgo cego por tempo (ex.: "apagar tudo após 30 dias").
* **Diretriz de Retenção:**
  1. *Snapshots Imutáveis:* Vinculados a `Release`, `ReleaseCandidate` ou marcos institucionais (Gatekeeper NIT) nunca são deletados.
  2. *Snapshots Transitórios:*
     * Últimas 48h: retenção de 100% dos checkpoints.
     * De 3 a 30 dias: compactação para 1 snapshot representativo por dia.
     * Mais de 30 dias: expurgo dos checkpoints automáticos sem tag ou marco.

---

## 3. Segurança da Consistência: Dois Pontos Adicionais

### 1. Atomicidade Real do Fencing Token no SQL (Correção do TOCTOU)
* **Diagnóstico no Código:** Em `documents.repository.ts`, a verificação atual é feita em dois passos na aplicação:
  ```typescript
  // 1. Leitura
  const current = await tx.project.findUnique({ where: { id } });
  // 2. Validação no Node.js
  if (current.ownerGeneration > data.ownerGeneration) throw new Error("Fencing Token Conflict");
  // 3. Escrita
  await tx.project.update({ where: { id }, data: { ... } });
  ```
  Isso gera uma janela de **TOCTOU (Time of Check to Time of Use)** se o pod sofrer pausa longa de Garbage Collection entre a leitura e o update.
* **Correção Necessária:** Validação atômica diretamente na cláusula `WHERE` da instrução SQL:
  ```sql
  UPDATE "Project"
  SET "currentVersion" = :newVersion, "ownerGeneration" = :myGen
  WHERE "id" = :id
    AND "ownerGeneration" <= :myGen
    AND "currentVersion" = :expectedOldVersion;
  ```
  Se o número de linhas afetadas for zero, aborta com conflito imediatamente.

### 2. O Buffer do Navegador não é Persistência Durável (Local Outbox com IndexedDB)
* **Diagnóstico:** O buffer `sendableUpdates` do `@codemirror/collab` reside na heap da aba do navegador.
* **Risco:** Protege contra desconexão transitória de WebSocket enquanto a aba estiver aberta. Mas se o usuário fechar a aba, recarregar a página (F5) ou sofrer um crash do browser com deltas pendentes, as alterações locais são perdidas.
* **Solução Arquitetural Aprovada (Padrão Overleaf):**
  1. **Schema do IndexedDB (`idb`):**
     * Armazena por documento: `docId`, `clientID` único persistido, `baseText` (último texto confirmado), `baseVersion` (versão correspondente) e a fila `pendingUpdates: SerializedUpdate[]` (`ChangeSet.toJSON()`).
  2. **Ciclo de Persistência:**
     * Ao digitar: serializa os `sendableUpdates` e grava no IndexedDB com debounce de 200ms.
     * Ao recarregar a página (F5): reconstrói o `EditorState` aplicando os updates pendentes do IndexedDB sobre o `baseText` antes de conectar ao WebSocket.
  3. **Protocolo PULL-First na Reconexão (Anti-Duplicação de ACK Perdido):**
     * Ao restabelecer o WebSocket, o cliente emite `PULL_UPDATES` a partir da sua `baseVersion`. Se o servidor já havia processado as operações do cliente antes da queda de rede, ele devolve o update com o mesmo `clientID`. O `@codemirror/collab` detecta o ID, avança a versão e limpa o `sendableUpdates` e o IndexedDB sem duplicar caracteres.
  4. **Controle de Múltiplas Abas Locais (Web Locks API + BroadcastChannel):**
     * Uso de `navigator.locks.request("cm6-doc-exclusive-lock:${docId}", { ifAvailable: true })`.
     * Apenas a aba líder adquire a exclusividade de escrita no IndexedDB e no WebSocket daquele artigo.
     * Se o usuário abrir o mesmo artigo em outra aba, a segunda aba exibe a tela de *"Documento aberto em outra aba"* (com botão *"Editar nesta aba"* via `FORCE_TAKEOVER`), prevenindo corrupção de concorrência local.
  5. **Circuit Breaker de 10 Minutos Offline (Compartment Dinâmico):**
     * Se o cliente ficar offline por até 10 minutos, o editor segue editável e acumula no Outbox.
     * Atingidos os 10 minutos, o `readOnlyCompartment.reconfigure(EditorState.readOnly.of(true))` trava novas digitações exibindo *"Edição pausada após 10 minutos offline para evitar divergência de histórico"*, liberando a escrita automaticamente quando a conexão voltar e o PULL for concluído.
  6. **Multi-Navegador / Multi-Dispositivo:**
     * Dispositivos ou navegadores distintos geram `clientID` UUIDs diferentes e possuem IndexedDBs isolados, operando como colaboradores concorrentes normais com convergência matemática automática via `rebaseUpdates`.

---

## 4. Ordem de Execução Recomendada

```
1. Fencing Token Atômico (SQL WHERE) ──► Blindagem imediata contra Split-Brain
              ▼
2. Snapshot Multi-Arquivo (JSONB)    ──► Rollback integral do artigo científico
              ▼
3. Hash SHA-256 Composto             ──► Cache inteligente de compilação TeX Live
              ▼
4. Snapshot Pruning Inteligente      ──► Sustentabilidade e higiene do PostgreSQL
              ▼
5. Local Outbox no Frontend          ──► Proteção contra fechamento de aba / F5
```
