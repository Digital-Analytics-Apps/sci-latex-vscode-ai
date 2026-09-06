# Plano de Implementação - Sprint 2: Provisionamento Git & Módulo de Projetos

Este plano detalha o desenvolvimento da **Sprint 2** da especificação técnica do backend ([specs-backend.md](file:///home/gilson-russo/development/professional/sci-latex-vscode/docs/planning/backend/specs-backend.md)).

---

## 🎯 1. Objetivos da Sprint 2

1. **Infraestrutura RabbitMQ & Storage Git:**
   - Adicionar container `rabbitmq:3-management-alpine` no `docker-compose.yml` (AMQP porta `5672`, Painel Web na `15672`).
   - Mapear volume persistente para os repositórios bare Git (`./storage:/app/storage`).
   - Instalar dependências `amqplib` / `@types/amqplib` e atualizar variáveis de ambiente em `env.ts`.

2. **Serviço de Provisionamento Git (`src/modules/git`):**
   - Criar o serviço que inicializa repositórios Git bare em disco (`git init --bare`) e gera a estrutura inicial do artigo com template LaTeX básico (`main.tex`).

3. **Módulo de Projetos (`src/modules/projects`):**
   - Implementar CRUD completo de projetos (Papers científicos):
     - `POST /api/v1/projects`: Criar projeto, vincular à equipe e ciclo acadêmico, e provisionar repositório Git.
     - `GET /api/v1/projects`: Listar projetos (com suporte a filtros por `teamId` e `academicPeriodId`).
     - `GET /api/v1/projects/:id`: Obter detalhes do projeto, membros, seções e congressos (Target/Backup).
     - `PATCH /api/v1/projects/:id`: Atualizar metadados (nome, descrição, congressos alvo/backup).

4. **Filas Assíncronas RabbitMQ (`git.operations`):**
   - Configurar a conexão AMQP (`src/queue/rabbitmq.ts`) com troca de mensagens (Exchange `sci_latex_events` e Fila `git.operations`).
   - Implementar produtor (`src/queue/producers/git.producer.ts`) para disparar eventos de commit e merge.
   - Implementar worker (`src/queue/workers/git.worker.ts`) para executar commits silenciosos usando a chave de serviço e nome de autor especificado.

---

## 🛠️ 2. Alterações Propostas

### Infraestrutura & Configurações
- **[docker-compose.yml](file:///home/gilson-russo/development/professional/sci-latex-vscode/docker-compose.yml)**: Adicionar serviço `rabbitmq` e volume `./storage:/app/storage`.
- **[package.json](file:///home/gilson-russo/development/professional/sci-latex-vscode/backend/package.json)**: Instalar `amqplib` e `@types/amqplib`.
- **[env.ts](file:///home/gilson-russo/development/professional/sci-latex-vscode/backend/src/config/env.ts)**: Adicionar `RABBITMQ_URL`.

### Módulos do Backend
- `src/modules/git/git.service.ts`: Inicialização de bare repos e commit inicial do template `main.tex`.
- `src/modules/projects/projects.routes.ts`: Rotas de projetos.
- `src/modules/projects/projects.controller.ts`: Controladores de criação, busca e edição de projetos.
- `src/modules/projects/projects.service.ts`: Regras de negócio do módulo de projetos.
- `src/repositories/projects.repository.ts`: Repositório Prisma para o modelo `Project`.
- `src/app.ts`: Registro das rotas `/api/v1/projects`.

### Filas RabbitMQ & Workers
- `src/queue/rabbitmq.ts`: Gerenciador de conexão AMQP.
- `src/queue/producers/git.producer.ts`: Produtor de mensagens Git.
- `src/queue/workers/git.worker.ts`: Worker consumidor de operações de Git.

---

## 🧪 3. Plano de Verificação

### Testes Automatizados
- Criar testes unitários para `projects.service.test.ts` e `git.service.test.ts`.
- Executar a suíte de testes com `npm test`.

### Verificação da API & Fila
1. Subir os novos serviços via `docker compose up -d --build`.
2. Verificar se o painel do RabbitMQ está acessível em `http://localhost:15672` (guest/guest).
3. Enviar uma requisição `POST /api/v1/projects` via Swagger ou `curl` com autenticação JWT.
4. Verificar se a pasta do repositório Git foi criada fisicamente em `./storage/git/<project_id>.git`.
