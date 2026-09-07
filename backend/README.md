# SCI-LaTeX Backend API 🚀

API Backend de alta performance construída com **Node.js**, **Fastify**, **Prisma ORM**, **PostgreSQL** e **TypeScript** para a plataforma web de escrita científica `sci-latex-vscode`.

---

## 📌 Pré-requisitos

Certifique-se de ter os seguintes componentes instalados no seu ambiente:

- **Node.js**: v20 ou superior
- **npm**: v10 ou superior
- **PostgreSQL**: v15 ou superior (ou via Docker Compose)
- **Git**

---

## 🛠️ Instalação & Configuração

1. **Instalar as dependências do projeto:**
   ```bash
   npm install
   ```

2. **Configurar as Variáveis de Ambiente:**
   Crie ou edite o arquivo `.env` na raiz do diretório `backend`:
   ```env
   NODE_ENV=development
   PORT=3333
   DATABASE_URL="postgresql://scilatex:scilatex123@localhost:5432/scilatex_db?schema=public"
   JWT_SECRET="sci-latex-super-secret-jwt-key"
   STORAGE_PATH="/home/user/development/professional/sci-latex-vscode/storage"
   GITHUB_TOKEN="ghp_seu_token_aqui"
   GITHUB_ORG="Digital-Analytics-Apps"
   GITHUB_REPO_PREFIX="sci-latex-"
   ```

---

## 🗄️ Banco de Dados & População (Seed)

### 1. Gerar o Prisma Client
```bash
npm run db:generate
```

### 2. Executar as Migrações do Banco
```bash
npm run db:migrate
```

### 3. Popular o Banco com Dados Iniciais (Seed) 🌱
Para preencher o banco de dados com usuários de teste (todas as personas do sistema), ciclos acadêmicos e equipes, execute:

```bash
npm run db:seed
```
*ou diretamente via tsx:*
```bash
npx tsx prisma/seed.ts
```

#### 🔑 Credenciais Padrão Geradas pelo Seed

Todas as contas de teste são criadas com a senha padrão: **`123456`**

| Persona | E-mail | Senha | Função / Função no Sistema |
| :--- | :--- | :--- | :--- |
| **Administrador** | `admin@google.com` | `123456` | Administrador Global (`ADMIN`) |
| **Coordenador** | `coordinator@google.com` | `123456` | Coordenador da Equipe LSD (`COORDINATOR`) |
| **Gerente** | `manager@google.com` | `123456` | Gerente de Projetos (`MANAGER`) |
| **Autor** | `author@google.com` | `123456` | Autor Pesquisador (`AUTHOR`) |
| **Revisor** | `reviewer@google.com` | `123456` | Revisor Técnico (`REVIEWER`) |

#### 🏢 Estrutura Inicial Criada
- **Ciclo Acadêmico:** `Ciclo Acadêmico 2026/2027`
- **Equipe:** `Laboratório de Redes e Sistemas Distribuídos (LSD)` (Coordenador: *Prof. Coordenador*, Gerente: *Gerente Acadêmico*).

---

## 💻 Comandos Principais

| Comando | Descrição |
| :--- | :--- |
| `npm run dev` | Inicia o servidor backend em modo de desenvolvimento com auto-reload (watch) |
| `npm run build` | Compila o código TypeScript para JavaScript na pasta `dist/` |
| `npm start` | Executa a versão compilada em produção (`node dist/server.js`) |
| `npm test` | Executa a suíte completa de testes unitários e de integração via Vitest |
| `npm run db:migrate` | Aplica as migrações do Prisma no banco PostgreSQL |
| `npm run db:seed` | Popula o banco com os dados e contas de teste padrão |
| `npm run db:studio` | Abre a interface visual do Prisma Studio no navegador (`http://localhost:5555`) |
| `npm run lint` | Executa a verificação estática de código com ESLint |
| `npm run format` | Formata todo o código-fonte seguindo as regras do Prettier |

---

## 🏗️ Arquitetura de Módulos (`src/modules`)

- `auth/`: Autenticação via JWT e Refresh Token em Cookie `httpOnly`.
- `projects/`: Gerenciamento de artigos/papers, congressos (Target/Backup) e submissões.
- `sections/`: Gestão de seções do artigo, vinculação de branches Git e prazos.
- `pull-requests/`: Fluxo de abertura de PR, revisões técnicas, parecer do NIT e trava de segurança para merge.
- `git/`: Integração com GitHub (via SDK Octokit) e gerenciador de repositórios/branches locais com `http.extraHeader`.
- `teams/`: Gestão de equipes, gerentes, coordenadores e participantes de artigos.
- `academic-periods/`: Períodos acadêmicos e ciclos de entregas.
- `compiler/`: Orquestrador de compilação TeX Live oficial em containers descartáveis Docker.
- `events/`: Notificações em tempo real transmitidas via Server-Sent Events (SSE).
