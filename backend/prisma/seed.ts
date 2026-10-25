import {
  PeriodStatus,
  Role,
  StageStatus,
  SubmissionStatus,
  TaskStatus,
} from '@prisma/client';
import { prisma } from '../src/db/prisma';
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
      email: 'admin@google.com',
      passwordHash: defaultPasswordHash,
      role: Role.ADMIN,
    },
    {
      name: 'Pesquisador Padrão',
      email: 'user@google.com',
      passwordHash: defaultPasswordHash,
      role: Role.AUTHOR,
    },
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

  // 3. Criar Artigo Científico Inicial com Gerente e Coordenador diretos
  console.log('📄 Creating initial scientific article/project...');
  const project = await prisma.project.create({
    data: {
      name: 'Distributed LaTeX Compilation and Real-time Collaborative Editing in Kubernetes',
      description:
        'Artigo científico apresentando modelo elástico para compilação distribuída de artigos LaTeX com resolução em tempo real de conflitos.',
      academicPeriodId: academicPeriod.id,
      coordinatorId: createdUsers['roce.russo@example.com'].id,
      managerId: createdUsers['gilson.russo@example.com'].id,
      submissionStatus: SubmissionStatus.IN_PROGRESS,
      currentVersion: 1,
      targetConferenceName: 'IEEE Symposium on Security and Privacy (S&P 2027)',
      targetConferenceDate: new Date('2027-05-20T00:00:00Z'),
      backupConferenceName: 'ACM Conference on Computer and Communications Security (CCS 2027)',
      backupConferenceDate: new Date('2027-08-15T00:00:00Z'),
    },
  });
  console.log(`   - Artigo: "${project.name}"`);

  // 4. Associar Participantes do Artigo (Autores, Revisor Contextual, Coordenador e Gerente)
  console.log('👥 Adding project participants...');
  await prisma.projectMember.createMany({
    data: [
      { projectId: project.id, userId: createdUsers['bianca.russo@example.com'].id, role: Role.AUTHOR },
      { projectId: project.id, userId: createdUsers['elisa.russo@example.com'].id, role: Role.AUTHOR },
      { projectId: project.id, userId: createdUsers['user@google.com'].id, role: Role.AUTHOR },
      { projectId: project.id, userId: createdUsers['carlos.revisor@example.com'].id, role: Role.REVIEWER },
      { projectId: project.id, userId: createdUsers['roce.russo@example.com'].id, role: Role.COORDINATOR },
      { projectId: project.id, userId: createdUsers['gilson.russo@example.com'].id, role: Role.MANAGER },
    ],
  });
  console.log('   - Participantes vinculados ao artigo.');

  // 4a. Criar Arquivos TeX Iniciais do Artigo no Banco de Dados (Overleaf-style)
  console.log('📝 Seeding initial TeX project files in database...');
  await prisma.projectFile.createMany({
    data: [
      {
        projectId: project.id,
        path: 'main.tex',
        fileType: 'text',
        mimeType: 'text/x-tex',
        sizeBytes: BigInt(850),
        content: `\\documentclass{article}
\\usepackage[utf8]{inputenc}
\\usepackage{amsmath}
\\usepackage{graphicx}

\\title{Distributed LaTeX Compilation and Real-time Collaborative Editing in Kubernetes}
\\author{Bianca Russo \\and Elisa Russo}
\\date{\\today}
\\begin{document}
\\maketitle

\\begin{abstract}
Este artigo investiga a arquitetura de compilação distribuída de documentos LaTeX sobre contêineres e sincronização operacional de escrita científica em tempo real.
\\end{abstract}

\\input{sections/01-introduction.tex}
\\input{sections/02-methodology.tex}
\\input{sections/03-results.tex}
\\input{sections/04-conclusion.tex}

\\bibliographystyle{IEEEtran}
\\bibliography{references}
\\end{document}`,
      },
      {
        projectId: project.id,
        path: 'sections/01-introduction.tex',
        fileType: 'text',
        mimeType: 'text/x-tex',
        sizeBytes: BigInt(220),
        content: `\\section{Introdução}
A escrita científica moderna exige alta velocidade de iteração e feedback entre revisores e autores. Plataformas tradicionais sofrem com a sobrecarga de ferramentas externas e atrito de compilação local.`,
      },
      {
        projectId: project.id,
        path: 'sections/02-methodology.tex',
        fileType: 'text',
        mimeType: 'text/x-tex',
        sizeBytes: BigInt(180),
        content: `\\section{Metodologia}
Apresentamos a topologia em duas camadas para separação de persistência atômica e buffer volátil, reduzindo o tráfego no banco de dados relacional.`,
      },
      {
        projectId: project.id,
        path: 'sections/03-results.tex',
        fileType: 'text',
        mimeType: 'text/x-tex',
        sizeBytes: BigInt(190),
        content: `\\section{Resultados e Discussão}
Os experimentos indicam redução de 64% na latência de compilação através de pipelines efêmeros em sandbox seguro sem acesso a shell escape.`,
      },
      {
        projectId: project.id,
        path: 'sections/04-conclusion.tex',
        fileType: 'text',
        mimeType: 'text/x-tex',
        sizeBytes: BigInt(150),
        content: `\\section{Conclusão}
A solução descentralizada aproxima a experiência dos autores da velocidade de editores corporativos mantendo total fidelidade aos pacotes TeXLive.`,
      },
      {
        projectId: project.id,
        path: 'references.bib',
        fileType: 'text',
        mimeType: 'text/x-bibtex',
        sizeBytes: BigInt(210),
        content: `@article{russo2026collab,
  author = {Russo, Bianca and Russo, Elisa},
  title = {Real-time TeX Synchronization Architecture},
  journal = {IEEE Transactions on Cloud Computing},
  year = {2026}
}`,
      },
    ],
  });
  console.log('   - Arquivos TeX iniciais semeados com sucesso no banco de dados.');

  // 5. Criar Etapas do Artigo (Stages)
  console.log('📊 Creating project stages...');
  const stage1 = await prisma.projectStage.create({
    data: {
      projectId: project.id,
      title: 'Planejamento e Pesquisa TeX',
      description: 'Estruturação inicial da árvore TeX, bibliografia preliminar e formulação de hipóteses.',
      order: 1,
      status: StageStatus.COMPLETED,
      plannedStartAt: new Date('2026-02-01T00:00:00Z'),
      plannedEndAt: new Date('2026-03-01T00:00:00Z'),
      startedAt: new Date('2026-02-01T00:00:00Z'),
      completedAt: new Date('2026-03-01T00:00:00Z'),
    },
  });

  const stage2 = await prisma.projectStage.create({
    data: {
      projectId: project.id,
      title: 'Desenvolvimento Experimental & Benchmarks',
      description: 'Execução de testes de estresse em clusters K8s e geração automatizada de gráficos pgfplots.',
      order: 2,
      status: StageStatus.IN_PROGRESS,
      plannedStartAt: new Date('2026-03-02T00:00:00Z'),
      plannedEndAt: new Date('2026-05-30T00:00:00Z'),
      startedAt: new Date('2026-03-02T00:00:00Z'),
    },
  });

  const stage3 = await prisma.projectStage.create({
    data: {
      projectId: project.id,
      title: 'Escrita da Metodologia e Resultados',
      description: 'Redação das seções principais no formato IEEEtran e revisão do estado da arte.',
      order: 3,
      status: StageStatus.NOT_STARTED,
      plannedStartAt: new Date('2026-06-01T00:00:00Z'),
      plannedEndAt: new Date('2026-08-30T00:00:00Z'),
    },
  });

  await prisma.projectStage.create({
    data: {
      projectId: project.id,
      title: 'Aprovação NIT (Propriedade Intelectual)',
      description: 'Gatekeeper institucional de validação de patentes e termos de transferência tecnológica.',
      order: 4,
      status: StageStatus.NOT_STARTED,
      isGatekeeper: true,
      gatekeeperType: 'NIT',
    },
  });

  await prisma.projectStage.create({
    data: {
      projectId: project.id,
      title: 'Submissão Final IEEE S&P 2027',
      description: 'Gatekeeper de submissão no sistema oficial da conferência (HotCRP / EasyChair).',
      order: 5,
      status: StageStatus.NOT_STARTED,
      isGatekeeper: true,
      gatekeeperType: 'TARGET_CONFERENCE',
    },
  });
  console.log('   - 5 etapas criadas (incluindo gatekeepers NIT e Conferência Alvo).');

  // 6. Criar Tarefas das Etapas (Sem branches)
  console.log('📝 Creating tasks...');
  const task1 = await prisma.task.create({
    data: {
      projectId: project.id,
      assignedToId: createdUsers['bianca.russo@example.com'].id,
      title: 'Estruturação de pacotes e macros TeX base',
      status: TaskStatus.COMPLETED,
      startDate: new Date('2026-02-05T00:00:00Z'),
      startedAt: new Date('2026-02-05T00:00:00Z'),
      dueDate: new Date('2026-02-28T00:00:00Z'),
    },
  });

  const task2 = await prisma.task.create({
    data: {
      projectId: project.id,
      stageId: stage2.id,
      assignedToId: createdUsers['elisa.russo@example.com'].id,
      title: 'Métricas de latência de compilação distribuída',
      status: TaskStatus.IN_PROGRESS,
      startDate: new Date('2026-03-05T00:00:00Z'),
      startedAt: new Date('2026-03-05T00:00:00Z'),
      dueDate: new Date('2026-04-15T00:00:00Z'),
    },
  });

  await prisma.task.create({
    data: {
      projectId: project.id,
      stageId: stage2.id,
      assignedToId: createdUsers['bianca.russo@example.com'].id,
      title: 'Seção de Discussão e Trabalhos Relacionados',
      status: TaskStatus.NOT_STARTED,
      dueDate: new Date('2026-05-15T00:00:00Z'),
    },
  });
  console.log('   - Tarefas criadas (sem amarração a branches).');


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
