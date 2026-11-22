import { FastifyReply, FastifyRequest } from 'fastify';
import { TemplatesService } from './templates.service';

export class TemplatesController {
  constructor(private readonly templatesService: TemplatesService = new TemplatesService()) {}

  async list(request: FastifyRequest, reply: FastifyReply) {
    try {
      const templates = await this.templatesService.listTemplates();
      return reply.status(200).send({ templates });
    } catch (err: unknown) {
      const error = err as Error;
      request.log.error(err, '[TemplatesController.list] Erro ao listar templates');
      return reply.status(500).send({
        error: 'TEMPLATES_LIST_FAILED',
        message: error.message || 'Falha ao listar templates LaTeX.',
      });
    }
  }

  async getById(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    const { id } = request.params;
    try {
      const template = await this.templatesService.getTemplateById(id);
      if (!template) {
        return reply
          .status(404)
          .send({ error: 'TEMPLATE_NOT_FOUND', message: 'Template não encontrado.' });
      }
      return reply.status(200).send({ template });
    } catch (err: unknown) {
      const error = err as Error;
      request.log.error(err, '[TemplatesController.getById] Erro');
      return reply.status(500).send({
        error: 'TEMPLATE_FETCH_FAILED',
        message: error.message || 'Falha ao buscar detalhes do template.',
      });
    }
  }

  async download(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    const { id } = request.params;
    try {
      const result = await this.templatesService.getTemplateDownloadUrl(id);
      return reply.status(200).send(result);
    } catch (err: unknown) {
      const error = err as Error;
      return reply.status(404).send({
        error: 'TEMPLATE_DOWNLOAD_FAILED',
        message: error.message || 'Falha ao gerar link de download do template.',
      });
    }
  }

  async upload(request: FastifyRequest, reply: FastifyReply) {
    const userId = request.user?.sub;

    let fileBuffer: Buffer | null = null;
    let filename = '';
    let mimetype = '';
    const fields: Record<string, string> = {};

    try {
      for await (const part of request.parts()) {
        if (part.type === 'file') {
          filename = part.filename;
          mimetype = part.mimetype;
          fileBuffer = await part.toBuffer();
        } else {
          fields[part.fieldname] = (part.value as string) ?? '';
        }
      }
    } catch (err: unknown) {
      request.log.error(err, '[TemplatesController.upload] Erro ao processar multipart');
      return reply.status(400).send({
        error: 'MULTIPART_PARSING_ERROR',
        message: 'Falha ao ler dados multipart do formulário.',
      });
    }

    if (!fileBuffer || !filename) {
      return reply.status(400).send({
        error: 'NO_FILE_UPLOADED',
        message: 'Nenhum arquivo ZIP enviado no formulário multipart.',
      });
    }

    const isZip =
      filename.toLowerCase().endsWith('.zip') ||
      mimetype === 'application/zip' ||
      mimetype === 'application/x-zip-compressed';

    if (!isZip) {
      return reply.status(400).send({
        error: 'INVALID_FILE_TYPE',
        message: 'O arquivo enviado deve possuir a extensão .zip',
      });
    }

    const publisher =
      fields.publisher?.trim() ||
      fields.targetConference?.trim() ||
      filename.replace(/\.zip$/i, '').split(/[-_]/)[0] ||
      'OFICIAL';

    const templateType = fields.templateType?.trim() || 'artigo';
    const name = fields.name?.trim();
    const description = fields.description?.trim();

    if (!name) {
      return reply.status(400).send({
        error: 'NAME_REQUIRED',
        message: 'O nome de exibição do template é obrigatório.',
      });
    }

    try {
      const template = await this.templatesService.uploadTemplate(userId, {
        name,
        description,
        publisher,
        templateType,
        originalFileName: filename,
        zipBuffer: fileBuffer,
      });

      return reply.status(201).send({ template });
    } catch (err: unknown) {
      const error = err as Error;
      request.log.error(err, '[TemplatesController.upload] Falha ao processar template');
      return reply.status(400).send({
        error: 'TEMPLATE_PROCESSING_FAILED',
        message: error.message || 'Falha ao processar e salvar o template LaTeX.',
      });
    }
  }

  async delete(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    const { id } = request.params;
    try {
      await this.templatesService.deleteTemplate(id);
      return reply.status(200).send({ message: `Template "${id}" excluído com sucesso.` });
    } catch (err: unknown) {
      const error = err as Error;
      return reply.status(400).send({
        error: 'TEMPLATE_DELETION_FAILED',
        message: error.message || 'Falha ao excluir o template.',
      });
    }
  }
}
