# ADR-003: Arquitetura Task-Driven Workspace e Gerenciamento de Branches & UX

* **Status:** Aprovado / Definido
* **Data:** 2026-09-11
* **Autor:** Equipe de Engenharia SCI-LaTeX
* **Relação com outros ADRs:** Complementa [`adr-001-github-user-access.md`](file:///home/gilson-russo/development/professional/sci-latex-vscode/docs/planning/backend/adr-001-github-user-access.md) e [`adr-002-kubernetes-on-demand-pods.md`](file:///home/gilson-russo/development/professional/sci-latex-vscode/docs/planning/backend/adr-002-kubernetes-on-demand-pods.md).

---

## 1. Contexto & Abstração de Domínio

No modelo inicial, a entrada no editor expunha diretamente a seleção de branches Git e a montagem física compartilhada do workspace. Para pesquisadores e escritores acadêmicos, termos como `git checkout`, `merge` ou `working tree` geravam fricção cognitiva.

### 🎯 A Solução: Arquitetura Orientada a Tarefas (Task-Driven Workspace)
O sistema introduz a abstração de **Task (Tarefa / Unidade de Trabalho)** como a ponte principal entre o domínio acadêmico e o versionamento Git:

```
Projeto → Participantes → Seções → Tasks → Workspace (Pod + Clone) → Git Branch
```

O usuário não seleciona arbitrariamente uma branch no Git; ele escolhe **em qual Tarefa quer trabalhar** (ex: *"Escrever a Introdução"*), e a plataforma orquestra automaticamente a branch, o repositório e o Pod sob demanda.

---

## 2. Decisões Arquiteturais Aprovadas

### 2.1 Modelo de Dados Centrado em Tasks (`Task` Entity)
- **Uma Task pertence a um projeto/seção** e possui um autor responsável (`assignedTo`), uma branch associada (ex: `section/introduction-123`), um status do workflow (`NOT_STARTED`, `IN_PROGRESS`, `UNDER_REVIEW`, `CHANGES_REQUESTED`, `APPROVED`, `MERGED`) e opcionalmente um `PullRequest`.
- O workspace/Pod do Kubernetes é efêmero e instanciado sob demanda especificamente para a **Task + Usuário** ativa (`workspace-pod-${projectId}-${userId}`).

### 2.2 Dashboard do Autor ("Minhas Tarefas")
Ao acessar um projeto, o autor visualizará seus cards de trabalho em vez de cair direto num editor genérico:
- Card com título da seção/tarefa, prazos e status.
- Botão primário **`[ 🚀 Iniciar Workspace ]`** ou **`[ 📝 Continuar Trabalho ]`**.
- Ao clicar, o frontend solicita o provisionamento da Task $\rightarrow$ O Fastify garante o checkout da branch da Task $\rightarrow$ O `code-server` é incorporado no iframe com os arquivos prontos para edição.

### 2.3 Fluxo por Papéis (Roles)

| Papel | Ação no Painel de Tasks | Comportamento do Workspace |
| :--- | :--- | :--- |
| **AUTOR (`AUTHOR`)** | Clica em `[Continuar Trabalho]` na sua Task | Abre o editor na branch `feature/task-*` para escrita LaTeX. Botão de *Salvar Progresso* e *Enviar p/ Revisão*. |
| **REVISOR (`REVIEWER`)** | Clica em `[Revisar Tarefa]` nas Tasks com status `UNDER_REVIEW` | Abre o workspace na branch da Task em modo de revisão/leitura com painel de parecer técnico. |
| **COORDENADOR (`COORDINATOR`)** | Visualiza a matriz de progresso de todas as Tasks | Aprova a progressão das etapas, aciona a compilação do PDF Master oficial e autoriza o merge. |
| **GERENTE (`MANAGER`)** | Acompanha indicadores e métricas globais | Visualiza prazos, justificativas de alteração de data e progresso geral dos artigos. |

### 2.4 Resolução de Conflitos Orientada a Tarefa
1. Quando a branch `dev` oficial avança, o backend marca a Task como `BEHIND`.
2. O autor clica no botão `[ 🔄 Atualizar Tarefa com a dev ]` no painel.
3. Se houver divergências (`CONFLICTED`), o autor é direcionado ao editor onde a interface nativa do VS Code auxilia na resolução dos conflitos no arquivo LaTeX.

## 3. Arquitetura de Dois Níveis de Revisão (Peer Review & Release Candidates)

O ciclo de vida do artigo distingue claramente dois níveis de revisão e versionamento:

```
dev (Branch Integrada)
 │
 ├── Task 1 (Autor A) ──➔ Peer Review (Pares/Co-autores) ──➔ Merge dev
 ├── Task 2 (Autor B) ──➔ Peer Review (Pares/Co-autores) ──➔ Merge dev
 │
 ├── 📦 Release Candidate 1 (RC-1) ──➔ Submetido ao Revisor Técnico (Orientador)
 │      └── Feedback: "Ajustar Seção 2" ──➔ Gera novas Tasks de correção ──➔ Merge dev
 │
 ├── 📦 Release Candidate 2 (RC-2) ──➔ Aprovado pelo Revisor Técnico
 │
 └── 🚀 Release (v1.0 na branch main) ──➔ Submissão Oficial ao Congresso A
```

### 3.1 Nível 1 — Revisão entre Pares (Peer Review de Tasks)
- **Escopo:** Revisão granular do trabalho de um co-autor em uma `Task` específica.
- **Fluxo:** Autor conclui a Task $\rightarrow$ Abre PR para a branch `dev` $\rightarrow$ Co-autores revisam/aprovam $\rightarrow$ Merge na `dev`.

### 3.2 Nível 2 — Revisão do Revisor Técnico / Orientador (Release Candidates - RC)
- **Escopo:** Avaliação do artigo completo consolidado.
- **Fluxo:** Quando a branch `dev` atinge maturidade, os autores geram um **Release Candidate (`RC-1`)** $\rightarrow$ O Revisor Técnico analisa a versão consolidada $\rightarrow$ Se aprovado, autoriza a publicação; se houver ressalvas (`CHANGES_REQUESTED`), o feedback gera **novas Tasks de correção**, reiniciando o fluxo granular até o `RC-2`.

### 3.3 Branches `dev` vs `main` (Ciclo de Publicação)
- **`dev` (Living Branch):** Branch de integração contínua onde as Tasks dos autores são mescladas e as RCs são avaliadas.
- **`main` (Publishable Releases Branch):** Branch oficial de publicações que armazena as **Releases (v1.0, v1.1, v2.0)** associadas a submissões reais em conferências/periódicos (ex: *v1.0: Submissão Congresso A*, *v1.1: Reversão/Camera-Ready Congresso A*, *v2.0: Submissão Periódico B*).

---

## 4. Modelo de Entidades Prisma Completo (`Task`, `Workspace`, `ReleaseCandidate`, `Release`)

```prisma
model Task {
  id            String         @id @default(uuid())
  projectId     String
  sectionId     String
  assignedToId  String
  title         String
  branchName    String
  status        TaskStatus     @default(NOT_STARTED)
  dueDate       DateTime?
  pullRequestId String?        @unique
  createdAt     DateTime       @default(now())
  updatedAt     DateTime       @updatedAt

  project       Project        @relation(fields: [projectId], references: [id], onDelete: Cascade)
  section       Section        @relation(fields: [sectionId], references: [id], onDelete: Cascade)
  assignee      User           @relation("UserTasks", fields: [assignedToId], references: [id])
  pullRequest   PullRequest?   @relation(fields: [pullRequestId], references: [id])
  workspaces    Workspace[]
}

model ReleaseCandidate {
  id          String   @id @default(uuid())
  projectId   String
  versionTag  String   // ex: RC-1, RC-2
  commitSha   String
  status      RCStatus @default(SUBMITTED)
  feedback    String?
  reviewerId  String?
  pdfUrl      String?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  project     Project  @relation(fields: [projectId], references: [id], onDelete: Cascade)
  reviewer    User?    @relation("ReviewerRCs", fields: [reviewerId], references: [id])
}

model Release {
  id          String   @id @default(uuid())
  projectId   String
  versionTag  String   // ex: v1.0, v1.1, v2.0
  commitSha   String
  title       String   // ex: "Submissão Congresso A"
  conference  String?
  pdfUrl      String?
  createdAt   DateTime @default(now())

  project     Project  @relation(fields: [projectId], references: [id], onDelete: Cascade)
}
```


