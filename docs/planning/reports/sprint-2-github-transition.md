# Documentação de Transição Arquitetural: Integração Direta com GitHub

**Data:** 2026-09-06  
**Módulo:** `src/modules/git` e `src/modules/projects`  

---

## 1. Contexto & Decisão de Arquitetura

Originalmente, o provisionamento de repositórios Git utilizava repositórios `.git` bare locais mantidos no volume de armazenamento do servidor (`./storage/git/<project_id>.git`).

Para garantir que os artigos científicos fiquem persistidos na nuvem dentro da estrutura do **GitHub** (Abordagem 1: GitHub 100% Direto), o `GitService` foi refatorado para interagir diretamente com a **API REST do GitHub**.

---

## 2. Detalhes da Implementação

### 2.1 Configuração de Variáveis de Ambiente
- `GITHUB_TOKEN`: Token de Acesso Pessoal (PAT) ou GitHub App com privilégios de criação e push de repositórios.
- `GITHUB_ORG`: Nome da Organização no GitHub (opcional; se omitido, o repositório é criado na conta do usuário autenticado).
- `GITHUB_REPO_PREFIX`: Prefixo para os repositórios (padrão `sci-paper-`).

### 2.2 Fluxo de Funcionamento no `GitService`
1. **Criar Repositório (`initBareRepository` / GitHub Remote):**
   - Em ambiente de produção/desenvolvimento (quando `GITHUB_TOKEN` é informado), efetua uma requisição `POST https://api.github.com/user/repos` (ou `/orgs/{org}/repos`).
   - Inicializa um diretório temporário no servidor (`/tmp/`), cria a estrutura base do `main.tex`, realiza o commit inicial e executa `git push` diretamente para `https://x-access-token:${GITHUB_TOKEN}@github.com/{owner}/{repoName}.git`.
   - Limpa a pasta temporária do servidor.
   - Retorna a URL oficial do GitHub (ex: `https://github.com/org/sci-paper-<project_id>`).

2. **Modo Fallback / Testes:**
   - Em ambiente de testes (`NODE_ENV === 'test'`) ou caso `GITHUB_TOKEN` não seja informado, o sistema utiliza o repositório Bare local no diretório `./storage/git/`. Isso permite rodar a suíte de testes `npm test` offline de forma determinística e ultrarrápida.

3. **Operações de Commit (`commitFile`):**
   - Efetua o `git clone --branch <branchName>` apontando para o repositório no GitHub usando autenticação por token.
   - Escreve as alterações no arquivo da seção, assina o commit com o nome e e-mail do autor e faz o `git push origin <branchName>` para o GitHub.

---

## 3. Resultado dos Testes

- **Status:** 15 testes passando em 5 arquivos (`vitest run`).
- **Pacotes Instalados:** Adicionado `git` à imagem Docker Alpine do backend (`backend/Dockerfile`).
