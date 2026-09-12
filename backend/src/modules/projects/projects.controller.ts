import fs from 'fs/promises';
import path from 'path';
import { Role } from '@prisma/client';
import { FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { env } from '../../config/env';
import { ProjectsService } from './projects.service';

export const createProjectSchema = z.object({
  name: z.string().min(3),
  description: z.string().optional(),
  teamId: z.string().uuid().optional(),
  academicPeriodId: z.string().uuid().optional(),
  targetConferenceName: z.string().optional(),
  targetConferenceDate: z.coerce.date().optional(),
  backupConferenceName: z.string().optional(),
  backupConferenceDate: z.coerce.date().optional(),
  coAuthorIds: z.array(z.string()).optional(),
  reviewerId: z.string().optional(),
});

export const updateProjectSchema = z.object({
  name: z.string().min(3).optional(),
  description: z.string().optional(),
  targetConferenceName: z.string().optional(),
  targetConferenceDate: z.coerce.date().optional(),
  backupConferenceName: z.string().optional(),
  backupConferenceDate: z.coerce.date().optional(),
  doi: z.string().optional(),
  publicationUrl: z.string().url().optional(),
  datasetUrl: z.string().url().optional(),
  justification: z.string().optional(),
});

export const postSubmissionSchema = z.object({
  submissionStatus: z.enum([
    'IN_PROGRESS',
    'WAITING_NIT',
    'SUBMITTED_TARGET',
    'SUBMITTED_BACKUP',
    'ACCEPTED_REVISION_REQUESTED',
    'ACCEPTED_CAMERA_READY',
    'REJECTED_WAITING_DECISION',
    'REJECTED_REOPENED_V2',
    'COMPLETED_PUBLISHED',
  ]),
  doi: z.string().optional(),
  publicationUrl: z.string().optional(),
  datasetUrl: z.string().optional(),
  publishedAt: z.coerce.date().optional(),
  reviewerFeedback: z.string().optional(),
  decisionReason: z.string().optional(),
});

export class ProjectsController {
  constructor(private projectsService: ProjectsService) {}

  async create(request: FastifyRequest, reply: FastifyReply) {
    const userId = request.user.sub;
    const body = createProjectSchema.parse(request.body);

    try {
      const project = await this.projectsService.createProject(userId, body);
      return reply.status(201).send({ project });
    } catch (err: any) {
      if (err.message?.includes('GITHUB_TOKEN_REQUIRED')) {
        return reply.status(400).send({
          statusCode: 400,
          error: 'Bad Request',
          message:
            'A variável GITHUB_TOKEN não foi configurada nas variáveis de ambiente (.env ou docker-compose.yml). É necessário fornecer um Token do GitHub para criar o repositório remoto.',
        });
      }
      if (err.message?.includes('GITHUB_API_ERROR')) {
        return reply.status(502).send({
          statusCode: 502,
          error: 'Bad Gateway',
          message: `Falha na API do GitHub ao criar repositório remoto: ${err.message}`,
        });
      }
      throw err;
    }
  }

  async list(request: FastifyRequest, reply: FastifyReply) {
    const querySchema = z.object({
      teamId: z.string().uuid().optional(),
      academicPeriodId: z.string().uuid().optional(),
    });

    const { teamId, academicPeriodId } = querySchema.parse(request.query);
    const userId = request.user.sub;

    const projects = await this.projectsService.listProjects({
      teamId,
      academicPeriodId,
      userId,
    });

    return reply.send({ projects });
  }

  async getById(request: FastifyRequest, reply: FastifyReply) {
    const paramsSchema = z.object({
      id: z.string(),
    });

    const { id } = paramsSchema.parse(request.params);

    try {
      const project = await this.projectsService.getProjectById(id);
      return reply.send({ project });
    } catch (err: any) {
      if (err.message === 'PROJECT_NOT_FOUND') {
        return reply.status(404).send({ message: 'Project not found' });
      }
      throw err;
    }
  }

  async getProjectPDF(request: FastifyRequest, reply: FastifyReply) {
    const paramsSchema = z.object({
      id: z.string(),
    });

    const { id } = paramsSchema.parse(request.params);

    const projectDir = path.resolve(env.STORAGE_PATH, 'projects', id);
    const pdfPath = path.join(projectDir, 'main.pdf');

    try {
      const pdfBuffer = await fs.readFile(pdfPath);
      return reply.type('application/pdf').send(pdfBuffer);
    } catch {
      const mockPdfContent = `%PDF-1.4
1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj
2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj
3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >> endobj
4 0 obj << /Length 55 >> stream
BT /F1 18 Tf 50 700 Td (SCI-LaTeX Academic Paper PDF Preview) Tj ET
endstream endobj
5 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj
xref
0 6
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000261 00000 n 
0000000366 00000 n 
trailer << /Size 6 /Root 1 0 R >>
startxref
441
%%EOF`;
      return reply.type('application/pdf').send(Buffer.from(mockPdfContent));
    }
  }

  async update(request: FastifyRequest, reply: FastifyReply) {
    const paramsSchema = z.object({
      id: z.string().uuid(),
    });

    const { id } = paramsSchema.parse(request.params);
    const userId = request.user.sub;
    const body = updateProjectSchema.parse(request.body);

    try {
      const project = await this.projectsService.updateProject(id, userId, body);
      return reply.send({ project });
    } catch (err: any) {
      if (err.message === 'PROJECT_NOT_FOUND') {
        return reply.status(404).send({ message: 'Project not found' });
      }
      if (err.message === 'JUSTIFICATION_REQUIRED_FOR_DATE_CHANGE') {
        return reply.status(400).send({
          statusCode: 400,
          error: 'Bad Request',
          message: 'Uma justificativa é obrigatória para alterar as datas do artigo.',
        });
      }
      throw err;
    }
  }

  async delete(request: FastifyRequest, reply: FastifyReply) {
    const paramsSchema = z.object({
      id: z.string().uuid(),
    });

    const { id } = paramsSchema.parse(request.params);
    const userId = request.user.sub;

    try {
      await this.projectsService.deleteProject(id, userId);
      return reply.status(204).send();
    } catch (err: any) {
      if (err.message === 'PROJECT_NOT_FOUND') {
        return reply.status(404).send({ message: 'Project not found' });
      }
      throw err;
    }
  }

  async addMember(request: FastifyRequest, reply: FastifyReply) {
    const paramsSchema = z.object({
      id: z.string().uuid(),
    });
    const bodySchema = z.object({
      userId: z.string().uuid(),
      role: z.enum(['AUTHOR', 'REVIEWER', 'COORDINATOR']),
    });

    const { id } = paramsSchema.parse(request.params);
    const { userId, role } = bodySchema.parse(request.body);
    const requesterId = request.user.sub;

    try {
      await this.projectsService.addMember(id, userId, role as Role, requesterId);
      return reply.status(201).send({ message: 'Membro adicionado com sucesso.' });
    } catch (err: any) {
      if (err.message === 'PROJECT_NOT_FOUND') {
        return reply.status(404).send({ message: 'Project not found' });
      }
      if (err.message === 'PROJECT_ALREADY_HAS_REVIEWER') {
        return reply.status(400).send({
          statusCode: 400,
          error: 'Bad Request',
          message:
            'Este artigo já possui um revisor atribuído. É permitido apenas um revisor por artigo.',
        });
      }
      throw err;
    }
  }

  async removeMember(request: FastifyRequest, reply: FastifyReply) {
    const paramsSchema = z.object({
      id: z.string().uuid(),
      userId: z.string().uuid(),
    });

    const { id, userId } = paramsSchema.parse(request.params);
    const requesterId = request.user.sub;

    try {
      await this.projectsService.removeMember(id, userId, requesterId);
      return reply.status(200).send({ message: 'Membro removido com sucesso.' });
    } catch (err: any) {
      if (err.message === 'PROJECT_NOT_FOUND') {
        return reply.status(404).send({ message: 'Project not found' });
      }
      throw err;
    }
  }

  async getTimeline(request: FastifyRequest, reply: FastifyReply) {
    const paramsSchema = z.object({
      id: z.string().uuid(),
    });

    const { id } = paramsSchema.parse(request.params);

    try {
      const timeline = await this.projectsService.getTimeline(id);
      return reply.send({ timeline });
    } catch (err: any) {
      if (err.message === 'PROJECT_NOT_FOUND') {
        return reply.status(404).send({ message: 'Project not found' });
      }
      throw err;
    }
  }

  async updatePostSubmission(request: FastifyRequest, reply: FastifyReply) {
    const paramsSchema = z.object({
      id: z.string().uuid(),
    });

    const { id } = paramsSchema.parse(request.params);
    const userId = request.user.sub;
    const body = postSubmissionSchema.parse(request.body);

    try {
      const project = await this.projectsService.updatePostSubmission(id, userId, body);
      return reply.send({ project });
    } catch (err: any) {
      if (err.message === 'PROJECT_NOT_FOUND') {
        return reply.status(404).send({ message: 'Project not found' });
      }
      throw err;
    }
  }

  async commitTaskProgress(request: FastifyRequest, reply: FastifyReply) {
    const paramsSchema = z.object({
      id: z.string(),
      taskId: z.string(),
    });

    const bodySchema = z.object({
      commitMessage: z.string().optional(),
    });

    const { id, taskId } = paramsSchema.parse(request.params);
    const { commitMessage } = bodySchema.parse(request.body || {});
    const userId = request.user.sub;

    try {
      const result = await this.projectsService.commitTaskProgress(
        id,
        taskId,
        userId,
        commitMessage
      );
      return reply.send(result);
    } catch (err: any) {
      if (err.message === 'PROJECT_NOT_FOUND') {
        return reply.status(404).send({ message: 'Project not found' });
      }
      if (err.message?.includes('GITHUB_COMMIT_ERROR')) {
        return reply.status(502).send({
          statusCode: 502,
          error: 'Bad Gateway',
          message: `Falha ao efetuar commit no GitHub: ${err.message}`,
        });
      }
      throw err;
    }
  }
}
