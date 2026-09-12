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

  // 1. Criar Usuário Admin (1)
  const admin = await prisma.user.create({
    data: {
      name: 'System Admin',
      email: 'admin@google.com',
      passwordHash: defaultPasswordHash,
      role: Role.ADMIN,
    },
  });

  // 2. Criar Coordenadores (3)
  const coordinator1 = await prisma.user.create({
    data: {
      name: 'Prof. Coordenador Principal',
      email: 'coordinator@google.com',
      passwordHash: defaultPasswordHash,
      role: Role.COORDINATOR,
    },
  });

  const coordinator2 = await prisma.user.create({
    data: {
      name: 'Prof. Fernando Souza',
      email: 'coordinator2@google.com',
      passwordHash: defaultPasswordHash,
      role: Role.COORDINATOR,
    },
  });

  const coordinator3 = await prisma.user.create({
    data: {
      name: 'Profa. Juliana Martins',
      email: 'coordinator3@google.com',
      passwordHash: defaultPasswordHash,
      role: Role.COORDINATOR,
    },
  });

  // 3. Criar Gerentes (3)
  const manager1 = await prisma.user.create({
    data: {
      name: 'Gerente Acadêmico Principal',
      email: 'manager@google.com',
      passwordHash: defaultPasswordHash,
      role: Role.MANAGER,
    },
  });

  const manager2 = await prisma.user.create({
    data: {
      name: 'Rodrigo Barbosa (Gerente de Pesquisa)',
      email: 'manager2@google.com',
      passwordHash: defaultPasswordHash,
      role: Role.MANAGER,
    },
  });

  const manager3 = await prisma.user.create({
    data: {
      name: 'Camila Oliveira (Gerente de Projetos)',
      email: 'manager3@google.com',
      passwordHash: defaultPasswordHash,
      role: Role.MANAGER,
    },
  });

  // 4. Criar Revisores Técnicos (3)
  const reviewer1 = await prisma.user.create({
    data: {
      name: 'Dr. Carlos Lima (Revisor Técnico)',
      email: 'reviewer@google.com',
      passwordHash: defaultPasswordHash,
      role: Role.REVIEWER,
    },
  });

  const reviewer2 = await prisma.user.create({
    data: {
      name: 'Dra. Patricia Rocha (Revisora NIT)',
      email: 'reviewer2@google.com',
      passwordHash: defaultPasswordHash,
      role: Role.REVIEWER,
    },
  });

  const reviewer3 = await prisma.user.create({
    data: {
      name: 'Dr. Marcelo Mendes (Revisor Sênior)',
      email: 'reviewer3@google.com',
      passwordHash: defaultPasswordHash,
      role: Role.REVIEWER,
    },
  });

  // 5. Criar Autores (10)
  const authorsData = [
    { name: 'João Silva (Autor Principal)', email: 'author@google.com' },
    { name: 'Maria Souza (Co-Autora)', email: 'maria@universidade.edu.br' },
    { name: 'Ana Costa (Co-Autora)', email: 'ana@universidade.edu.br' },
    { name: 'Lucas Ferreira (Autor)', email: 'lucas@universidade.edu.br' },
    { name: 'Beatriz Santos (Autora)', email: 'beatriz@universidade.edu.br' },
    { name: 'Gabriel Almeida (Autor)', email: 'gabriel@universidade.edu.br' },
    { name: 'Larissa Pereira (Autora)', email: 'larissa@universidade.edu.br' },
    { name: 'Thiago Rodrigues (Autor)', email: 'thiago@universidade.edu.br' },
    { name: 'Isabela Carvalho (Autora)', email: 'isabela@universidade.edu.br' },
    { name: 'Rafael Gomes (Autor)', email: 'rafael@universidade.edu.br' },
  ];

  const authors = [];
  for (const item of authorsData) {
    const created = await prisma.user.create({
      data: {
        name: item.name,
        email: item.email,
        passwordHash: defaultPasswordHash,
        role: Role.AUTHOR,
      },
    });
    authors.push(created);
  }

  console.log('✅ Users seeded successfully (Senha padrão: 123456):');
  console.log(`   - 1 Admin: ${admin.email}`);
  console.log(
    `   - 3 Coordinators: ${coordinator1.email}, ${coordinator2.email}, ${coordinator3.email}`
  );
  console.log(`   - 3 Managers: ${manager1.email}, ${manager2.email}, ${manager3.email}`);
  console.log(`   - 3 Reviewers: ${reviewer1.email}, ${reviewer2.email}, ${reviewer3.email}`);
  console.log(`   - 10 Authors: ${authors.map((a) => a.email).join(', ')}`);

  // 6. Criar Período Acadêmico Padrão
  const academicPeriod = await prisma.academicPeriod.create({
    data: {
      name: 'Ciclo Acadêmico 2026/2027',
      startDate: new Date('2026-01-01'),
      endDate: new Date('2026-12-31'),
    },
  });

  console.log(`✅ Academic Period created: ${academicPeriod.name}`);

  // 7. Criar Equipe Padrão
  const team1 = await prisma.team.create({
    data: {
      name: 'Laboratório de Redes e Sistemas Distribuídos (LSD)',
      description: 'Grupo de pesquisa em computação de alto desempenho e escrita científica.',
      coordinatorId: coordinator1.id,
      managerId: manager1.id,
      members: {
        create: [
          ...authors.map((a) => ({ userId: a.id, role: Role.AUTHOR })),
          { userId: reviewer1.id, role: Role.REVIEWER },
          { userId: reviewer2.id, role: Role.REVIEWER },
          { userId: reviewer3.id, role: Role.REVIEWER },
        ],
      },
    },
  });

  console.log(`✅ Team created: ${team1.name}`);
  console.log(`   - Coordenador: ${coordinator1.name}`);
  console.log(`   - Gerente: ${manager1.name}`);
  console.log(`   - Membros da Equipe: ${authors.length} Autores, 3 Revisores`);

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
