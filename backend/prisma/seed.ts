import { Role } from '@prisma/client';
import { prisma } from '../src/db/prisma';
import { hashPassword } from '../src/utils/hash';

async function main() {
  console.log('🌱 Starting database seed...');

  // 0. Limpeza prévia de todas as tabelas (respeitando integridade referencial)
  console.log('🧹 Clearing existing database records...');
  await prisma.releaseCandidate.deleteMany();
  await prisma.release.deleteMany();
  await prisma.workspace.deleteMany();
  await prisma.task.deleteMany();
  await prisma.reviewComment.deleteMany();
  await prisma.pullRequest.deleteMany();
  await prisma.projectMember.deleteMany();
  await prisma.projectStage.deleteMany();
  await prisma.project.deleteMany();
  await prisma.teamAcademicGoal.deleteMany();
  await prisma.teamMember.deleteMany();
  await prisma.team.deleteMany();
  await prisma.session.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.user.deleteMany();
  await prisma.academicPeriod.deleteMany();

  const defaultPasswordHash = await hashPassword('123456');

  // 1. Criar Único Usuário Admin
  const admin = await prisma.user.create({
    data: {
      name: 'System Admin',
      email: 'admin@google.com',
      passwordHash: defaultPasswordHash,
      role: Role.ADMIN,
    },
  });

  console.log('✅ Base de dados limpa com sucesso!');
  console.log('✅ Usuário Administrador único criado:');
  console.log(`   - E-mail: ${admin.email}`);
  console.log('   - Senha: 123456');
  console.log('   - Perfil: ADMIN');

  console.log('🌱 Seed concluído com sucesso!');
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
