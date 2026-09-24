# Especificação Técnica do Serviço Git de Infraestrutura (GitService)

## 📌 Visão Geral & Escopo

O `GitService` é o serviço de infraestrutura responsável por executar operações de baixo nível no Git CLI e interagir com as APIs REST/GraphQL do GitHub (via SDK oficial `@octokit/rest`).

Ele **não** possui regras de domínio acadêmico (como aprovação de revisores, cálculo de notas ou aprovação do NIT), servindo apenas como um provedor de primitivas técnicas desacopladas.

---

## 🛠️ Primitivas de Infraestrutura (`GitService`)

### 1. `commitWorkspaceProgress(data)`
- **Escopo**: Adiciona (`git add -A`), realiza o commit e efetua o push de **todos os arquivos e diretórios** (incluindo `sections/*.tex`) presentes no diretório isolado do workspace da tarefa (`projects/P/users/U/tasks/T`).
- **Retorno**: String contendo o SHA exato do commit (`HEAD`).

### 2. `createDraftPullRequest(data)`
- **Escopo**: Cria um Pull Request no GitHub em estado `draft: true` via Octokit REST API. Caso o PR já exista, localiza o PR existente.
- **Retorno**: 
  ```typescript
  Promise<{
    number: number;
    htmlUrl: string;
    nodeId?: string;
    baseCommitHash?: string;
    submittedCommitHash?: string;
  }>
  ```

### 3. `createReviewTag(data)`
- **Escopo**: Gera uma tag remota imutável `review/pr-<prId>-round-<roundNumber>` apontando diretamente para o `submittedCommitHash`.
- **Objetivo**: Evita a perda de alcançabilidade do commit (`garbage collection`) caso o Autor efetue um `--force push` na branch da tarefa posteriormente.

### 4. `markPullRequestReadyForReview(data)`
- **Escopo**: Converte um Draft PR no GitHub para o estado *Ready for Review*.

### 5. `getCommitSha(targetDir, ref)`
- **Escopo**: Executa `git rev-parse <ref>` e retorna o SHA correspondente a uma referência.

### 6. `getDiffFactsBetweenRefs(targetDir, baseRef, targetRef)`
- **Escopo**: Compara duas referências arbitrárias no Git e retorna a lista de fatos de modificação (arquivos adicionados, alterados, excluídos, adições e deleções de linhas).

### 7. `mergeBranch(data)` & `mergePullRequestOnGitHub(data)`
- **Escopo**: Realiza o merge da branch da tarefa na branch `dev` (ou `dev` em `main`) e sincroniza no GitHub remoto.

### 8. `deleteBranch(data)`
- **Escopo**: Apaga a branch remota do autor após a conclusão e mesclagem do trabalho (possui proteção estrita contra a exclusão acidental das branches `main`, `dev` e `master`).

---

## 📐 Invariantes de Infraestrutura Git

1. **Autenticação Efêmera Segura**:
   - Os comandos Git CLI utilizam o flag `-c http.extraHeader="Authorization: Basic ..."` em memória, garantindo que tokens do GitHub não sejam persistidos em texto plano nos arquivos `.git/config` locais.
2. **Desacoplamento de Domínio**:
   - O `GitService` não decide se uma revisão é válida ou se uma rodada deve ser criada; ele apenas disponibiliza SHAs e fatos de diff para os serviços de domínio (`PullRequestsService`).
