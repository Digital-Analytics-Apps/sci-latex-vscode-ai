# ADR 010: Persistência Durável de Apontamentos de Revisão (ReviewComment), Saneamento Relacional e Blindagem Zero-Keystrokes

- **Status:** APROVADO
- **Data:** 28 de Outubro de 2026
- **Autor(es):** Equipe de Engenharia, Produto e Arquitetura SCIA
- **Domínio:** Persistência Transacional, Ciclo de Revisão Acadêmica, Integridade Relacional e Modelagem de Dados
- **Componentes Relacionados:** `schema.prisma`, `backend` (`documents.repository.ts`, `documents.service.ts`), `docs` (`DATABASE.md`, `TRD.md`, `PRD.md`)

---

## 1. Contexto & Motivação

Durante a revisão técnica aprofundada dos modelos de dados e das garantias de durabilidade da plataforma SCIA, foram identificados três descompassos críticos entre a especificação teórica e a implementação:

1. **Vulnerabilidade de Apontamentos de Revisão:** A [ADR-008](file:///home/gilson-russo/development/professional/sci-latex-vscode/docs/planning/adrs/adr-008-workflow-6-etapas-revisao-desacoplamento-git.md) consagrou o papel do Revisor Acadêmico operando o editor em modo Read-Only e inserindo anotações inline ancoradas. No entanto, o backend mantinha esses comentários exclusivamente em um `Map` volátil em memória (`commentsMap`), sem persistência no PostgreSQL. Qualquer reinicialização, falha de container ou scale-down de Pods destruía o histórico de apontamentos da revisão acadêmica.
2. **Entidades Fantasmas e Divergência de Schema:** Documentos técnicos (`DATABASE.md` e versões preliminares do `TRD.md`) continuavam listando 17 tabelas relacionais com remanescentes de etapas antigas (`Team`, `TeamMember`, `TeamAcademicGoal`, `Workspace`, `GithubWebhookEvent` e `Project.gitRepoPath`), enquanto o `schema.prisma` real já havia migrado para a governança direta por `coordinatorId` e `managerId` em `Project`.
3. **Violação da Premissa Zero Keystrokes:** Embora a [ADR-007](file:///home/gilson-russo/development/professional/sci-latex-vscode/docs/planning/adrs/adr-007-collaborative-editor-architecture-scaling.md) tenha decretado o fim de gravações síncronas a cada tecla no banco de dados, o método legado `applyDelta` ainda executava `INSERT INTO "DocumentOperation"` síncrono a cada operação de caractere enviada por rotas legadas.

---

## 2. Decisão Arquitetural Adotada

Fica aprovada a consolidação das seguintes diretrizes técnicas no SCIA:

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                      SANEAMENTO DE PERSISTÊNCIA & DURABILIDADE (ADR 010)               │
├──────────────────────────────┬─────────────────────────────┬───────────────────────────┤
│ 1. ReviewComment no Banco    │ 2. Schema Prisma Canônico   │ 3. Zero Keystrokes Estrito│
│ - Tabela ReviewComment       │ - 14 Tabelas no Prisma      │ - Remoção de escrita sínc.│
│ - Ancoragem (from, to)       │ - Purgadas tabelas Team*    │ - DocumentOperation apenas│
│ - Cache + Persistência ACID  │ - Purgados campos Git       │   em snapshots/auditoria  │
│ - Threads de replies em JSON │ - coordinatorId/managerId   │ - Checkpoints debounced   │
└──────────────────────────────┴─────────────────────────────┴───────────────────────────┘
```

### 2.1. Persistência Relacional de `ReviewComment`

1. **Modelo de Dados no Prisma (`schema.prisma`):**
   ```prisma
   model ReviewComment {
     id           String   @id @default(uuid())
     projectId    String
     file         String   @default("main.tex")
     from         Int      @map("from")
     to           Int      @map("to")
     selectedText String   @db.Text
     userId       String
     userName     String
     userColor    String   @default("#3b82f6")
     content      String   @db.Text
     status       String   @default("open") // "open" | "resolved"
     replies      Json     @default("[]")
     createdAt    DateTime @default(now())
     updatedAt    DateTime @updatedAt

     project      Project  @relation(fields: [projectId], references: [id], onDelete: Cascade)
   }
   ```
2. **Ciclo de Vida Híbrido (Cache Quente + Gravação em Disco):**
   * Ao carregar a sessão (`getDocument`), os comentários são lidos do banco via `listComments(projectId)` e indexados na memória do Pod (`commentsMap`);
   * Operações de criação (`addComment`), resposta (`replyComment`), resolução (`resolveComment`) e exclusão (`deleteComment`) atualizam o cache quente para distribuição via WebSocket e persistem atomicamente no PostgreSQL;
   * Durante o checkpoint consolidado (`flushCheckpoint`), as posições atualizadas de comentários (ajustadas por digitação concorrente) são sincronizadas em lote no banco de dados.

### 2.2. Saneamento do Schema e Formalização das 14 Tabelas Reais

1. **Eliminação de Entidades Obsoletas:** Ficam definitivamente removidas de todos os diagramas e especificações as entidades `Team`, `TeamMember`, `TeamAcademicGoal`, `Workspace` e `GithubWebhookEvent`.
2. **Modelo de Governança Simplificado:**
   * `Project` possui relacionamento direto com `coordinator: User` (`coordinatorId`) e `manager: User` (`managerId`);
   * `Project` encapsula os tokens de concorrência e posse distribuída: `currentVersion: Int` e `ownerGeneration: Int`;
   * `AcademicPeriod` gerencia as metas globais de ciclo via `targetArticlesCount`.
3. **Lista Oficial das 14 Tabelas Canônicas:**
   `User`, `Session`, `AuditLog`, `AcademicPeriod`, `Project`, `ProjectMember`, `ProjectStage`, `Task`, `ReleaseCandidate`, `Release`, `NitProcess`, `ProjectFile`, `DocumentSnapshot` e `ReviewComment`.

### 2.3. Blindagem Inegociável de "Zero Keystrokes no Banco"

1. **Remoção de Escrita por Tecla:** O método `applyDelta` no `documents.service.ts` deixa de invocar `appendOperation` no caminho quente de digitação. 
2. **Persistência Exclusiva por Checkpoint:** Todo o texto gerado por `@codemirror/collab` ou deltas transita em memória RAM e é persistido no PostgreSQL estritamente pelos gatilhos do debounce híbrido (Idle 3s, MaxWait 15s, Volume 50 ops, Fechamento de Sala).

---

## 3. Consequências & Benefícios

* **Resiliência a Falhas de Pods:** Apontamentos e feedbacks de orientadores e revisores sobrevivem a qualquer reinício, scale-down ou crash de Pods.
* **Fim da Dívida Técnica Documental:** Sincronia de 100% entre `DATABASE.md`, `TRD.md`, `PRD.md` e o `schema.prisma`.
* **Desempenho Preservado:** Zero impacto em I/O no banco durante a digitação colaborativa contínua.

---

## 4. Verificação & Homologação

A conformidade desta decisão foi verificada através dos seguintes testes automatizados:
1. `src/modules/documents/documents.service.test.ts`:
   * `deve persistir e carregar comentários de revisão (ReviewComment) via repositório` (Aprovado);
   * `flushCheckpoint deve persistir conteúdo no repositório e criar snapshot` (Aprovado).
2. Validação estática de tipos do TypeScript (`npx tsc --noEmit` com 0 erros).
