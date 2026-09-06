-- =====================================================================
-- Consultas SQL de Exemplo para SCI-LaTeX Backend (PostgreSQL + Prisma)
-- Nota: O Prisma cria tabelas e colunas em PascalCase/camelCase, por isso
-- no PostgreSQL é necessário utilizar aspas duplas: "User", "Team", etc.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Consultas Básicas (SELECT *)
-- ---------------------------------------------------------------------

-- Listar todos os Usuários cadastrados no sistema
SELECT * FROM "User";

-- Listar todos os Ciclos / Períodos Acadêmicos
SELECT * FROM "AcademicPeriod";

-- Listar todas as Equipes de Pesquisa
SELECT * FROM "Team";

-- Listar os Membros vinculados a cada Equipe
SELECT * FROM "TeamMember";

-- Listar todos os Projetos / Artigos Científicos
SELECT * FROM "Project";

-- Listar as Sessões ativas (Refresh Tokens)
SELECT * FROM "Session";

-- Listar o Histórico de Auditoria do sistema
SELECT * FROM "AuditLog";


-- ---------------------------------------------------------------------
-- 2. Consultas Filtradas por Condição
-- ---------------------------------------------------------------------

-- Buscar apenas Usuários com papel de COORDENADOR ou REVISOR
SELECT id, name, email, role 
FROM "User" 
WHERE role IN ('COORDINATOR', 'REVIEWER');

-- Buscar o Período Acadêmico vigente (2026/2027)
SELECT id, name, "startDate", "endDate"
FROM "AcademicPeriod"
WHERE "startDate" <= NOW() AND "endDate" >= NOW();


-- ---------------------------------------------------------------------
-- 3. Consultas Avançadas com Relacionamentos (JOINs)
-- ---------------------------------------------------------------------

-- Listar Equipes com os dados completos do seu Coordenador
SELECT 
    t.id AS team_id,
    t.name AS team_name,
    t.description,
    u.name AS coordinator_name,
    u.email AS coordinator_email,
    u.role AS coordinator_role
FROM "Team" t
JOIN "User" u ON t."coordinatorId" = u.id;

-- Listar Membros de cada Equipe com seus respectivos papéis na equipe
SELECT 
    t.name AS team_name,
    u.name AS member_name,
    u.email AS member_email,
    tm.role AS member_role
FROM "TeamMember" tm
JOIN "Team" t ON tm."teamId" = t.id
JOIN "User" u ON tm."userId" = u.id
ORDER BY t.name, tm.role;

-- Estatísticas: Contagem de Usuários agrupados por Função (Role)
SELECT role, COUNT(*) AS total_users
FROM "User"
GROUP BY role
ORDER BY total_users DESC;


-- ---------------------------------------------------------------------
-- 4. Como Executar via Terminal / Docker Compose:
-- 
-- docker exec -it sci_latex_postgres psql -U postgres -d sci_latex_db -f /path/to/file.sql
-- ou direto no psql:
-- docker exec -it sci_latex_postgres psql -U postgres -d sci_latex_db -c 'SELECT * FROM "User";'
-- ---------------------------------------------------------------------
