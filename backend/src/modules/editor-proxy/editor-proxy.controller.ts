import { FastifyReply, FastifyRequest } from 'fastify';
import { EditorProxyService, editorProxyService } from './editor-proxy.service';

export class EditorProxyController {
  constructor(private readonly service: EditorProxyService = editorProxyService) {}

  async handleProxy(request: FastifyRequest, reply: FastifyReply) {
    const { projectId } = request.params as { projectId: string };
    const { taskId, branchName, mode } = request.query as {
      taskId?: string;
      branchName?: string;
      mode?: string;
    };
    const userId = (request.user as any)?.sub || 'user';
    const token =
      (request.query as any)?.token || request.headers.authorization?.replace('Bearer ', '');

    try {
      const session = await this.service.prepareWorkspaceSession({
        projectId,
        userId,
        taskId,
        branchName,
        mode,
        token,
      });

      if (session.isCodeServerUp && session.redirectUrl) {
        return reply.redirect(session.redirectUrl);
      }

      return reply.status(503).send({
        statusCode: 503,
        error: 'Service Unavailable',
        message: 'O Pod da workspace ainda está em fase de inicialização no Kubernetes.',
      });
    } catch (err: any) {
      if (err.message === 'PROJECT_NOT_FOUND') {
        return reply.status(404).send({
          statusCode: 404,
          error: 'Not Found',
          message: 'Projeto acadêmico não encontrado.',
        });
      }

      if (err.message?.includes('TASK_WORKSPACE_OCCUPIED')) {
        return reply.status(409).send({
          statusCode: 409,
          error: 'Conflict',
          message: err.message.replace('TASK_WORKSPACE_OCCUPIED: ', ''),
        });
      }

      return reply.status(500).send({
        statusCode: 500,
        error: 'Internal Server Error',
        message: err.message || 'Erro ao inicializar workspace.',
      });
    }
  }
}
