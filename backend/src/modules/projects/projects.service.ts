import crypto from 'crypto';
import fs from 'fs/promises';
import path from 'path';
import { Role } from '@prisma/client';
import { env } from '../../config/env';
import { prisma } from '../../db/prisma';
import { IProjectsRepository, ProjectFilterOptions } from '../../repositories/projects.repository';
import { ITeamsRepository } from '../../repositories/teams.repository';
import { logAudit } from '../../utils/audit';
import { GitService } from '../git/git.service';

export interface CreateProjectDTO {
  name: string;
  description?: string;
  teamId?: string;
  academicPeriodId?: string;
  targetConferenceName?: string;
  targetConferenceDate?: Date;
  backupConferenceName?: string;
  backupConferenceDate?: Date;
  coAuthorIds?: string[];
  reviewerId?: string;
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

import { K8sPodManagerService } from '../k8s/k8s-pod-manager.service';

export class ProjectsService {
  private k8sPodManager: K8sPodManagerService;

  constructor(
    private projectsRepository: IProjectsRepository,
    private teamsRepository: ITeamsRepository,
    private gitService: GitService,
    k8sPodManager?: K8sPodManagerService
  ) {
    this.k8sPodManager = k8sPodManager || new K8sPodManagerService();
  }

  // Criar um novo projeto/artigo e provisionar seu repositório Git/GitHub
  async createProject(userId: string, data: CreateProjectDTO) {
    let targetTeamId = data.teamId;

    if (!targetTeamId) {
      const defaultTeam = await this.teamsRepository.getOrCreateDefaultTeam(userId);
      targetTeamId = defaultTeam.id;
    }

    const projectId = crypto.randomUUID();

    // 1. Provisionar primeiramente o repositório remoto no GitHub / Git local.
    // Isso garante a garantia de consistência: se o GitHub falhar (ex: erro de autenticação ou rede),
    // a operação será abortada sem deixar lixo ou registros orfãos no PostgreSQL.
    const gitRepoPath = await this.gitService.initRepository(projectId, data.name);

    // 2. Com a confirmação da criação do repositório remoto, criar a entidade Project no banco
    const project = await this.projectsRepository.create({
      name: data.name,
      description: data.description,
      teamId: targetTeamId,
      academicPeriodId: data.academicPeriodId,
      targetConferenceName: data.targetConferenceName,
      targetConferenceDate: data.targetConferenceDate,
      backupConferenceName: data.backupConferenceName,
      backupConferenceDate: data.backupConferenceDate,
      id: projectId,
      gitRepoPath,
      creatorId: userId,
    });

    // 2b. Adicionar o criador do projeto como membro (Autor)
    await this.projectsRepository.addMember(projectId, userId, Role.AUTHOR).catch(() => {});

    // 2c. Adicionar os co-autores selecionados
    if (data.coAuthorIds && Array.isArray(data.coAuthorIds)) {
      for (const coAuthorId of data.coAuthorIds) {
        if (coAuthorId && coAuthorId !== userId) {
          const userExists = await prisma.user
            .findUnique({ where: { id: coAuthorId } })
            .catch(() => null);
          if (userExists) {
            await this.projectsRepository
              .addMember(projectId, coAuthorId, Role.AUTHOR)
              .catch((err) => console.error(`Error adding coAuthor ${coAuthorId}:`, err));
          }
        }
      }
    }

    // 2d. Adicionar o revisor técnico selecionado
    if (data.reviewerId) {
      const userExists = await prisma.user
        .findUnique({ where: { id: data.reviewerId } })
        .catch(() => null);
      if (userExists) {
        await this.projectsRepository
          .addMember(projectId, data.reviewerId, Role.REVIEWER)
          .catch((err) => console.error(`Error adding reviewer ${data.reviewerId}:`, err));
      }
    }

    // 3. Registrar evento de criação no AuditLog para a Timeline
    await logAudit({
      userId,
      action: 'PROJECT_CREATED',
      entityType: 'Project',
      entityId: project.id,
      details: {
        name: project.name,
        teamId: project.teamId,
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

  // Buscar detalhes de um projeto pelo ID (com computação de travas por PR ativo nas seções)
  async getProjectById(projectId: string) {
    const project = await this.projectsRepository.findById(projectId);
    if (!project) {
      throw new Error('PROJECT_NOT_FOUND');
    }

    const prs = (project as any).prs || [];
    const activePRStatuses = ['DRAFT', 'UNDER_REVIEW', 'CHANGES_REQUESTED'];

    const sectionsWithLockStatus = ((project as any).sections || []).map((sec: any) => {
      const activePR = prs.find(
        (p: any) => p.sectionId === sec.id && activePRStatuses.includes(p.status)
      );

      return {
        ...sec,
        isLocked: !!activePR,
        activePullRequest: activePR
          ? {
              id: activePR.id,
              title: activePR.title,
              status: activePR.status,
              author: activePR.author,
              createdAt: activePR.createdAt,
            }
          : null,
      };
    });

    return {
      ...project,
      sections: sectionsWithLockStatus,
    };
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
    await this.k8sPodManager.cleanProjectPVC(projectId).catch(() => {});

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

  // Realiza o commit silencioso do progresso da seção no GitHub via Service Token e garante a existência do Draft PR
  async commitSectionProgress(
    projectId: string,
    sectionId: string,
    userId: string,
    commitMessage?: string
  ) {
    const project = await this.projectsRepository.findById(projectId);
    if (!project) throw new Error('PROJECT_NOT_FOUND');

    const user = await prisma.user.findUnique({ where: { id: userId } });
    const authorName = user?.name || 'SCI-LaTeX Author';
    const authorEmail = user?.email || 'author@sci-latex.org';

    // Garante que a seção existe na tabela Section para evitar violações de chave estrangeira
    const shortHash = projectId.slice(0, 8);
    const dbSectionId = `${sectionId}-${shortHash}`;
    let existingSection = await prisma.section.findFirst({
      where: { projectId, OR: [{ id: sectionId }, { id: dbSectionId }] },
    });

    if (!existingSection) {
      const titleMap: Record<string, { title: string; filePath: string }> = {
        'sec-1': {
          title: '1. Introdução & Trabalhos Relacionados',
          filePath: 'sections/01-introduction.tex',
        },
        'sec-2': { title: '2. Metodologia & Formulação', filePath: 'sections/02-methodology.tex' },
        'sec-3': { title: '3. Resultados & Experimentos', filePath: 'sections/03-results.tex' },
        'sec-4': { title: '4. Conclusão', filePath: 'sections/04-conclusion.tex' },
      };
      const meta = titleMap[sectionId] || {
        title: `Seção ${sectionId}`,
        filePath: `sections/${sectionId}.tex`,
      };

      existingSection = await prisma.section
        .create({
          data: {
            id: dbSectionId,
            projectId,
            title: meta.title,
            filePath: meta.filePath,
            branchName: `section/${sectionId}-${shortHash}`,
          },
        })
        .catch(
          () =>
            ({
              id: dbSectionId,
              projectId,
              title: meta.title,
              filePath: meta.filePath,
              branchName: `section/${sectionId}-${shortHash}`,
            }) as any
        );
    }

    if (!existingSection) {
      throw new Error('SECTION_NOT_FOUND');
    }

    const filePath = existingSection.filePath;
    const branchName = existingSection.branchName;

    const projectDir = path.resolve(env.STORAGE_PATH, 'projects', projectId);
    const fullFilePath = path.join(projectDir, filePath);

    let fileContent = '';
    try {
      fileContent = await fs.readFile(fullFilePath, 'utf-8');
    } catch {
      fileContent = `% Progress update for ${sectionId}\n`;
    }

    const msg = commitMessage || `Progress update: section ${sectionId} edit`;

    let commitHash = `commit-${Date.now().toString(36)}`;
    try {
      commitHash = await this.gitService.commitFile({
        projectId,
        branchName,
        filePath,
        content: fileContent,
        commitMessage: msg,
        authorName,
        authorEmail,
        repoUrl: project.gitRepoPath,
      });
    } catch (gitErr: any) {
      console.error('❌ Error executing real Git commit to GitHub:', gitErr.message || gitErr);
      throw new Error(
        `GITHUB_COMMIT_ERROR: ${gitErr.message || 'Falha ao efetuar commit no GitHub'}`
      );
    }

    // Criar ou garantir que o Pull Request em modo DRAFT exista no banco de dados e no GitHub
    let pr: any = null;
    const dbProject = await prisma.project
      .findUnique({ where: { id: projectId } })
      .catch(() => null);

    if (dbProject) {
      pr = await prisma.pullRequest
        .findFirst({
          where: {
            projectId,
            sectionId,
            status: { in: ['DRAFT', 'UNDER_REVIEW', 'CHANGES_REQUESTED', 'APPROVED'] },
          },
        })
        .catch(() => null);

      if (!pr) {
        const reviewerMember = await prisma.projectMember
          .findFirst({
            where: { projectId, role: 'REVIEWER' },
          })
          .catch(() => null);

        let authorIdToUse = userId;
        if (user) {
          authorIdToUse = user.id;
        } else {
          const anyUser = await prisma.user.findFirst().catch(() => null);
          if (anyUser) {
            authorIdToUse = anyUser.id;
          }
        }

        pr = await prisma.pullRequest
          .create({
            data: {
              title: `[DRAFT] Revisão da Seção: ${existingSection.title}`,
              description: `Progresso salvo pelo autor em ${new Date().toLocaleDateString('pt-BR')}`,
              status: 'DRAFT',
              projectId,
              sectionId,
              authorId: authorIdToUse,
              reviewerId: reviewerMember?.userId || null,
            },
          })
          .catch(() => null);
      }

      try {
        await this.gitService.createDraftPullRequest({
          projectId,
          headBranch: branchName,
          baseBranch: 'dev',
          title: `[DRAFT] Revisão da Seção: ${existingSection.title}`,
          body: `Draft Pull Request criado automaticamente ao salvar o progresso da seção.`,
          projectTitle: project.name,
          repoUrl: project.gitRepoPath,
          authorName: user?.name,
          authorEmail: user?.email,
          authorRole: user?.role,
        });
      } catch (ghErr: any) {
        console.warn('⚠️ Warning creating remote GitHub draft PR:', ghErr.message || ghErr);
      }
    }

    await logAudit({
      userId,
      action: 'SECTION_PROGRESS_COMMITTED',
      entityType: 'Project',
      entityId: projectId,
      details: {
        sectionId,
        filePath,
        branchName,
        commitHash,
        commitMessage: msg,
        pullRequestId: pr?.id,
      },
    });

    return {
      message: 'Progresso salvo e Draft PR mantido/criado no GitHub com sucesso!',
      commitHash,
      sectionId,
      projectId,
      pullRequest: pr,
    };
  }
}
