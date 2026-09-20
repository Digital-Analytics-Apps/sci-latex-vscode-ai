# Especificação Técnica do Módulo `editor-proxy`

## 🎯 Objetivo do Módulo

O módulo `editor-proxy` é responsável por gerenciar o ciclo de vida da sessão de edição LaTeX no VS Code Web (`code-server`) executado em containers isolados no Kubernetes. Ele atua como ponto de entrada e ponte entre o frontend Web, o sistema de arquivos TeX/Git no servidor e a infraestrutura de orquestração Kubernetes.

---

## 🏗️ Arquitetura e Camadas

```
+-----------------------------------------------------------+
|               HTTP Request (Fastify Route)                |
|           GET /api/v1/editor-proxy/:projectId             |
+-----------------------------------------------------------+
                             |
                             v
+-----------------------------------------------------------+
|                  EditorProxyController                    |
|  - Validação de entrada (params, query, userId)           |
|  - Delegação para EditorProxyService                      |
|  - Redirecionamento HTTP 302 ou HTML Fallback Auto-reload  |
+-----------------------------------------------------------+
                             |
                             v
+-----------------------------------------------------------+
|                   EditorProxyService                      |
|  - Sincronização de repositório Git (base e user)         |
|  - Semeadura de templates TeX (main.tex, sections, IEEE) |
|  - Reivindicação de Pods no Kubernetes (K8sPodManager)    |
|  - Verification/Healthcheck no code-server (ping)         |
|  - Atualização de status da Workspace (READY/PROVISIONING)|
+-----------------------------------------------------------+
            /                |                \
           /                 v                 \
          v        +-------------------+        v
+------------------+ | Repositórios DB | +-------------------+
| System Filesystem| | - Projects      | | K8sPodManagerServ.|
| - projects/      | | - Tasks         | | - Pod Claiming    |
| - projects/users/| | - Workspaces    | | - NodePort / URL  |
+------------------+ +-------------------+ +-------------------+
```

---

## 📋 Responsabilidades Detalhadas

### 1. Resolução da Branch de Trabalho (`targetBranch`)
- Quando a requisição informa `branchName`, ela é selecionada diretamente.
- Quando a requisição informa `taskId`, o serviço consulta o banco de dados e obtém a `task.branchName`.
- Se nenhuma branch for informada, o padrão fallback é `dev`.

### 2. Sincronização de Repositório Git por Usuário
- O repositório base reside em `STORAGE_PATH/projects/:projectId`.
- O workspace do usuário reside isoladamente em `STORAGE_PATH/projects/:projectId/users/:userId`.
- O serviço garante:
  - Inicialização/clonagem do repositório Git local e busca de referências remotas (`git fetch --all`).
  - Checkout e sincronização da `targetBranch` no workspace do usuário.
  - Sincronização de arquivos TeX ignorando artefatos de compilação TeX (`*.aux`, `*.log`, `*.pdf`, `*.fdb_latexmk`, `*.synctex.gz`, etc.) e a pasta `.git`/`users/`.
  - Garantia de commit Git válido inicial na árvore do usuário para evitar marcação desnecessária de untracked (`"U"`).

### 3. Semeadura de Arquivos TeX Base (`ensureTeXTemplateFiles`)
Garante a presença da estrutura inicial de artigo acadêmico caso os arquivos ainda não existam:
- Pasta `sections/` contendo:
  - `01-introduction.tex`
  - `02-methodology.tex`
  - `03-results.tex`
  - `04-conclusion.tex`
- `main.tex` formatado com o título do projeto e inclusão das seções acima.
- `IEEEtran.cls` copiado da pasta de templates docker.
- `.gitignore` configurado para ignorar artefatos efêmeros da compilação TeX Live.

### 4. Provisionamento & Health Check no Kubernetes
- Invoca `K8sPodManagerService.claimPodForProject(projectId, userId)` para obter/reivindicar um Pod Kubernetes com o ambiente `code-server` + TeX Live.
- Executa verificações de disponibilidade (HTTP GET com timeout de 600ms) nas URLs do `code-server` (porta `30080` ou URL de Pod configurada).
- Registra a sessão na tabela `Workspace` do banco de dados com estado:
  - `READY`: Container pronto e respondendo.
  - `PROVISIONING`: Container ainda subindo ou em processo de inicialização.

### 5. Resposta HTTP & Redirecionamento
- Se `isCodeServerUp === true`: Retorna HTTP 302 Redirection para `/api/v1/editor-proxy/app/?folder=/home/coder/project&token=...`.
- Se `isCodeServerUp === false`: Retorna HTTP 503 JSON informando que o Pod da workspace está em fase de inicialização. O frontend controla visualmente a interface de carregamento no card da tarefa ou container de exibição até o ambiente ficar pronto.

---

## 🧪 Estratégia de Testes

- **Testes Unitários**: Testar a lógica de `EditorProxyService` isolando operações de E/S e K8s através de stubs/mocks dos repositórios de projetos, tarefas e workspaces, além do `K8sPodManagerService`.
- **Testes de Integração**: Testar o fluxo completo da rota `GET /api/v1/editor-proxy/:projectId` no Fastify.
