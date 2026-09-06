import { PRStatus, NITStatus } from '@prisma/client';
import { PrismaPullRequestsRepository, CreatePRData } from '../../repositories/pull-requests.repository';
import { latexProducer } from '../../queue/producers/latex.producer';
import { eventsManager } from '../events/events.manager';
import { logAudit } from '../../utils/audit';

export class PullRequestsService {
  constructor(private prRepository: PrismaPullRequestsRepository) {}

  // Abertura de Pull Request pelo Autor
  async createPR(authorId: string, data: CreatePRData) {
    const pr = await this.prRepository.create({
      ...data,
      authorId,
    });

    // 1. Registra no AuditLog (Timeline)
    await logAudit({
      userId: authorId,
      action: 'PR_OPENED',
      entityType: 'PullRequest',
      entityId: pr.id,
      details: { title: pr.title, sectionId: pr.sectionId, projectId: pr.projectId },
    });

    // 2. Dispara job no RabbitMQ para compilar o PDF de visualização do Revisor
    await latexProducer.publishCompilation({
      type: 'COMPILE_PR_PDF',
      projectId: pr.projectId,
      pullRequestId: pr.id,
      branchName: (pr as any).section?.branchName || 'main',
      requesterId: authorId,
    });

    return pr;
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

  // Avaliação pelo Revisor (Aprovar ou Solicitar Ajustes)
  async reviewPR(
    prId: string,
    reviewerId: string,
    status: 'APPROVED' | 'CHANGES_REQUESTED',
    comment?: string,
    lineNumer?: number
  ) {
    const pr = await this.prRepository.findById(prId);
    if (!pr) throw new Error('PR_NOT_FOUND');

    const targetStatus = status === 'APPROVED' ? PRStatus.APPROVED : PRStatus.CHANGES_REQUESTED;

    // Se houver comentário, grava na tabela de comentários do PR
    if (comment && comment.trim() !== '') {
      await this.prRepository.addComment({
        pullRequestId: prId,
        userId: reviewerId,
        lineNumer,
        comment,
      });
    }

    const updatedPR = await this.prRepository.updateStatus(prId, targetStatus);

    // Registra na Timeline / AuditLog
    await logAudit({
      userId: reviewerId,
      action: `PR_${status}`,
      entityType: 'PullRequest',
      entityId: prId,
      details: { status: targetStatus, comment, lineNumer },
    });

    // Emite evento SSE para o Autor
    eventsManager.broadcastToUser(pr.authorId, 'PR_REVIEWED', {
      pullRequestId: prId,
      status: targetStatus,
      reviewerId,
    });

    return updatedPR;
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

  // Executar MERGE do PR com Trava de Segurança Estrita
  async mergePR(prId: string, requesterId: string) {
    const pr = await this.prRepository.findById(prId);
    if (!pr) throw new Error('PR_NOT_FOUND');

    // 🔒 TRAVA DE SEGURANÇA 1: O PR precisa ter sido aprovado pelo Revisor
    if (pr.status !== PRStatus.APPROVED) {
      throw new Error('PR_NOT_APPROVED_BY_REVIEWER');
    }

    // 🔒 TRAVA DE SEGURANÇA 2: O PR precisa ter parecer aprovado do NIT
    if (pr.nitStatus !== NITStatus.APPROVED_NIT) {
      throw new Error('NIT_NOT_APPROVED');
    }

    // Se aprovado em ambas as travas, executa o merge
    const mergedPR = await this.prRepository.updateStatus(prId, PRStatus.MERGED);

    // 1. Registra no AuditLog / Timeline
    await logAudit({
      userId: requesterId,
      action: 'PR_MERGED',
      entityType: 'PullRequest',
      entityId: prId,
      details: { mergedAt: mergedPR.mergedAt },
    });

    // 2. Dispara compilação do PDF Master oficial consolidado
    await latexProducer.publishCompilation({
      type: 'COMPILE_MASTER_PDF',
      projectId: pr.projectId,
      branchName: 'main',
      requesterId,
    });

    // 3. Emite notificação SSE de desblokueio de merge
    eventsManager.broadcastToUser(pr.authorId, 'MERGE_UNLOCKED', {
      pullRequestId: prId,
      projectId: pr.projectId,
      mergedAt: mergedPR.mergedAt,
    });

    return mergedPR;
  }
}
