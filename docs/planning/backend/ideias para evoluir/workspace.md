# 🛠️ Ideias e Evolução do Workspace (Backend & K8s)

**Data de Atualização:** 14 de Setembro de 2026  
**Relação com ADRs:** Complementa a [ADR-002: Pods sob demanda](file:///home/gilson-russo/development/professional/sci-latex-vscode/docs/planning/backend/adr-002-kubernetes-on-demand-pods.md) e a [ADR-003: Task-Driven Workspace & Branches](file:///home/gilson-russo/development/professional/sci-latex-vscode/docs/planning/backend/adr-003-user-git-workspace-flow.md).

---

## 📌 1. Correções de Bugs e Comportamentos Inesperados

### 🐛 1.1 Atualização de Status na Tabela `Workspace` ao Destruir Pod
* **Problema Atual**: Quando o Pod é destruído (por encerramento do SSE, tempo de inatividade no `events.manager.ts` ou remoção manual no K8s), o registro na tabela `Workspace` do banco de dados permanece como `READY` ou em estado indefinido.
* **Solução Proposta**:
  * No método de encerramento/destruição do Pod no `events.manager.ts` e `k8s-pod-manager.service.ts`, invocar a atualização de status via repositório:
    `workspacesRepository.updateStatus(podName, 'TERMINATED')` ou `'DELETED'`.
  * Adicionar evento SSE notificando o frontend sobre a finalização do Pod.

### 🐛 1.2 Redirecionamento Prematuro do Usuário para o Workspace
* **Problema Atual**: O frontend redireciona a página para a rota `/workspace/:id` antes do Pod do K8s estar com o servidor HTTP e extensões TeX ativas, gerando uma experiência de carregamento instável dentro do iframe.
* **Solução Proposta**:
  * O frontend deve manter o usuário numa tela de transição (*Spinning Up Loader*) escutando o status via SSE ou polling.
  * O redirecionamento para o iframe do VS Code só deve ocorrer quando a resposta da API retornar explicitamente `{ status: 'READY', url: '...' }` acompanhado de HTTP 200 na checagem do proxy.

### 🐛 1.3 Auditoria de Commits Automáticos no Git / GitHub
* **Problema Atual**: Foram identificados múltiplos arquivos temporários ou desnecessários sendo commitados e enviados para o repositório Git.
* **Solução Proposta**:
  * Definir e aplicar um arquivo `.gitignore` padrão estrito no diretório do projeto TeX para ignorar arquivos temporários do LaTeX (`*.aux`, `*.log`, `*.out`, `*.toc`, `*.synctex.gz`, `*.fls`, `*.fdb_latexmk`).
  * Auditar as chamadas automáticas de commit no `GitService` para que commits ocorram estritamente em momentos intencionais (salvar progresso ou enviar para revisão).

---

## 📌 2. Novas Funcionalidades e Rastreamento no Banco de Dados

### 💡 2.1 Monitoramento de PVC e Alterações Pendentes na Tabela de Workspaces
* **Objetivo**: Dar visibilidade à equipe e ao sistema sobre a saúde do workspace e arquivos não salvos.
* **Implementação**:
  * Expandir o modelo/retorno da API de Workspace com os campos:
    * `pvcStatus`: Indica se o volume persistente do K8s está ativo, vinculado ou pronto para limpeza.
    * `hasUncommittedChanges`: O backend consulta `git status --porcelain` no repositório do projeto/usuário para identificar se há rascunhos pendentes de salvamento.

---

## 📌 3. Melhorias no Fluxo de Trabalho do Autor

### 🚀 3.1 Botão "Salvar Progresso" Reativo
* **Regra de Negócio**: O botão *Salvar Progresso* no topo da interface deve ficar ativo apenas quando houver modificações pendentes no Git (`hasUncommittedChanges === true`).
* **Ação**: Ao ser clicado, realiza a operação de commit com mensagem automática associada à Task (ex: `wip(task): salvamento de progresso pelo autor`) e desabilita o botão até a próxima alteração.

### 🚀 3.2 Validação Prévia ao "Enviar para Revisão"
* **Regra de Negócio**: Quando o aluno clica em **`[ Enviar para Revisão ]`**:
  * **Se houver arquivos não commitados**: Exibir um alerta modal informativo:  
    > ⚠️ *Você possui alterações não salvas no seu rascunho. Por favor, clique em "Salvar Progresso" antes de submeter para revisão.*
  * **Se todos os arquivos estiverem commitados**: Exibir modal de confirmação, alterar o status da Task no banco de dados para `UNDER_REVIEW`, criar o Pull Request/Branch de revisão e notificar o revisor com mensagem de sucesso.

### 🚀 3.3 Sinalização Visual de Tarefa "Em Revisão"
* **UX**: Quando a tarefa muda para `UNDER_REVIEW`, o dashboard exibe um badge visual em destaque (*Em Revisão*) e bloqueia edições diretas pelo autor até que o parecer do revisor seja emitido.

---

## 📌 4. Isolamento do Revisor & Resolução de Conflitos (Alinhado com ADR-003)

### 🔍 4.1 Pod Isolado para o Revisor
* **Problema Identificado**: O revisor abrindo o projeto no mesmo ambiente estava alterando diretamente o workspace em uso pelo autor.
* **Solução (ADR-003)**:
  * Quando um **Revisor** clica em `[Revisar Tarefa]`, o backend provisiona um Pod isolado e exclusivo apontando para a branch da tarefa (`task/*` ou `review/*`).
  * As alterações ou notas feitas pelo revisor são mantidas em ambiente de cópia/branch separada, garantindo a integridade do rascunho do autor.

### 🔄 4.2 Troca de Branches e Resolução de Conflitos
* **Conforme definido na [ADR-003](file:///home/gilson-russo/development/professional/sci-latex-vscode/docs/planning/backend/adr-003-user-git-workspace-flow.md)**:
  * A troca de branches é **completamente transparente**: o usuário escolhe a *Task* e o sistema chaveia a branch Git por baixo.
  * Caso a branch principal (`dev`) avance e haja conflitos de mesclagem na Task do aluno, a Task é marcada como `BEHIND`/`CONFLICTED`. Ao clicar em `[Atualizar com a dev]`, a interface do editor VS Code guia o aluno na resolução visual dos conflitos no arquivo `.tex`.