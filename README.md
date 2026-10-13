# SCI-LaTeX Platform 🚀

Repositório monorepo da plataforma de escrita científica **SCI-LaTeX**. Este repositório contém o backend (API Fastify), o frontend (Vite/React) e as configurações de infraestrutura.

---

## 📁 Estrutura do Projeto

```
sci-latex-vscode/
├── backend/          # API REST (Node.js, Fastify, Prisma, TypeScript)
├── frontend/         # Interface Web (React, Vite, Material UI, TypeScript)
├── docker/           # Arquivos e configurações Docker
├── docs/             # Documentação técnica e especificações
├── scripts/          # Scripts utilitários de infraestrutura
└── package.json      # Configuração de npm Workspaces da raiz
```

---

## ⚡ npm Workspaces & Automação de Comandos

O projeto está configurado utilizando **npm Workspaces**. Isso permite instalar dependências e executar comandos no `backend` e `frontend` simultaneamente a partir da raiz, sem a necessidade de navegar entre pastas.

### 🛠️ Instalação das Dependências

Para instalar as dependências de todos os pacotes de uma só vez:

```bash
npm install
```

---

## 📜 Comandos Disponíveis na Raiz

### 🧹 Lint & Formatação de Código

Roda o linter e o formatador de código em todo o monorepo (`backend` + `frontend`):

| Comando | Descrição |
| :--- | :--- |
| `npm run lint` | Executa o ESLint no backend e no frontend |
| `npm run lint:fix` | Tenta corrigir os erros de lint automaticamente em ambos |
| `npm run format` | Executa o Prettier para formatar o código em ambos os projetos |
| `npm run format:check` | Verifica a formatação do código em ambos os projetos |

### 🚀 Desenvolvimento

| Comando | Descrição |
| :--- | :--- |
| `npm run dev:backend` | Inicia o servidor de desenvolvimento do backend (Porta 3333) |
| `npm run dev:frontend` | Inicia a aplicação web frontend em ambiente de desenvolvimento (Porta 5173) |

### 🔨 Build & Testes

| Comando | Descrição |
| :--- | :--- |
| `npm run build` | Compila os projetos de backend e frontend |
| `npm run test` | Executa os testes unitários e de integração de ambos os projetos |

---

## 📖 Documentações Específicas

Para mais detalhes sobre cada módulo:
- [Documentação do Backend](file:///home/gilson-russo/development/professional/sci-latex-vscode/backend/README.md)
- [Documentação do Frontend](file:///home/gilson-russo/development/professional/sci-latex-vscode/frontend/README.md)
