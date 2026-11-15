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
      name: 'Gilson Russo',
      email: 'gilson.russo@example.com',
      passwordHash: defaultPasswordHash,
      role: Role.ADMIN,
    },
    {
      name: 'Roce Russo',
      email: 'roce.russo@example.com',
      passwordHash: defaultPasswordHash,
      role: Role.COORDINATOR,
    },
    {
      name: 'Bianca Russo',
      email: 'bianca.russo@example.com',
      passwordHash: defaultPasswordHash,
      role: Role.AUTHOR,
    },
    {
      name: 'Elisa Russo',
      email: 'elisa.russo@example.com',
      passwordHash: defaultPasswordHash,
      role: Role.AUTHOR,
    },
    {
      name: 'Carlos Lima',
      email: 'carlos.revisor@example.com',
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
      name: 'Ciclo Acadêmico 2026/2027',
      startDate: new Date('2026-01-01T00:00:00Z'),
      endDate: new Date('2026-12-31T23:59:59Z'),
      targetArticlesCount: 10,
      status: PeriodStatus.ACTIVE,
      managerId: createdUsers['gilson.russo@example.com'].id,
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
  console.log('=========================================');
  console.log('Credenciais de Acesso (Senha padrão: 123456):');
  console.log('   - Gilson Russo (ADMIN / Gestor):      gilson.russo@example.com');
  console.log('   - Roce Russo (COORDENADOR):           roce.russo@example.com');
  console.log('   - Bianca Russo (AUTOR):               bianca.russo@example.com');
  console.log('   - Elisa Russo (AUTOR):                elisa.russo@example.com');
  console.log('   - Carlos Lima (Membro / Revisor):     carlos.revisor@example.com');
  console.log('   - System Admin (ADMIN):               admin@google.com');
  console.log('   - Pesquisador Padrão (AUTOR):         user@google.com');
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
