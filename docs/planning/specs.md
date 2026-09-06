# Especificação Técnica e Arquitetural (Specs)

**Projeto:** Plataforma Web de Escrita Científica Self-Hosted  
**Última Atualização:** 2026-09-05  
**Status:** Especificação Completa (Modelo de Compilação Duplo, Provisionamento Git, Token de Serviço, Stream SSE)  

---

## 1. Visão Geral e Objetivos

Este documento contém as especificações técnicas, padrões de código, modelo de dados e decisões de arquitetura para a plataforma de escrita científica. Ele garante a consistência técnica durante todas as fases do desenvolvimento.

> [!IMPORTANT]
> **Padrão de Código em Inglês:**  
> Todos os identificadores de código (modelos, enums, interfaces, variáveis, funções, rotas, props, classes) devem ser escritos estritamente em **Inglês**. Comentários e documentações explicativas podem ser em **Português**.

---

## 2. Arquitetura do Modelo Duplo de Compilação LaTeX

Para garantir performance imediata ao Autor e reprodutibilidade ao Revisor/Coordenador, o sistema adota um **Modelo Duplo de Compilação**:

```mermaid
graph TD
    subgraph "1. Compilação de Edição (Interativa / Autor)"
        Author[Autor no VS Code Iframe] -->|Ctrl+S / Auto-build| Extension[Extensão LaTeX Workshop]
        Extension -->|Local TeX Live| LocalPDF[PDF Preview na aba do VS Code]
    end

    subgraph "2. Compilação Oficial do Servidor (Revisão & Release)"
        PR[Abertura de PR / Solicitado pelo Revisor] -->|Dispara Job| WorkerTeX[Worker RabbitMQ: latex.compilation]
        WorkerTeX -->|Docker Isolated Container TeX Live| ServerPDF[PDF Oficial do PR / Artigo Consolidado]
        ServerPDF -->|Exibe no React PDF Viewer| Reviewer[Tela do Revisor / Coordenador]
    end
```

### 2.1 Por que temos duas formas de compilação?
1. **No VS Code do Autor (Interativo):** O container do `code-server` de cada usuário já possui o TeX Live e a extensão `LaTeX Workshop` instalada, gerando o PDF em tempo real na aba do editor enquanto ele escreve.
2. **No Servidor Backend (Background Queue):** A compilação via fila `latex.compilation` é executada para:
   * Gerar o PDF oficial que é exibido no **PDF Viewer da tela do Revisor** (para que o Revisor avalie o PR sem precisar entrar na máquina/workspace do autor).
   * Gerar o **PDF final consolidado do artigo completo** (mesclando todas as seções: Introdução, Metodologia, Resultados, etc.) para download e submissão ao congresso.

---

## 3. Arquitetura de Provisionamento Git & Controle de Acesso (Service Token)

### 3.1 Como Funciona o Acesso e Criação de Repositórios

O usuário **NÃO** precisa gerenciar chaves SSH ou tokens individuais de Git manualmente. A autenticação do usuário com a plataforma é realizada por **JWT (JSON Web Token)**, enquanto as operações de Git no servidor são gerenciadas pela **Conta de Serviço do Sistema**.

```mermaid
graph TD
    User[Autor / Coordenador] -->|1. Autentica via JWT| API[Backend Fastify]
    API -->|2. Valida Permissão de Projeto/Equipe| DB[(PostgreSQL)]
    API -->|3. Usa SERVICE_TOKEN do Sistema| GitServer[Servidor Git Self-Hosted / Bare Repos]
    API -->|4. Atribui identidade nos Commits| WorkerGit[Worker RabbitMQ: git.operations]
    WorkerGit -->|5. Commit com author='User Email'| LocalRepo[Repositório Git do Artigo]
```

---

## 4. Stack Tecnológica Oficial

| Camada | Tecnologia Escolhida | Racional Técnico |
| :--- | :--- | :--- |
| **Frontend** | ReactJS + TypeScript | Tipagem estrita, performance de renderização e rico ecossistema de UI. |
| **Gerenciamento de Estado** | Redux Toolkit (UI) + TanStack Query (API) | Separação clara entre estado de interface/iframe e cache de requisições. |
| **Comunicação Real-Time** | Server-Sent Events (SSE) | Stream HTTP unidirecional leve (`EventSource`) para notificações sem overhead. |
| **Backend Framework** | Fastify (Node.js + TypeScript) | Alto desempenho de I/O, suporte a esquemas JSON (AJV) e baixo overhead. |
| **ORM & Banco de Dados** | Prisma ORM + PostgreSQL | Relacionamentos estritos, transações ACID e logs em JSONB. |
| **Mensageria & Filas** | RabbitMQ | Desacoplamento assíncrono para operações de Git, Docker TeX (PRs e Release), notificações e cron de prazos. |
| **Ambiente de Edição** | VS Code (`code-server` via Iframe) | Experiência de desenvolvimento completa para LaTeX (com extensão LaTeX Workshop e TeX Live local). |
| **Compilação TeX Oficial** | Docker + Imagem TeX Live | Compilações isoladas de PRs e artigos consolidados sem poluir o host. |

---

## 5. As 7 Fases do Ciclo de Vida do Artigo

```
[Fase 1: Cadastro & Prazos] ──> [Fase 2: Escrita & Commits] ──> [Fase 3: Revisão Acadêmica]
                                                                        │
                                                               [Fase 4: Validação NIT]
                                                                        │
[Fase 7: Pós-Submissão & Decisão dos Autores] <── [Fase 6: Submissão] <── [Fase 5: Merge pelo Autor]
    │
    ├── [Cenário A: ACEITO] ───────────> Metadados Finais (DOI, Links, Camera-Ready) ──> [CONCLUÍDO]
    │
    ├── [Cenário B: REVISÃO SOLICITADA] ──> Correções no Mesmo Congresso ─────────────> [Reenvio Mesma Conferência]
    │
    └── [Cenário C: REJEITADO] ─────────> Autores Decidem: Congresso Backup ou Novo ──> [Ajustes v2]
```

---

## 6. Especificação do Modelo de Dados (Prisma Schema Reference)

```prisma
enum Role {
  AUTHOR
  REVIEWER
  COORDINATOR
  MANAGER
  ADMIN
}

enum PRStatus {
  DRAFT
  UNDER_REVIEW
  CHANGES_REQUESTED
  APPROVED
  MERGED
  CANCELLED
}

enum NITStatus {
  NOT_REQUIRED
  WAITING_NIT
  APPROVED_NIT
  REJECTED_NIT
}

enum SubmissionStatus {
  IN_PROGRESS
  WAITING_NIT
  SUBMITTED_TARGET
  SUBMITTED_BACKUP
  ACCEPTED_REVISION_REQUESTED
  ACCEPTED_CAMERA_READY
  REJECTED_WAITING_DECISION
  REJECTED_REOPENED_V2
  COMPLETED_PUBLISHED
}

enum DeadlineStatus {
  ON_TIME
  WARNING_SOON
  OVERDUE
}

model User {
  id            String          @id @default(uuid())
  email         String          @unique
  name          String
  passwordHash  String
  role          Role            @default(AUTHOR)
  createdAt     DateTime        @default(now())
  updatedAt     DateTime        @updatedAt
  
  coordinatedTeams Team[]       @relation("TeamCoordinator")
  managedTeams     Team[]       @relation("ManagerTeams")
  teamMemberships  TeamMember[]

  projects      ProjectMember[]
  pullRequests  PullRequest[]   @relation("AuthorPRs")
  reviews       PullRequest[]   @relation("ReviewerPRs")
  comments      ReviewComment[]
  sessions      Session[]
  auditLogs     AuditLog[]
}

model AcademicPeriod {
  id        String    @id @default(uuid())
  name      String    // e.g., "Academic Cycle 2026/2027"
  startDate DateTime
  endDate   DateTime
  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt
  projects  Project[]
}

model Team {
  id            String       @id @default(uuid())
  name          String
  description   String?
  managerId     String?
  coordinatorId String
  manager       User?        @relation("ManagerTeams", fields: [managerId], references: [id])
  coordinator   User         @relation("TeamCoordinator", fields: [coordinatorId], references: [id])
  createdAt     DateTime     @default(now())
  updatedAt     DateTime     @updatedAt
  members       TeamMember[]
  projects      Project[]
}

model TeamMember {
  id        String   @id @default(uuid())
  teamId    String
  userId    String
  role      Role     @default(AUTHOR)
  team      Team     @relation(fields: [teamId], references: [id], onDelete: Cascade)
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([teamId, userId])
}

model Project {
  id                      String           @id @default(uuid())
  name                    String
  description             String?
  gitRepoPath             String
  teamId                  String
  academicPeriodId        String?
  
  submissionStatus        SubmissionStatus @default(IN_PROGRESS)
  currentVersion          Int              @default(1)
  
  targetConferenceName    String?
  targetConferenceDate    DateTime?
  backupConferenceName    String?
  backupConferenceDate    DateTime?
  
  doi                     String?
  publicationUrl          String?
  datasetUrl              String?
  publishedAt             DateTime?
  
  reviewerFeedback        String?
  
  team                    Team             @relation(fields: [teamId], references: [id], onDelete: Cascade)
  academicPeriod          AcademicPeriod?  @relation(fields: [academicPeriodId], references: [id])
  createdAt               DateTime         @default(now())
  updatedAt               DateTime         @updatedAt
  members                 ProjectMember[]
  sections                Section[]
  prs                     PullRequest[]
}

model ProjectMember {
  id        String   @id @default(uuid())
  userId    String
  projectId String
  role      Role
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  project   Project  @relation(fields: [projectId], references: [id], onDelete: Cascade)

  @@unique([userId, projectId])
}

model Section {
  id          String        @id @default(uuid())
  title       String
  filePath    String
  branchName  String
  projectId   String
  assignedTo  String?
  
  startDate   DateTime?
  dueDate     DateTime?
  
  project     Project       @relation(fields: [projectId], references: [id], onDelete: Cascade)
  prs         PullRequest[]
}

model PullRequest {
  id          String          @id @default(uuid())
  title       String
  description String?
  status      PRStatus        @default(DRAFT)
  
  nitStatus   NITStatus       @default(NOT_REQUIRED)
  nitNotes    String?
  
  sectionId   String
  authorId    String
  reviewerId  String?
  projectId   String
  createdAt   DateTime        @default(now())
  updatedAt   DateTime        @updatedAt
  mergedAt    DateTime?
  section     Section         @relation(fields: [sectionId], references: [id], onDelete: Cascade)
  author      User            @relation("AuthorPRs", fields: [authorId], references: [id])
  reviewer    User?           @relation("ReviewerPRs", fields: [reviewerId], references: [id])
  project     Project         @relation(fields: [projectId], references: [id], onDelete: Cascade)
  comments    ReviewComment[]
}

model ReviewComment {
  id            String      @id @default(uuid())
  pullRequestId String
  userId        String
  lineNumer     Int?
  comment       String
  createdAt     DateTime    @default(now())
  pullRequest   PullRequest @relation(fields: [pullRequestId], references: [id], onDelete: Cascade)
  user          User        @relation(fields: [userId], references: [id])
}

model AuditLog {
  id         String   @id @default(uuid())
  userId     String?
  action     String
  entityType String
  entityId   String
  details    Json?
  createdAt  DateTime @default(now())
  user       User?    @relation(fields: [userId], references: [id], onDelete: SetNull)
}

model Session {
  id           String   @id @default(uuid())
  userId       String
  refreshToken String   @unique
  expiresAt    DateTime
  createdAt    DateTime @default(now())
  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)
}
```
