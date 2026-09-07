import { Role } from '@prisma/client';
import { prisma } from '../src/db/prisma';
import { hashPassword } from '../src/utils/hash';

async function main() {
  console.log('🌱 Starting database seed...');

  // Limpeza prévia para evitar duplicatas em reinicializações
  await prisma.reviewComment.deleteMany();
  await prisma.pullRequest.deleteMany();
  await prisma.section.deleteMany();
  await prisma.projectMember.deleteMany();
  await prisma.project.deleteMany();
  await prisma.teamMember.deleteMany();
  await prisma.team.deleteMany();
  await prisma.session.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.user.deleteMany();
  await prisma.academicPeriod.deleteMany();

  const defaultPasswordHash = await hashPassword('123456');

  // 1. Criar Usuários Padrão
  const admin = await prisma.user.create({
    data: {
      name: 'System Admin',
      email: 'admin@google.com',
      passwordHash: defaultPasswordHash,
      role: Role.ADMIN,
    },
  });

  const coordinator = await prisma.user.create({
    data: {
      name: 'Prof. Coordenador',
      email: 'coordinator@google.com',
      passwordHash: defaultPasswordHash,
      role: Role.COORDINATOR,
    },
  });

  const manager = await prisma.user.create({
    data: {
      name: 'Gerente Acadêmico',
      email: 'manager@google.com',
      passwordHash: defaultPasswordHash,
      role: Role.MANAGER,
    },
  });

  const author = await prisma.user.create({
    data: {
      name: 'Autor Pesquisador',
      email: 'author@google.com',
      passwordHash: defaultPasswordHash,
      role: Role.AUTHOR,
    },
  });

  const reviewer = await prisma.user.create({
    data: {
      name: 'Revisor Técnico',
      email: 'reviewer@google.com',
      passwordHash: defaultPasswordHash,
      role: Role.REVIEWER,
    },
  });

  console.log('✅ Users seeded successfully (Senha padrão: 123456):');
  console.log(`   - Admin: ${admin.email}`);
  console.log(`   - Coordinator: ${coordinator.email}`);
  console.log(`   - Manager: ${manager.email}`);
  console.log(`   - Author: ${author.email}`);
  console.log(`   - Reviewer: ${reviewer.email}`);

  // 2. Criar Período Acadêmico Padrão
  const academicPeriod = await prisma.academicPeriod.create({
    data: {
      name: 'Ciclo Acadêmico 2026/2027',
      startDate: new Date('2026-01-01'),
      endDate: new Date('2026-12-31'),
    },
  });

  console.log(`✅ Academic Period created: ${academicPeriod.name}`);

  // 3. Criar Equipe Padrão
  const team = await prisma.team.create({
    data: {
      name: 'Laboratório de Redes e Sistemas Distribuídos (LSD)',
      description: 'Grupo de pesquisa em computação de alto desempenho e escrita científica.',
      coordinatorId: coordinator.id,
      managerId: manager.id,
      members: {
        create: [
          { userId: author.id, role: Role.AUTHOR },
          { userId: reviewer.id, role: Role.REVIEWER },
        ],
      },
    },
  });

  console.log(`✅ Team created: ${team.name}`);
  console.log(`   - Coordenador: ${coordinator.name}`);
  console.log(`   - Gerente: ${manager.name}`);
  console.log(`   - Membros da Equipe: ${author.name}, ${reviewer.name}`);
  console.log('🌱 Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
