# ADR 011: Arquitetura de Evidências de Tarefas (TaskEvidence), Upload Direto via URLs Pré-Assinadas (MinIO) e Isolamento por Projeto

- **Status:** APROVADO
- **Data:** 01 de Novembro de 2026
- **Autor(es):** Equipe de Engenharia, Produto e Arquitetura SCIA
- **Domínio:** Armazenamento de Objetos (S3/MinIO), Governança de Tarefas (Etapas 1 e 2), Upload Direto Desacoplado, Integridade Relacional e UX de Envio em Lote
- **Componentes Relacionados:** `schema.prisma`, `backend` (`infra/minio.ts`, `task-evidences.service.ts`, `task-evidences.controller.ts`, `task-evidences.repository.ts`, `tasks.routes.ts`), `frontend` (`tasksService.ts`, `useTaskQueries.ts`, `GanttTaskDetailDrawer.tsx`, `api.constants.ts`), `k8s/manifests/` (`backend-cluster.yaml`, `frontend.yaml`)

---

## 1. Contexto & Motivação

Durante o fluxo de desenvolvimento de artigos científicos e pesquisa experimental no SCIA (especialmente na **Etapa 1 - Planejamento e Pesquisa** e **Etapa 2 - Desenvolvimento Experimental & Benchmarks**), os pesquisadores necessitam anexar artefatos comprobatórios:
1. **Gráficos e Imagens:** Plots de convergência, diagramas de arquitetura, capturas de telas de benchmarks (PNG, JPG, SVG).
2. **Relatórios e PDFs:** Documentos de metodologia, resumos analíticos e logs de execução (PDFs até 100 MB).
3. **Links Externos:** Repositórios de código (GitHub), notebooks interativos (Google Colab) e datasets abertos (Zenodo, Kaggle).

### Problemas Técnicos Anteriores:
- **Ausência de Modelagem de Evidências:** A entidade `Task` não possuía relacionamentos para anexos nem campos para rastreabilidade de arquivos, forçando o envio de anotações soltas ou obrigando pesquisadores a misturar arquivos experimentais na árvore TeX do artigo (`ProjectFile`).
- **Risco Crítico de I/O e Esgotamento de Memória no Backend:** O upload tradicional via multipart com proxy pelo Node.js (`Fastify`) obriga o processo a alocar buffers do arquivo inteiro em memória RAM (`Buffer.from`) para repassar ao storage, saturando o Event Loop com I/O de rede desnecessário e gerando risco de *Out-Of-Memory* (OOM) sob concorrência.
- **Quedas de Conexão e Arquivos Fantasmas:** Uploads sem confirmação atômica geram binários órfãos no storage ou apontamentos para arquivos inexistentes no banco relacional.

---

## 2. Decisão Arquitetural Adotada

Fica estabelecida uma **arquitetura híbrida desacoplada com Upload Direto ao Storage de Objetos (MinIO/S3)** baseada em URLs pré-assinadas e confirmação em duas fases (*Two-Phase Commit*).

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│               ARQUITETURA DE EVIDÊNCIAS DE TAREFAS - MINIO + POSTGRESQL                │
├──────────────────────────────┬─────────────────────────────┬───────────────────────────┤
│ 1. Upload Direto (Pre-signed)│ 2. Isolamento por Projeto   │ 3. Máquina de Estados     │
│ - Zero buffer no Node.js     │ - Pasta raiz: projects/:id  │ - PENDING na geração      │
│ - PUT direto Navegador->MinIO│ - Subpasta: tasks/:id/evid. │ - CONFIRMED após stat     │
│ - GET pré-assinado (1h TTL)  │ - Nomes com UUID anti-colisão│ - Links diretos no banco  │
└──────────────────────────────┴─────────────────────────────┴───────────────────────────┘
```

---

### 2.1. Modelo Relacional no Prisma (`schema.prisma`)

A formalização da 15ª entidade canônica do SCIA:

```prisma
enum EvidenceType {
  IMAGE
  PDF
  LINK
}

enum EvidenceStatus {
  PENDING    // URL gerada; aguardando envio do binário pelo cliente
  CONFIRMED  // Binário verificado no MinIO via statObject
}

model TaskEvidence {
  id           String         @id @default(uuid())
  taskId       String
  projectId    String
  uploadedById String
  type         EvidenceType
  status       EvidenceStatus @default(PENDING)
  title        String
  url          String?        // Preenchido para type == LINK
  storageKey   String?        // projects/:projId/tasks/:taskId/evidences/:id-:fileName
  fileName     String?
  mimeType     String?
  sizeBytes    BigInt?
  createdAt    DateTime       @default(now())
  updatedAt    DateTime       @updatedAt

  task         Task           @relation(fields: [taskId], references: [id], onDelete: Cascade)
  project      Project        @relation(fields: [projectId], references: [id], onDelete: Cascade)
  uploadedBy   User           @relation(fields: [uploadedById], references: [id], onDelete: Cascade)

  @@index([taskId])
  @@index([projectId])
}
```

---

### 2.2. Fluxo Operacional: Two-Phase Commit com Upload Direto

```
1. Solicitação de Upload:
   Browser ──(nome, tipo, tamanho)──► Fastify (Valida Etapa 1 ou 2, limites e tipos)
   Fastify ──(Gera storageKey e URL pré-assinada)──► Browser (Retorna { evidenceId, uploadUrl })
   Fastify ──(Persiste TaskEvidence como PENDING)──► PostgreSQL

2. Transmissão do Binário:
   Browser ──(HTTP PUT direto com barra de progresso %)──► MinIO (Bucket collab-assets)

3. Confirmação e Ativação:
   Browser ──(POST /evidences/:id/confirm)──► Fastify
   Fastify ──(minioClient.statObject(key))──► MinIO (Valida presença e tamanho)
   Fastify ──(UPDATE status = CONFIRMED)────► PostgreSQL
```

- **Links Externos (Zenodo, GitHub, Colab):** Transitam diretamente via `POST /evidences/link` e nascem imediatamente com `status: "CONFIRMED"` e `type: "LINK"`, sem tocar no MinIO.

---

### 2.3. Particionamento Estrito no Bucket

O storage de objetos adota particionamento hierárquico isolando o ciclo de vida por projeto e por tarefa:

```
collab-assets/
 └── projects/
      └── {projectId}/
           ├── files/                            <-- Arquivos LaTeX do artigo (.tex, .bib)
           └── tasks/
                └── {taskId}/
                     └── evidences/              <-- Evidências das Etapas 1 e 2
                          ├── {evidenceId}-grafico-latencia.png
                          └── {evidenceId}-benchmark-completo.pdf
```

---

### 2.4. Resolução de DNS e Assinatura Criptográfica S3 (`minioPresignClient`)

No Kubernetes/Docker, o backend comunica-se com o MinIO via rede interna (`minio:9000`), mas o navegador do cliente acessa o MinIO via host externo (`localhost:9000` ou domínio público).

Como o cabeçalho `Host` faz parte da assinatura criptográfica HMAC-SHA256 (`X-Amz-SignedHeaders=host`), alterar o hostname da URL após a assinatura invalida o hash e dispara HTTP 403 `SignatureDoesNotMatch`.

**Decisão:**
1. O backend instancia um cliente MinIO dedicado (`minioPresignClient` em `infra/minio.ts`) configurado com `MINIO_PUBLIC_URL` e `region: 'us-east-1'`.
2. A especificação explícita de `region: 'us-east-1'` impede que o SDK faça chamadas de rede internas desnecessárias (`getBucketRegion`) e calcula a assinatura offline em memória em menos de 1 ms.
3. O frontend injeta a variável `VITE_MINIO_URL` (`env-config.js`) garantindo que as requisições apontem deterministicamente para o storage público.

---

### 2.5. Experiência de Usuário: Fila de Estágio (Staging Queue) no Frontend

Para evitar disparos prematuros de rede a cada arquivo selecionado, o componente `GanttTaskDetailDrawer.tsx` implementa o padrão de fila de estágio:
- **Seleção Múltipla:** O usuário anexa arquivos e insere links que entram em uma lista transitória ("ITENS PRONTOS PARA SALVAR").
- **Edição Prévia:** O usuário pode inspecionar e remover qualquer item da fila antes do envio.
- **Disparo em Lote:** O botão `Salvar Evidências (N)` aciona o envio sequencial com status individual e barra de progresso em tempo real, ativando as evidências no banco e atualizando a interface automaticamente.

---

## 3. Consequências & Benefícios

1. **Eficiência de Recursos:** O backend Node.js não trafega nenhum megabyte de arquivos pesados. O consumo de CPU e memória RAM do backend permanece plano mesmo durante uploads simultâneos de 100 MB.
2. **Resiliência a Quedas:** Caso a conexão caia no meio do upload, o MinIO descarta o buffer incompleto e o registro permanece como `PENDING`. Revisores e orientadores só visualizam evidências `CONFIRMED`.
3. **Governança Institucional:** Tarefas pertencentes às Etapas 3 a 6 (Escrita, Revisão, NIT, Congresso) são estritamente bloqueadas na API (`EVIDENCE_NOT_ALLOWED_STAGE`), preservando o fluxo de submissão acadêmica formal do SCIA.
4. **Segurança de Propriedade Intelectual:** Arquivos de evidência são consultados via URLs pré-assinadas de GET válidas por 1 hora, impedindo acesso não autorizado a dados de pesquisa não publicados.

---

## 4. Verificação & Conformidade

- **Testes Unitários:** 10 testes dedicados em `task-evidences.service.test.ts` cobrindo travas de etapa, validação de MIME types, limites de tamanho (25 MB para imagens, 100 MB para PDFs), geração de chaves S3, confirmação com `statObject` e deleção dupla.
- **Suíte Completa:** 56/56 testes aprovados em 12 suítes do Vitest (`npm run test`).
- **Análise Estática:** ESLint e Prettier com zero erros e conformidade estrita às regras `ts-no-any` e `ts-set-map`.
- **Validação E2E no Cluster:** Teste de integração real com `presign` $\rightarrow$ `PUT MinIO` $\rightarrow$ `confirm` $\rightarrow$ `list` executado e aprovado com sucesso no cluster KinD.
