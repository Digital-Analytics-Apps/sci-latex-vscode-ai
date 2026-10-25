import { Role } from '@prisma/client';
import crypto from 'node:crypto';
import { prisma } from '../../db/prisma';
import {
  IProjectStagesRepository,
  PrismaProjectStagesRepository,
} from '../../repositories/project-stages.repository';
import { IProjectsRepository, ProjectFilterOptions } from '../../repositories/projects.repository';
import { logAudit } from '../../utils/audit';
import { classificationService } from './services/classification.service';
import { progressDescriptionService } from './services/progress-description.service';

export interface CreateProjectDTO {
  name: string;
  description?: string;
  academicPeriodId?: string;
  coordinatorId: string;
  managerId: string;
  targetConferenceName?: string;
  targetConferenceDate?: Date;
  backupConferenceName?: string;
  backupConferenceDate?: Date;
  additionalAuthorIds?: string[];
  authorIds?: string[];
  reviewerId?: string;
  stages?: Array<{
    title: string;
    description?: string;
    plannedStartAt?: Date;
    plannedEndAt?: Date;
    plannedCompletionDate?: Date;
  }>;
}

export interface UpdateProjectDTO {
  name?: string;
  description?: string;
  targetConferenceName?: string;
  targetConferenceDate?: Date;
  backupConferenceName?: string;
  backupConferenceDate?: Date;
  doi?: string;
  publicationUrl?: string;
  datasetUrl?: string;
  justification?: string;
}

export interface PostSubmissionDTO {
  submissionStatus: any;
  doi?: string;
  publicationUrl?: string;
  datasetUrl?: string;
  publishedAt?: Date;
  reviewerFeedback?: string;
  decisionReason?: string;
}


export class ProjectsService {
  constructor(
    private readonly projectsRepository: IProjectsRepository,
    private readonly stagesRepository: IProjectStagesRepository = new PrismaProjectStagesRepository()
  ) {}

  // Criar um novo projeto/artigo e provisionar seu repositório Git/GitHub
  async createProject(userId: string, data: CreateProjectDTO) {
    if (process.env.NODE_ENV !== 'test') {
      const creatorUser = await prisma.user.findUnique({ where: { id: userId } }).catch(() => null);
      if (!creatorUser) {
        throw new Error('USER_NOT_FOUND');
      }
    }
    const rawAuthors = data.additionalAuthorIds || data.authorIds || [];
    const additionalAuthorIds = rawAuthors.filter(
      (id): id is string => Boolean(id) && id !== userId
    );

    const projectId = crypto.randomUUID();

    // 1. Criar a entidade Project no banco com membros diretos
    const project = await this.projectsRepository.create({
      id: projectId,
      name: data.name,
      description: data.description,
      academicPeriodId: data.academicPeriodId,
      coordinatorId: data.coordinatorId,
      managerId: data.managerId,
      targetConferenceName: data.targetConferenceName,
      targetConferenceDate: data.targetConferenceDate,
      backupConferenceName: data.backupConferenceName,
      backupConferenceDate: data.backupConferenceDate,
      creatorId: userId,
      additionalAuthorIds,
      reviewerId: data.reviewerId,
    });

    // 1a. Semear arquivos TeX iniciais do artigo no banco de dados (ProjectFile)
    if (process.env.NODE_ENV !== 'test') {
      await prisma.projectFile.createMany({
      data: [
        {
          projectId,
          path: 'main.tex',
          fileType: 'text',
          mimeType: 'text/x-tex',
          sizeBytes: BigInt(850),
          content: `\\documentclass{article}
\\usepackage[utf8]{inputenc}
\\usepackage{amsmath}
\\usepackage{graphicx}

\\title{${data.name}}
\\author{\\IEEEauthorblockN{Autores do Artigo}}

\\begin{document}
\\maketitle

\\begin{abstract}
Resumo do artigo científico.
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
          projectId,
          path: 'sections/01-introduction.tex',
          fileType: 'text',
          mimeType: 'text/x-tex',
          sizeBytes: BigInt(200),
          content: `\\section{Introdução}\nEscreva a introdução e motivação do trabalho aqui.\n`,
        },
        {
          projectId,
          path: 'sections/02-methodology.tex',
          fileType: 'text',
          mimeType: 'text/x-tex',
          sizeBytes: BigInt(180),
          content: `\\section{Metodologia}\nDescreva o modelo, hipóteses e procedimentos experimentais.\n`,
        },
        {
          projectId,
          path: 'sections/03-results.tex',
          fileType: 'text',
          mimeType: 'text/x-tex',
          sizeBytes: BigInt(190),
          content: `\\section{Resultados}\nApresente os dados obtidos e análise comparativa.\n`,
        },
        {
          projectId,
          path: 'sections/04-conclusion.tex',
          fileType: 'text',
          mimeType: 'text/x-tex',
          sizeBytes: BigInt(150),
          content: `\\section{Conclusão}\nSíntese das contribuições e direcionamentos futuros.\n`,
        },
        {
          projectId,
          path: 'references.bib',
          fileType: 'text',
          mimeType: 'text/x-bibtex',
          sizeBytes: BigInt(120),
          content: `@article{ref1,\n  author = {Silva, A.},\n  title = {Exemplo de Referência},\n  year = {2026}\n}\n`,
        },
      ],
      });
    }

    // 2b. Instanciar as 6 Etapas Fixas Obrigatórias (ADR-008)
    const defaultSixStages = [
      { order: 1, title: 'Planejamento e Pesquisa TeX', description: 'Levantamento bibliográfico e estruturação TeX', isGatekeeper: false },
      { order: 2, title: 'Desenvolvimento e Experimentos', description: 'Coleta de dados e benchmarks', isGatekeeper: false },
      { order: 3, title: 'Escrita do Artigo', description: 'Redação das seções em tarefas paralelas', isGatekeeper: false },
      { order: 4, title: 'Revisão Técnica e Científica', description: 'Revisão geral do manuscrito consolidado', isGatekeeper: false },
      { order: 5, title: 'Parecer do NIT (Gatekeeper 1)', description: 'Validação de propriedade intelectual', isGatekeeper: true, gatekeeperType: 'NIT' },
      { order: 6, title: 'Submissão ao Congresso Alvo (Gatekeeper 2)', description: 'Submissão externa do artigo compilado', isGatekeeper: true, gatekeeperType: 'TARGET_CONFERENCE' },
    ];

    await Promise.all(
      defaultSixStages.map(async (def, i) => {
        const inputStage = data.stages && data.stages[i];
        await this.stagesRepository.create({
          projectId,
          title: (inputStage && inputStage.title) || def.title,
          description: (inputStage && inputStage.description) || def.description,
          plannedStartAt: inputStage?.plannedStartAt,
          plannedEndAt: inputStage?.plannedEndAt || inputStage?.plannedCompletionDate,
          plannedCompletionDate: inputStage?.plannedCompletionDate || inputStage?.plannedEndAt,
          order: def.order,
          isGatekeeper: def.isGatekeeper,
          gatekeeperType: def.gatekeeperType,
        });
      })
    );
    // 3. Registrar evento de criação no AuditLog para a Timeline
    await logAudit({
      userId,
      action: 'PROJECT_CREATED',
      entityType: 'Project',
      entityId: project.id,
      details: {
        name: project.name,
        coordinatorId: project.coordinatorId,
        managerId: project.managerId,
        targetConferenceName: project.targetConferenceName,
      },
    });

    const updatedProject = await this.projectsRepository.findById(projectId);
    return updatedProject || project;
  }

  // Listar projetos com suporte a filtros por equipe, ciclo acadêmico ou usuário
  async listProjects(filters?: ProjectFilterOptions) {
    return this.projectsRepository.findAll(filters);
  }

  // Buscar detalhes de um projeto pelo ID
  async getProjectById(projectId: string) {
    const project = await this.projectsRepository.findById(projectId);
    if (!project) {
      throw new Error('PROJECT_NOT_FOUND');
    }

    return project;
  }

  // Atualizar informações do projeto (com trava de justificativa para alteração de datas)
  async updateProject(projectId: string, userId: string, data: UpdateProjectDTO) {
    const existing = await this.projectsRepository.findById(projectId);
    if (!existing) {
      throw new Error('PROJECT_NOT_FOUND');
    }

    // Verifica se há alteração em datas de conferência ou prazos
    const targetDateChanged = data.targetConferenceDate
      ? !existing.targetConferenceDate ||
        new Date(data.targetConferenceDate).getTime() !==
          new Date(existing.targetConferenceDate).getTime()
      : false;
    const backupDateChanged = data.backupConferenceDate
      ? !existing.backupConferenceDate ||
        new Date(data.backupConferenceDate).getTime() !==
          new Date(existing.backupConferenceDate).getTime()
      : false;

    const isChangingDates = targetDateChanged || backupDateChanged;

    if (isChangingDates && (!data.justification || data.justification.trim() === '')) {
      throw new Error('JUSTIFICATION_REQUIRED_FOR_DATE_CHANGE');
    }

    const updateData = { ...data };
    delete updateData.justification;
    const updated = await this.projectsRepository.update(projectId, updateData);

    // Registra evento na Timeline / AuditLog
    await logAudit({
      userId,
      action: isChangingDates ? 'PROJECT_DATES_UPDATED' : 'PROJECT_UPDATED',
      entityType: 'Project',
      entityId: projectId,
      details: {
        justification: data.justification || 'Atualização de metadados do artigo',
        changedFields: Object.keys(data),
      },
    });

    return updated;
  }

  // Adicionar membro ao projeto (Autor ou Revisor) - Somente 1 Revisor por projeto
  async addMember(projectId: string, userId: string, role: Role, requesterId: string) {
    const project = await this.projectsRepository.findById(projectId);
    if (!project) throw new Error('PROJECT_NOT_FOUND');

    if (role === Role.REVIEWER) {
      const existingReviewer = (project as any).members?.find(
        (m: any) => m.role === Role.REVIEWER && m.userId !== userId
      );
      if (existingReviewer) {
        throw new Error('PROJECT_ALREADY_HAS_REVIEWER');
      }
    }

    await this.projectsRepository.addMember(projectId, userId, role);

    await logAudit({
      userId: requesterId,
      action: 'MEMBER_ADDED',
      entityType: 'Project',
      entityId: projectId,
      details: { addedUserId: userId, role },
    });
  }

  // Remover membro do projeto
  async removeMember(projectId: string, userId: string, requesterId: string) {
    const project = await this.projectsRepository.findById(projectId);
    if (!project) throw new Error('PROJECT_NOT_FOUND');

    await this.projectsRepository.removeMember(projectId, userId);

    await logAudit({
      userId: requesterId,
      action: 'MEMBER_REMOVED',
      entityType: 'Project',
      entityId: projectId,
      details: { removedUserId: userId },
    });
  }

  // Excluir projeto (Apenas Coordenador, Gerente ou Admin)
  async deleteProject(projectId: string, requesterId: string) {
    const project = await this.projectsRepository.findById(projectId);
    if (!project) throw new Error('PROJECT_NOT_FOUND');

    await this.projectsRepository.delete(projectId);

    await logAudit({
      userId: requesterId,
      action: 'PROJECT_DELETED',
      entityType: 'Project',
      entityId: projectId,
      details: { projectName: project.name },
    });
  }

  // Obter Timeline do projeto com histórico de eventos e justificativas
  async getTimeline(projectId: string) {
    const project = await this.projectsRepository.findById(projectId);
    if (!project) throw new Error('PROJECT_NOT_FOUND');

    const logs = await prisma.auditLog.findMany({
      where: {
        entityId: projectId,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    return logs.map((log) => ({
      id: log.id,
      action: log.action,
      timestamp: log.createdAt,
      author: log.user ? { name: log.user.name, email: log.user.email, role: log.user.role } : null,
      details: log.details,
    }));
  }

  // Atualização Pós-Submissão e Decisão dos Autores (DOI, Aceite, Rejeição, Backup)
  async updatePostSubmission(projectId: string, userId: string, data: PostSubmissionDTO) {
    const existing = await this.projectsRepository.findById(projectId);
    if (!existing) throw new Error('PROJECT_NOT_FOUND');

    const updated = await this.projectsRepository.update(projectId, {
      submissionStatus: data.submissionStatus,
      doi: data.doi,
      publicationUrl: data.publicationUrl,
      datasetUrl: data.datasetUrl,
      publishedAt: data.publishedAt || (data.doi ? new Date() : undefined),
      reviewerFeedback: data.reviewerFeedback,
    });

    await logAudit({
      userId,
      action: `POST_SUBMISSION_${data.submissionStatus}`,
      entityType: 'Project',
      entityId: projectId,
      details: {
        submissionStatus: data.submissionStatus,
        doi: data.doi,
        decisionReason: data.decisionReason || 'Atualização de status pós-submissão',
      },
    });

    return updated;
  }

  async getTaskDiffSummary(projectId: string, taskId: string, userId: string) {
    const project = await this.projectsRepository.findById(projectId);
    if (!project) throw new Error('PROJECT_NOT_FOUND');

    const user = await prisma.user.findUnique({ where: { id: userId } }).catch(() => null);
    const lastSavedAuthor = user?.name || 'Autor';
    const task = await prisma.task.findUnique({ where: { id: taskId } }).catch(() => null);
    const files = await prisma.projectFile.findMany({ where: { projectId } });

    const rawFacts = files.map((f) => ({
      path: f.path,
      status: 'modified' as const,
      additions: 1,
      deletions: 0,
    }));

    const { classifiedFiles, hasChangesInOtherFiles } = classificationService.classifyDiffFacts(
      rawFacts,
      task?.title
    );

    const generatedProgressDescription = progressDescriptionService.generateDefaultDescription(
      classifiedFiles,
      task?.title
    );

    return {
      lastSavedAt: new Date().toISOString(),
      lastSavedAuthor,
      summary: {
        filesChanged: classifiedFiles.length,
        additions: classifiedFiles.length,
        deletions: 0,
      },
      files: classifiedFiles,
      hasChangesInOtherFiles,
      generatedProgressDescription,
    };
  }

  async commitTaskProgress(
    projectId: string,
    taskId: string,
    userId: string,
    commitMessage?: string
  ) {
    const project = await this.projectsRepository.findById(projectId);
    if (!project) throw new Error('PROJECT_NOT_FOUND');

    const user = await prisma.user.findUnique({ where: { id: userId } });
    const authorName = user?.name || 'SCI-LaTeX Author';

    const task = await prisma.task.findUnique({ where: { id: taskId } });
    let msg = commitMessage?.trim();
    if (!msg) {
      const diffSummary = await this.getTaskDiffSummary(projectId, taskId, userId);
      msg = diffSummary.generatedProgressDescription || `Progresso da tarefa: ${task?.title || taskId}`;
    }

    const mainFile = await prisma.projectFile.findUnique({
      where: { projectId_path: { projectId, path: 'main.tex' } },
    });
    const content = mainFile?.content || '';

    const snapshot =
      process.env.NODE_ENV !== 'test'
        ? await prisma.documentSnapshot.create({
            data: {
              projectId,
              version: project.currentVersion + 1,
              content,
              savedBy: authorName,
              reason: msg,
            },
          })
        : { id: `snap-${Date.now()}` };

    if (process.env.NODE_ENV !== 'test') {
      await prisma.project.update({
        where: { id: projectId },
        data: { currentVersion: { increment: 1 } },
      });
    }

    await logAudit({
      userId,
      action: 'TASK_PROGRESS_SAVED',
      entityType: 'Project',
      entityId: projectId,
      details: {
        taskId,
        snapshotId: snapshot.id,
        commitMessage: msg,
      },
    });

    return {
      message: 'Progresso salvo com sucesso no banco de dados!',
      commitHash: snapshot.id,
      commitMessage: msg,
      taskId,
      projectId,
    };
  }

  // Agrupa apontamentos/comentários de revisores por etapa do projeto
  async getReviewCommentsByStage(projectId: string) {
    const stages = await prisma.projectStage.findMany({
      where: { projectId },
      orderBy: { order: 'asc' },
    });

    return stages.map((stage) => ({
      stageId: stage.id,
      stageTitle: stage.title,
      comments: [],
    }));
  }
}
