import path from 'node:path';
import { NITStatus, PRStatus } from '@prisma/client';
import { env } from '../../config/env';
import {
  CreatePRData,
  PrismaPullRequestsRepository,
} from '../../repositories/pull-requests.repository';
import { eventsManager } from '../events/events.manager';
import { logAudit } from '../../utils/audit';
import { GitService } from '../../infra/git/git.service';
import { K8sPodManagerService } from '../../infra/k8s/k8s-pod-manager.service';
import { prisma } from '../../db/prisma';
import { classificationService } from '../projects/services/classification.service';

export class PullRequestsService {
  constructor(
    private readonly prRepository: PrismaPullRequestsRepository,
    private readonly gitService?: GitService,
    private readonly k8sPodManager?: K8sPodManagerService
  ) {}

  // Abertura de Pull Request pelo Autor
  async createPR(authorId: string, data: CreatePRData) {
    // 0. Validação de segurança: Impede o envio para revisão caso existam alterações pendentes de salvamento no rascunho
    if (this.gitService && data.projectId) {
      const dirtyCheck = await this.gitService.checkUncommittedChanges(data.projectId, authorId);
      if (dirtyCheck.hasUncommittedChanges) {
        throw new Error('UNCOMMITTED_CHANGES_BEFORE_REVIEW');
      }
    }

    let cleanReviewerId =
      data.reviewerId && data.reviewerId.trim() !== '' ? data.reviewerId : undefined;

    // Se o autor não especificou um revisor, verifica se o projeto já possui um Revisor atribuído
    if (!cleanReviewerId && data.projectId) {
      const projectMemberReviewer = await prisma.projectMember.findFirst({
        where: {
          projectId: data.projectId,
          role: 'REVIEWER',
        },
      });
      if (projectMemberReviewer) {
        cleanReviewerId = projectMemberReviewer.userId;
      }
    }

    // 1. Resolver tarefa / branch associada
    let task: any = null;
    let headBranchName = 'dev';

    if (data.taskId) {
      task = await prisma.task.findUnique({ where: { id: data.taskId } }).catch(() => null);
      if (task) {
        headBranchName = task.branchName;
      }
    }

    // 2. Verifica se já existe um Draft PR para a mesma tarefa e projeto
    const existingDraftPR = data.taskId
      ? await prisma.pullRequest.findFirst({
          where: {
            projectId: data.projectId,
            taskId: data.taskId,
            status: PRStatus.DRAFT,
          },
        })
      : null;

    let pr: any;
    if (existingDraftPR) {
      if (cleanReviewerId && cleanReviewerId !== existingDraftPR.reviewerId) {
        await this.prRepository.updateReviewer(existingDraftPR.id, cleanReviewerId);
      }
      pr = await this.prRepository.updateStatus(existingDraftPR.id, PRStatus.UNDER_REVIEW);
    } else {
      pr = await this.prRepository.create({
        ...data,
        reviewerId: cleanReviewerId,
        authorId,
      });
    }

    // 2.5 Congelamento da ReviewRound e captura imutável dos SHAs no momento da submissão
    try {
      const authorUser = await prisma.user
        .findUnique({ where: { id: authorId } })
        .catch(() => null);
      const project = await prisma.project
        .findUnique({ where: { id: data.projectId } })
        .catch(() => null);

      if (this.gitService && data.taskId) {
        await this.gitService
          .commitWorkspaceProgress({
            projectId: data.projectId,
            userId: authorId,
            taskId: data.taskId,
            branchName: headBranchName,
            commitMessage: `Submissão de Revisão do Autor: ${pr.title}`,
            authorName: authorUser?.name || 'SCI-LaTeX Author',
            authorEmail: authorUser?.email || 'author@sci-latex.org',
            repoUrl: project?.gitRepoPath,
          })
          .catch((err) =>
            console.warn('⚠️ Warning auto-committing workspace progress on PR creation:', err)
          );
      }

      const taskWorkspaceDir = data.taskId
        ? path.resolve(
            env.STORAGE_PATH,
            'projects',
            data.projectId,
            'users',
            authorId,
            'tasks',
            data.taskId
          )
        : path.resolve(env.STORAGE_PATH, 'projects', data.projectId);
      const projectDir = path.resolve(env.STORAGE_PATH, 'projects', data.projectId);

      const submittedCommitHash = this.gitService
        ? (await this.gitService.getCommitSha(taskWorkspaceDir, 'HEAD')) || 'HEAD'
        : 'HEAD';
      const baseCommitHash = this.gitService
        ? (await this.gitService.getCommitSha(projectDir, 'dev')) || 'dev'
        : 'dev';

      const existingRounds = await prisma.reviewRound.findMany({
        where: { pullRequestId: pr.id },
        orderBy: { roundNumber: 'asc' },
      });

      const roundNumber = existingRounds.length + 1;
      const previousSubmittedCommitHash =
        existingRounds.length > 0 ? existingRounds.at(-1)?.submittedCommitHash : undefined;

      await prisma.reviewRound.create({
        data: {
          pullRequestId: pr.id,
          roundNumber,
          baseCommitHash,
          submittedCommitHash,
          previousSubmittedCommitHash,
        },
      });

      if (this.gitService && submittedCommitHash && submittedCommitHash !== 'HEAD') {
        await this.gitService
          .createReviewTag({
            projectId: data.projectId,
            prId: pr.id,
            roundNumber,
            commitSha: submittedCommitHash,
            repoUrl: project?.gitRepoPath,
          })
          .catch((tagErr) => console.warn('⚠️ Warning creating review tag:', tagErr));
      }
    } catch (err: any) {
      console.warn('⚠️ Warning creating ReviewRound record:', err?.message || err);
    }

    // 3. Atualizar o status da Task associada para UNDER_REVIEW
    if (data.taskId) {
      await prisma.task
        .update({
          where: { id: data.taskId },
          data: { status: 'UNDER_REVIEW' },
        })
        .catch(() => {});
    }

    // 4. Transiciona o PR no GitHub remoto para Ready for Review
    if (this.gitService) {
      const project = await prisma.project.findUnique({ where: { id: data.projectId } });
      await this.gitService.markPullRequestReadyForReview({
        projectId: data.projectId,
        projectTitle: project?.name,
        headBranch: headBranchName,
        repoUrl: project?.gitRepoPath,
      });
    }

    // 5. Registra no AuditLog (Timeline)
    await logAudit({
      userId: authorId,
      action: 'PR_OPENED',
      entityType: 'PullRequest',
      entityId: pr.id,
      details: {
        title: pr.title,
        taskId: pr.taskId,
        projectId: pr.projectId,
        reviewerId: pr.reviewerId,
      },
    });

    // 6. Notifica todos os membros do projeto em tempo real via SSE (Autores, Revisores, Coordenadores)
    const projectMembers = await prisma.projectMember.findMany({
      where: { projectId: pr.projectId },
    });

    projectMembers.forEach((member) => {
      eventsManager.broadcastToUser(member.userId, 'PR_OPENED', {
        pullRequestId: pr.id,
        title: pr.title,
        taskId: pr.taskId,
        projectId: pr.projectId,
        authorId,
        reviewerId: pr.reviewerId,
      });
    });

    return pr;
  }

  // Atribuição ou atualização de Revisor no PR (por Coordenador/Gerente)
  async assignReviewer(prId: string, reviewerId: string, assignerId: string) {
    const pr = await this.prRepository.findById(prId);
    if (!pr) throw new Error('PR_NOT_FOUND');

    const updatedPR = await this.prRepository.updateReviewer(prId, reviewerId);

    // Registra na Timeline / AuditLog
    await logAudit({
      userId: assignerId,
      action: 'PR_REVIEWER_ASSIGNED',
      entityType: 'PullRequest',
      entityId: prId,
      details: { reviewerId },
    });

    // Notifica o Autor e o Revisor atribuído via SSE
    eventsManager.broadcastToUser(pr.authorId, 'PR_REVIEWER_ASSIGNED', {
      pullRequestId: prId,
      reviewerId,
    });
    eventsManager.broadcastToUser(reviewerId, 'PR_ASSIGNED_TO_YOU', {
      pullRequestId: prId,
      title: pr.title,
      projectId: pr.projectId,
    });

    return updatedPR;
  }

  // Obter detalhes de um PR por ID
  async getPRById(prId: string) {
    const pr = await this.prRepository.findById(prId);
    if (!pr) throw new Error('PR_NOT_FOUND');
    return pr;
  }

  // Listar PRs de um projeto
  async listPRs(projectId?: string) {
    return this.prRepository.findAll(projectId);
  }

  // Avaliação pelo Revisor (Aprovar, Solicitar Ajustes ou Adicionar Comentários)
  async reviewPR(
    prId: string,
    reviewerId: string,
    status?: 'APPROVED' | 'CHANGES_REQUESTED' | 'UNDER_REVIEW',
    comment?: string,
    lineNumer?: number
  ) {
    const pr = await this.prRepository.findById(prId);
    if (!pr) throw new Error('PR_NOT_FOUND');

    // Se houver comentário, grava na tabela de comentários do PR vinculando à última ReviewRound
    if (comment && comment.trim() !== '') {
      const latestRound = await prisma.reviewRound.findFirst({
        where: { pullRequestId: prId },
        orderBy: { roundNumber: 'desc' },
      });

      await this.prRepository.addComment({
        pullRequestId: prId,
        reviewRoundId: latestRound?.id,
        userId: reviewerId,
        lineNumer,
        comment,
      });
    }

    let updatedPR: any = pr;
    if (
      status &&
      (status === 'APPROVED' || status === 'CHANGES_REQUESTED') &&
      status !== pr.status
    ) {
      updatedPR = await this.prRepository.updateStatus(prId, status as PRStatus);

      if (pr.taskId) {
        await prisma.task
          .update({
            where: { id: pr.taskId },
            data: { status: status as any },
          })
          .catch((err) => console.warn('⚠️ Warning updating task status on review:', err));
      }

      await logAudit({
        userId: reviewerId,
        action: `PR_${status}`,
        entityType: 'PullRequest',
        entityId: prId,
        details: { status, comment, lineNumer, taskId: pr.taskId },
      });
      eventsManager.broadcastToUser(pr.authorId, 'PR_REVIEWED', {
        pullRequestId: prId,
        status,
        taskId: pr.taskId,
        projectId: pr.projectId,
        reviewerId,
      });
      eventsManager.broadcastToProject(pr.projectId, 'TASK_STATUS_UPDATED', {
        taskId: pr.taskId,
        status,
      });
    }

    // Sincroniza o comentário e a avaliação diretamente no Pull Request no GitHub
    if (this.gitService) {
      const project = await prisma.project.findUnique({ where: { id: pr.projectId } });
      const reviewerUser = await prisma.user.findUnique({ where: { id: reviewerId } });
      const headBranch = pr.task?.branchName;

      await this.gitService
        .submitPullRequestReviewOnGitHub({
          projectId: pr.projectId,
          headBranch,
          projectTitle: project?.name,
          repoUrl: project?.gitRepoPath,
          status,
          comment,
          lineNumer,
          reviewerName: reviewerUser?.name,
          reviewerEmail: reviewerUser?.email,
          reviewerRole: reviewerUser?.role,
        })
        .catch((ghErr) => {
          console.warn('⚠️ Warning syncing review comment to GitHub:', ghErr.message || ghErr);
        });
    }

    // Retorna o PR atualizado com a lista completa de comentários
    const fullPR = await this.prRepository.findById(prId);
    return fullPR ?? updatedPR;
  }

  // Registro Manual do Status / Envio do NIT (Núcleo de Inovação Tecnológica)
  async updateNITStatus(
    prId: string,
    userId: string,
    data: {
      nitStatus: NITStatus;
      nitNotes?: string;
      sentToNitAt?: string | Date;
      sentToNitNotes?: string;
      nitApprovedAt?: string | Date;
    }
  ) {
    const pr = await this.prRepository.findById(prId);
    if (!pr) throw new Error('PR_NOT_FOUND');

    const updatedPR = await this.prRepository.updateNITStatus(prId, {
      nitStatus: data.nitStatus,
      nitNotes: data.nitNotes,
      sentToNitAt: data.sentToNitAt ? new Date(data.sentToNitAt) : undefined,
      sentToNitNotes: data.sentToNitNotes,
      nitApprovedAt: data.nitApprovedAt ? new Date(data.nitApprovedAt) : undefined,
    });

    // Registra o processo institucional completo do NIT no PostgreSQL
    await prisma.nitProcess
      .create({
        data: {
          articleId: pr.projectId,
          githubPrNodeId: pr.id,
          status: data.nitStatus,
          sentAt: data.sentToNitAt ? new Date(data.sentToNitAt) : new Date(),
          sentNotes: data.sentToNitNotes,
          approvedAt: data.nitApprovedAt ? new Date(data.nitApprovedAt) : undefined,
          responseNotes: data.nitNotes,
        },
      })
      .catch((err) => console.warn('⚠️ Warning creating nitProcess record:', err));

    // Sincroniza a projeção local do resumo do NIT no quadro do GitHub Project v2
    const projectIntegration = await prisma.githubIntegration.findFirst({
      where: { articleId: pr.projectId },
    });

    if (projectIntegration) {
      await prisma.githubProjectItemProjection
        .updateMany({
          where: { githubProjectV2Id: projectIntegration.githubProjectV2Id },
          data: { nitStatusValue: data.nitStatus, lastSyncedAt: new Date() },
        })
        .catch(() => {});
    }

    // Registra na Timeline / AuditLog
    await logAudit({
      userId,
      action: 'NIT_STATUS_UPDATED',
      entityType: 'PullRequest',
      entityId: prId,
      details: {
        nitStatus: data.nitStatus,
        nitNotes: data.nitNotes,
        sentToNitNotes: data.sentToNitNotes,
      },
    });

    // Emite notificação SSE
    eventsManager.broadcastToUser(pr.authorId, 'NIT_STATUS_UPDATED', {
      pullRequestId: prId,
      nitStatus: data.nitStatus,
    });

    return updatedPR;
  }

  // Executar MERGE do PR de Tarefa para a branch 'dev' (Exige apenas aprovação do Revisor)
  async mergePR(prId: string, requesterId: string) {
    const pr = await this.prRepository.findById(prId);
    if (!pr) throw new Error('PR_NOT_FOUND');

    // 🔒 TRAVA DE SEGURANÇA: O PR precisa ter sido aprovado pelo Revisor
    if (pr.status !== PRStatus.APPROVED) {
      throw new Error('PR_NOT_APPROVED_BY_REVIEWER');
    }

    const sourceBranch = pr.task?.branchName;

    // Executa o merge real no repositório Git (tarefa -> dev) e apaga a branch do autor
    if (this.gitService && sourceBranch) {
      const targetBranch = 'dev';

      const authorUser = pr.authorId
        ? await prisma.user.findUnique({ where: { id: pr.authorId } })
        : null;
      const authorName = authorUser?.name || 'SCI-LaTeX Author';
      const authorEmail = authorUser?.email || 'author@sci-latex.org';
      const project = await prisma.project.findUnique({ where: { id: pr.projectId } });

      try {
        await this.gitService.mergeBranch({
          projectId: pr.projectId,
          sourceBranch,
          targetBranch,
          authorName,
          authorEmail,
          commitMessage: `Merge task PR #${pr.id} (${sourceBranch}) into ${targetBranch}`,
          repoUrl: project?.gitRepoPath,
        });

        // Sincroniza a fusão do Pull Request no GitHub remoto via REST API
        await this.gitService
          .mergePullRequestOnGitHub({
            projectId: pr.projectId,
            headBranch: sourceBranch,
            baseBranch: targetBranch,
            projectTitle: project?.name,
            repoUrl: project?.gitRepoPath,
            commitTitle: `Merge task PR #${pr.id} (${sourceBranch}) into ${targetBranch}`,
          })
          .catch((ghErr) => {
            console.warn('⚠️ Warning merging PR on GitHub API:', ghErr.message || ghErr);
          });

        // Remove a branch do autor após o merge na dev (protegendo main e dev)
        await this.gitService.deleteBranch({
          projectId: pr.projectId,
          branchName: sourceBranch,
          repoUrl: project?.gitRepoPath,
        });
      } catch (gitErr: any) {
        console.error('❌ Error executing git merge on PR:', gitErr.message || gitErr);
        throw new Error(`GIT_MERGE_FAILED: ${gitErr.message || gitErr}`);
      }
    }

    // Se aprovado, marca como MERGED no banco de dados
    const mergedPR = await this.prRepository.updateStatus(prId, PRStatus.MERGED);

    if (pr.taskId) {
      await prisma.task
        .update({
          where: { id: pr.taskId },
          data: { status: 'MERGED' },
        })
        .catch(() => {});
    }

    // 1. Registra no AuditLog / Timeline
    await logAudit({
      userId: requesterId,
      action: 'PR_MERGED',
      entityType: 'PullRequest',
      entityId: prId,
      details: { mergedAt: mergedPR.mergedAt, targetBranch: 'dev' },
    });

    // 2. Emite notificação SSE de desbloqueio de merge
    eventsManager.broadcastToUser(pr.authorId, 'MERGE_UNLOCKED', {
      pullRequestId: prId,
      projectId: pr.projectId,
      mergedAt: mergedPR.mergedAt,
    });

    // 3. Encerra o Pod K8s e limpa o PVC do projeto/usuário após a confirmação do merge com sucesso
    if (this.k8sPodManager && pr.projectId) {
      await this.k8sPodManager.releasePodForProject(pr.projectId).catch((err) => {
        console.warn('⚠️ Warning releasing Pod on PR merge:', err.message || err);
      });
      await this.k8sPodManager.cleanProjectPVC(pr.projectId).catch((err) => {
        console.warn('⚠️ Warning cleaning PVC on PR merge:', err.message || err);
      });
    }

    // 4. Atualiza a tabela Workspace no banco para marcar status TERMINATED e limpar podName
    await prisma.workspace
      .updateMany({
        where: { projectId: pr.projectId },
        data: { status: 'TERMINATED', podName: null },
      })
      .catch(() => {});

    return mergedPR;
  }

  // Realiza o merge final da branch 'dev' para a 'main' (Exige parecer aprovado do NIT na penúltima etapa antes da submissão)
  async mergeDevToMain(projectId: string, requesterId: string) {
    const project = await prisma.project.findUnique({ where: { id: projectId } });
    if (!project) throw new Error('PROJECT_NOT_FOUND');

    // Executa o merge da dev na main
    if (this.gitService) {
      await this.gitService.mergeBranch({
        projectId,
        sourceBranch: 'dev',
        targetBranch: 'main',
        authorName: 'SCI-LaTeX System',
        authorEmail: 'system@sci-latex.org',
        commitMessage: `Merge branch 'dev' into main for final submission release`,
        repoUrl: project.gitRepoPath,
      });
    }

    await logAudit({
      userId: requesterId,
      action: 'PROJECT_MERGED_TO_MAIN',
      entityType: 'Project',
      entityId: projectId,
      details: { mergedAt: new Date() },
    });

    return { message: 'Artigo mesclado com sucesso na branch main para submissão final.' };
  }

  // Obter a estrutura desacoplada de ReviewDiff (overview e roundChanges)
  async getPRReviewDiff(prId: string) {
    const pr = await prisma.pullRequest.findUnique({
      where: { id: prId },
      include: {
        rounds: { orderBy: { roundNumber: 'asc' } },
        task: true,
      },
    });

    if (!pr) throw new Error('PR_NOT_FOUND');

    const projectDir = path.resolve(env.STORAGE_PATH, 'projects', pr.projectId);
    const rounds = pr.rounds || [];
    const latestRound = rounds.length > 0 ? rounds[rounds.length - 1] : null;

    const baseSha = latestRound?.baseCommitHash || 'dev';
    const submittedSha = latestRound?.submittedCommitHash || 'HEAD';
    const previousSha = latestRound?.previousSubmittedCommitHash || undefined;

    const overviewFacts = this.gitService
      ? await this.gitService.getDiffFactsBetweenRefs(projectDir, baseSha, submittedSha)
      : [];

    const overviewClassification = classificationService.classifyDiffFacts(overviewFacts, pr.title);

    let roundChangesClassification: any = null;
    if (previousSha && this.gitService) {
      const roundFacts = await this.gitService.getDiffFactsBetweenRefs(
        projectDir,
        previousSha,
        submittedSha
      );
      roundChangesClassification = classificationService.classifyDiffFacts(roundFacts, pr.title);
    }

    return {
      pullRequestId: pr.id,
      roundNumber: latestRound?.roundNumber || 1,
      overview: {
        baseCommitHash: baseSha,
        targetCommitHash: submittedSha,
        ...overviewClassification,
      },
      roundChanges: previousSha
        ? {
            previousSubmittedCommitHash: previousSha,
            currentSubmittedCommitHash: submittedSha,
            ...roundChangesClassification,
          }
        : null,
      roundsCount: rounds.length,
      rounds: rounds.map((r) => ({
        id: r.id,
        roundNumber: r.roundNumber,
        baseCommitHash: r.baseCommitHash,
        submittedCommitHash: r.submittedCommitHash,
        previousSubmittedCommitHash: r.previousSubmittedCommitHash,
        createdAt: r.createdAt,
      })),
    };
  }
}
