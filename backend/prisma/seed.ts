import {
  PeriodStatus,
  Role
} from '@prisma/client';
import { prisma } from '../src/db/prisma';
import { TemplatesService } from '../src/modules/templates/templates.service';
import { hashPassword } from '../src/utils/hash';

async function main() {
  console.log('🌱 Starting database seed...');

  // 0. Limpeza prévia de todas as tabelas (respeitando integridade referencial)
  console.log('🧹 Clearing existing database records...');
  await prisma.task.deleteMany();
  await prisma.projectStage.deleteMany();
  await prisma.releaseCandidate.deleteMany();
  await prisma.release.deleteMany();
  await prisma.nitProcess.deleteMany();
  await prisma.projectFile.deleteMany();
  await prisma.documentOperation.deleteMany();
  await prisma.documentSnapshot.deleteMany();
  await prisma.projectMember.deleteMany();
  await prisma.project.deleteMany();
  await prisma.latexTemplate.deleteMany();
  await prisma.session.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.academicPeriod.deleteMany();
  await prisma.user.deleteMany();

  const defaultPasswordHash = await hashPassword('123456');

  // 1. Criar Usuários do Sistema
  // Nota: Não existe perfil global "REVISOR". Todos os pesquisadores são membros comuns (AUTHOR).
  // Qualquer membro pode ser convidado para ser o revisor de um artigo específico.
  console.log('👤 Creating users...');
  const usersToCreate = [
    {
      name: 'Coordenador 01',
      email: 'coordenador.01@example.com',
      passwordHash: defaultPasswordHash,
      role: Role.COORDINATOR,
    },
     {
      name: 'Coordenador 02',
      email: 'coordenador.02@example.com',
      passwordHash: defaultPasswordHash,
      role: Role.COORDINATOR,
    },
     {
      name: 'Gerente 01',
      email: 'gerente.01@example.com',
      passwordHash: defaultPasswordHash,
      role: Role.MANAGER,
    },
     {
      name: 'Gerente 02',
      email: 'gerente.02@example.com',
      passwordHash: defaultPasswordHash,
      role: Role.MANAGER,
    },
    {
      name: 'Author 01',
      email: 'author.01@example.com',
      passwordHash: defaultPasswordHash,
      role: Role.AUTHOR,
    },
    {
      name: 'Author 02',
      email: 'author.02@example.com',
      passwordHash: defaultPasswordHash,
      role: Role.AUTHOR,
    },
    {
      name: 'Author 03',
      email: 'author.03@example.com',
      passwordHash: defaultPasswordHash,
      role: Role.AUTHOR,
    },
    {
      name: 'Author 04',
      email: 'author.04@example.com',
      passwordHash: defaultPasswordHash,
      role: Role.AUTHOR,
    },
    {
      name: 'Author 05',
      email: 'author.05@example.com',
      passwordHash: defaultPasswordHash,
      role: Role.AUTHOR,
    },
    {
      name: 'Revisor 01',
      email: 'revisor.01@example.com',
      passwordHash: defaultPasswordHash,
      role: Role.AUTHOR, // Membro comum; atua como revisor no contexto do artigo
    },
    {
      name: 'Revisor 02',
      email: 'revisor.02@example.com',
      passwordHash: defaultPasswordHash,
      role: Role.AUTHOR, // Membro comum; atua como revisor no contexto do artigo
    },
    {
      name: 'System Admin',
      email: 'admin@example.com',
      passwordHash: defaultPasswordHash,
      role: Role.ADMIN,
    }
  ];

  const createdUsers: Record<string, any> = {};
  for (const u of usersToCreate) {
    const created = await prisma.user.create({ data: u });
    createdUsers[u.email] = created;
    console.log(`   - [${u.role}] ${u.name} (${u.email})`);
  }

  // 2. Criar Período Acadêmico Vigente
  console.log('📅 Creating academic period...');
  const academicPeriod = await prisma.academicPeriod.create({
    data: {
      name: '2026/2027',
      startDate: new Date('2026-01-01T00:00:00Z'),
      endDate: new Date('2026-12-31T23:59:59Z'),
      targetArticlesCount: 10,
      status: PeriodStatus.ACTIVE,
      managerId: createdUsers['admin@example.com'].id,
    },
  });
  console.log(`   - Período: ${academicPeriod.name} (Meta Geral: ${academicPeriod.targetArticlesCount} artigos)`);

  // Semear templates oficiais no MinIO e PostgreSQL a partir de latex-templates/
  console.log('📄 Semeando templates LaTeX oficiais no MinIO e PostgreSQL a partir de latex-templates/...');
  const templatesService = new TemplatesService();
  const seeded = await templatesService.seedBaselineTemplates();
  console.log(`   - ${seeded.length} template(s) oficial(is) garantido(s) no MinIO e banco.`);


  console.log('\n=========================================');
  console.log('✅ SEED EXECUTADO COM SUCESSO!');
  console.log('=========================================\n');
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
