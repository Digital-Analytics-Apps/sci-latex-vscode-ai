import { NITStatus, PRStatus } from '@prisma/client';
import {
  CreatePRData,
  PrismaPullRequestsRepository,
} from '../../repositories/pull-requests.repository';
import { eventsManager } from '../events/events.manager';
import { logAudit } from '../../utils/audit';
import { GitService } from '../git/git.service';
import { prisma } from '../../db/prisma';

export class PullRequestsService {
  constructor(
    private prRepository: PrismaPullRequestsRepository,
    private gitService?: GitService
  ) {}

  // Abertura de Pull Request pelo Autor
  async createPR(authorId: string, data: CreatePRData) {
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

    // Se houver comentário, grava na tabela de comentários do PR
    if (comment && comment.trim() !== '') {
      await this.prRepository.addComment({
        pullRequestId: prId,
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
      await logAudit({
        userId: reviewerId,
        action: `PR_${status}`,
        entityType: 'PullRequest',
        entityId: prId,
        details: { status, comment, lineNumer },
      });
      eventsManager.broadcastToUser(pr.authorId, 'PR_REVIEWED', {
        pullRequestId: prId,
        status,
        reviewerId,
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
    return fullPR || updatedPR;
  }

  // Registro Manual do Status do NIT (Núcleo de Inovação Tecnológica)
  async updateNITStatus(prId: string, userId: string, nitStatus: NITStatus, nitNotes?: string) {
    const pr = await this.prRepository.findById(prId);
    if (!pr) throw new Error('PR_NOT_FOUND');

    const updatedPR = await this.prRepository.updateNITStatus(prId, nitStatus, nitNotes);

    // Registra na Timeline / AuditLog
    await logAudit({
      userId,
      action: 'NIT_STATUS_UPDATED',
      entityType: 'PullRequest',
      entityId: prId,
      details: { nitStatus, nitNotes },
    });

    // Emite notificação SSE
    eventsManager.broadcastToUser(pr.authorId, 'NIT_STATUS_UPDATED', {
      pullRequestId: prId,
      nitStatus,
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
}
