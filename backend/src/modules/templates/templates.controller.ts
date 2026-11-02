import { FastifyReply, FastifyRequest } from 'fastify';
import { TemplatesService } from './templates.service';

export class TemplatesController {
  constructor(private readonly templatesService: TemplatesService = new TemplatesService()) {}

  async list(request: FastifyRequest, reply: FastifyReply) {
    const userId = request.user?.sub;
    const templates = await this.templatesService.listTemplates(userId);
    return reply.status(200).send({ templates });
  }

  async getById(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    const { id } = request.params;
    const template = await this.templatesService.getTemplateById(id);
    if (!template) {
      return reply
        .status(404)
        .send({ error: 'TEMPLATE_NOT_FOUND', message: 'Template não encontrado.' });
    }
    return reply.status(200).send({ template });
  }

  async upload(request: FastifyRequest, reply: FastifyReply) {
    const userId = request.user.sub;
    const data = await request.file();

    if (!data) {
      return reply.status(400).send({
        error: 'NO_FILE_UPLOADED',
        message: 'Nenhum arquivo ZIP enviado no formulário multipart.',
      });
    }

    const isZip =
      data.filename.toLowerCase().endsWith('.zip') ||
      data.mimetype === 'application/zip' ||
      data.mimetype === 'application/x-zip-compressed';

    if (!isZip) {
      return reply.status(400).send({
        error: 'INVALID_FILE_TYPE',
        message: 'O arquivo enviado deve possuir a extensão .zip',
      });
    }

    const buffer = await data.toBuffer();
    const fields = data.fields as Record<string, { value?: string } | undefined>;

    const name = fields.name?.value || data.filename.replace(/\.zip$/i, '');
    const description = fields.description?.value;
    const targetConference = fields.targetConference?.value;

    try {
      const template = await this.templatesService.uploadCustomTemplate(userId, {
        name,
        description,
        targetConference,
        zipBuffer: buffer,
      });

      return reply.status(201).send({ template });
    } catch (err: unknown) {
      const error = err as Error;
      return reply.status(400).send({
        error: 'TEMPLATE_PROCESSING_FAILED',
        message: error.message || 'Falha ao processar e extrair o template ZIP.',
      });
    }
  }
}
