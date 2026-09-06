# Walkthrough - Conclusão da Sprint 1 (Infraestrutura Docker & Banco de Dados)

A Sprint 1 do backend foi concluída com sucesso. Toda a infraestrutura de banco de dados PostgreSQL e o ambiente de desenvolvimento em container Docker com **bind mount** foram configurados e validados.

---

## 💡 Mudanças Realizadas

### Infraestrutura Docker
- **[docker-compose.yml](file:///home/gilson-russo/development/professional/sci-latex-vscode/docker-compose.yml)**:
  - Serviço `postgres`: imagem `postgres:16-alpine`, banco `sci_latex_db`, healthcheck ativo na porta `5432` e volume persistente.
  - Serviço `backend`: construído com base em `backend/Dockerfile`, mapeado na porta `3333`, com **bind mount** (`./backend:/app`) garantindo live-reload do código via `tsx watch`.
- **[Dockerfile](file:///home/gilson-russo/development/professional/sci-latex-vscode/backend/Dockerfile)** & **[.dockerignore](file:///home/gilson-russo/development/professional/sci-latex-vscode/backend/.dockerignore)**:
  - Node 20 Alpine com instalação de `openssl` e `libc6-compat` para compatibilidade com o Prisma ORM.

### Banco de Dados & Prisma
- **[schema.prisma](file:///home/gilson-russo/development/professional/sci-latex-vscode/backend/prisma/schema.prisma)**:
  - Adicionados `binaryTargets = ["native", "linux-musl", "linux-musl-openssl-3.0.x"]`.
- **Migrations**:
  - Migration inicial criada e aplicada com sucesso: `20260906032353_init`.
- **[seed.ts](file:///home/gilson-russo/development/professional/sci-latex-vscode/backend/prisma/seed.ts)**:
  - Script de seed para popular dados iniciais:
    - 👤 Admin: `admin@sci-latex.org` (Senha: `Password123!`)
    - 👨‍🏫 Coordenador: `coordinator@sci-latex.org` (Senha: `Password123!`)
    - ✍️ Autor: `author@sci-latex.org` (Senha: `Password123!`)
    - 🔍 Revisor: `reviewer@sci-latex.org` (Senha: `Password123!`)
    - 📅 Ciclo Acadêmico: `Ciclo Acadêmico 2026/2027`
    - 👥 Equipe: `Laboratório de Redes e Sistemas Distribuídos (LSD)`
- **[package.json](file:///home/gilson-russo/development/professional/sci-latex-vscode/backend/package.json)**:
  - Adicionado script `npm run db:seed` e apontamento `"prisma": { "seed": "tsx prisma/seed.ts" }`.

---

## 🧪 Validação e Resultados

1. **Testes Unitários:**
   ```bash
   npm test
   ```
   *Resultado:* **9 testes passando (100% sucesso)**.

2. **Containers Docker:**
   ```bash
   docker ps
   ```
   *Resultado:* `sci_latex_postgres` (Up/Healthy na 5432) e `sci_latex_backend` (Up na 3333).

3. **Verificação de Healthcheck:**
   ```bash
   curl http://localhost:3333/health
   ```
   *Resultado:* `{"status":"ok","service":"sci-latex-backend","timestamp":"2026-09-06T03:30:23.672Z"}`

4. **Validação do Bind Mount (Live Reload):**
   *Alteração de código detectada instantaneamente no container pelo `tsx watch`:*
   `[tsx] change in ./src/server.ts Restarting...`
   `🚀 Server running on http://0.0.0.0:3333 (Docker Live-Reload Active)`
