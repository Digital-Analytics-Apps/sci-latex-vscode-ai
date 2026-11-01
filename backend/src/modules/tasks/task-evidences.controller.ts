import { FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { TaskEvidencesService } from './task-evidences.service';

export const evidenceParamsSchema = z.object({
  projectId: z.string().min(1),
  taskId: z.string().min(1),
});

export const evidenceItemParamsSchema = z.object({
  projectId: z.string().min(1),
  taskId: z.string().min(1),
  evidenceId: z.string().min(1),
});

export const presignUploadBodySchema = z.object({
  fileName: z.string().min(1),
  mimeType: z.string().min(1),
  sizeBytes: z.number().int().positive(),
  type: z.enum(['IMAGE', 'PDF']),
  title: z.string().optional(),
});

export const addLinkEvidenceBodySchema = z.object({
  title: z.string().min(1),
  url: z.string().url(),
});

type SerializedEvidence<T extends { sizeBytes?: bigint | null }> = Omit<T, 'sizeBytes'> & {
  sizeBytes: number | null;
};

function serializeEvidence<T extends { sizeBytes?: bigint | null }>(ev: T): SerializedEvidence<T> {
  return {
    ...ev,
    sizeBytes: ev.sizeBytes !== null && ev.sizeBytes !== undefined ? Number(ev.sizeBytes) : null,
  };
}

export class TaskEvidencesController {
  constructor(private readonly service: TaskEvidencesService = new TaskEvidencesService()) {}

  /**
   * POST /projects/:projectId/tasks/:taskId/evidences/presign
   * Valida autorização e metadados do arquivo, gerando uma URL pré-assinada para upload direto ao MinIO.
   */
  async presign(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { projectId, taskId } = evidenceParamsSchema.parse(request.params);
      const body = presignUploadBodySchema.parse(request.body);
      const userId = request.user.sub;

      const result = await this.service.presignUpload(projectId, taskId, userId, body);
      return reply.status(200).send(result);
    } catch (err: unknown) {
      const error = err as Error;
      console.error('❌ TaskEvidencesController.presign error:', error);
      return reply.status(400).send({ error: 'PRESIGN_FAILED', message: error.message });
    }
  }

  /**
   * POST /projects/:projectId/tasks/:taskId/evidences/:evidenceId/confirm
   * Confirma a recepção do arquivo no MinIO e promove o status da evidência para 'CONFIRMED'.
   */
  async confirm(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { projectId, taskId, evidenceId } = evidenceItemParamsSchema.parse(request.params);

      const confirmed = await this.service.confirmUpload(projectId, taskId, evidenceId);
      return reply.status(200).send(serializeEvidence(confirmed));
    } catch (err: unknown) {
      const error = err as Error;
      console.error('❌ TaskEvidencesController.confirm error:', error);
      return reply.status(400).send({ error: 'CONFIRM_FAILED', message: error.message });
    }
  }

  /**
   * POST /projects/:projectId/tasks/:taskId/evidences/link
   * Registra um link externo como evidência para tarefas de planejamento ou desenvolvimento experimental.
   */
  async addLink(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { projectId, taskId } = evidenceParamsSchema.parse(request.params);
      const body = addLinkEvidenceBodySchema.parse(request.body);
      const userId = request.user.sub;

      const evidence = await this.service.addLink(projectId, taskId, userId, body);
      return reply.status(201).send(serializeEvidence(evidence));
    } catch (err: unknown) {
      const error = err as Error;
      console.error('❌ TaskEvidencesController.addLink error:', error);
      return reply.status(400).send({ error: 'ADD_LINK_FAILED', message: error.message });
    }
  }

  /**
   * GET /projects/:projectId/tasks/:taskId/evidences
   * Retorna a lista de evidências ativas da tarefa com URLs pré-assinadas para visualização segura.
   */
  async list(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { projectId, taskId } = evidenceParamsSchema.parse(request.params);

      const evidences = await this.service.listEvidences(projectId, taskId);
      return reply.status(200).send({
        evidences: evidences.map(serializeEvidence),
      });
    } catch (err: unknown) {
      const error = err as Error;
      return reply.status(400).send({ error: 'LIST_EVIDENCES_FAILED', message: error.message });
    }
  }

  /**
   * DELETE /projects/:projectId/tasks/:taskId/evidences/:evidenceId
   * Exclui a evidência do banco relacional e remove o binário armazenado no MinIO.
   */
  async delete(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { projectId, taskId, evidenceId } = evidenceItemParamsSchema.parse(request.params);

      await this.service.deleteEvidence(projectId, taskId, evidenceId);
      return reply.status(200).send({ message: 'Evidência excluída com sucesso' });
    } catch (err: unknown) {
      const error = err as Error;
      return reply.status(400).send({ error: 'DELETE_EVIDENCE_FAILED', message: error.message });
    }
  }
}
