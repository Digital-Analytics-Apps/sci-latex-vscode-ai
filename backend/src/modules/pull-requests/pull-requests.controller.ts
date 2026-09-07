import { FastifyRequest, FastifyReply } from 'fastify';
import { PullRequestsService } from './pull-requests.service';
import { z } from 'zod';
import { NITStatus } from '@prisma/client';

export class PullRequestsController {
  constructor(private prService: PullRequestsService) {}

  async create(request: FastifyRequest, reply: FastifyReply) {
    const authorId = request.user.sub;
    const bodySchema = z.object({
      title: z.string().min(3),
      description: z.string().optional().nullable(),
      sectionId: z.string().min(1),
      projectId: z.string().min(1),
      reviewerId: z.string().optional().nullable().or(z.literal('')),
    });

    const body = bodySchema.parse(request.body);
    const pr = await this.prService.createPR(authorId, body);
    return reply.status(201).send({ pullRequest: pr });
  }

  async list(request: FastifyRequest, reply: FastifyReply) {
    const querySchema = z.object({
      projectId: z.string().uuid().optional(),
    });

    const { projectId } = querySchema.parse(request.query);
    const prs = await this.prService.listPRs(projectId);
    return reply.send({ pullRequests: prs });
  }

  async getById(request: FastifyRequest, reply: FastifyReply) {
    const paramsSchema = z.object({
      id: z.string().uuid(),
    });

    const { id } = paramsSchema.parse(request.params);

    try {
      const pr = await this.prService.getPRById(id);
      return reply.send({ pullRequest: pr });
    } catch (err: any) {
      if (err.message === 'PR_NOT_FOUND') {
        return reply.status(404).send({ message: 'Pull Request not found' });
      }
      throw err;
    }
  }

  async review(request: FastifyRequest, reply: FastifyReply) {
    const paramsSchema = z.object({
      id: z.string().uuid(),
    });
    const bodySchema = z.object({
      status: z.enum(['APPROVED', 'CHANGES_REQUESTED']),
      comment: z.string().optional(),
      lineNumer: z.number().int().positive().optional(),
    });

    const { id } = paramsSchema.parse(request.params);
    const { status, comment, lineNumer } = bodySchema.parse(request.body);
    const reviewerId = request.user.sub;

    try {
      const pr = await this.prService.reviewPR(id, reviewerId, status, comment, lineNumer);
      return reply.send({ pullRequest: pr });
    } catch (err: any) {
      if (err.message === 'PR_NOT_FOUND') {
        return reply.status(404).send({ message: 'Pull Request not found' });
      }
      throw err;
    }
  }

  async updateNIT(request: FastifyRequest, reply: FastifyReply) {
    const paramsSchema = z.object({
      id: z.string().uuid(),
    });
    const bodySchema = z.object({
      nitStatus: z.enum(['WAITING_NIT', 'APPROVED_NIT', 'REJECTED_NIT']),
      nitNotes: z.string().optional(),
    });

    const { id } = paramsSchema.parse(request.params);
    const { nitStatus, nitNotes } = bodySchema.parse(request.body);
    const userId = request.user.sub;

    try {
      const pr = await this.prService.updateNITStatus(id, userId, nitStatus as NITStatus, nitNotes);
      return reply.send({ pullRequest: pr });
    } catch (err: any) {
      if (err.message === 'PR_NOT_FOUND') {
        return reply.status(404).send({ message: 'Pull Request not found' });
      }
      throw err;
    }
  }

  async assignReviewer(request: FastifyRequest, reply: FastifyReply) {
    const paramsSchema = z.object({
      id: z.string(),
    });
    const bodySchema = z.object({
      reviewerId: z.string().min(1),
    });

    const { id } = paramsSchema.parse(request.params);
    const { reviewerId } = bodySchema.parse(request.body);
    const assignerId = request.user.sub;

    try {
      const pr = await this.prService.assignReviewer(id, reviewerId, assignerId);
      return reply.send({ pullRequest: pr, message: 'Revisor atribuído com sucesso ao Pull Request.' });
    } catch (err: any) {
      if (err.message === 'PR_NOT_FOUND') {
        return reply.status(404).send({ message: 'Pull Request not found' });
      }
      throw err;
    }
  }

  async merge(request: FastifyRequest, reply: FastifyReply) {
    const paramsSchema = z.object({
      id: z.string().uuid(),
    });

    const { id } = paramsSchema.parse(request.params);
    const requesterId = request.user.sub;

    try {
      const pr = await this.prService.mergePR(id, requesterId);
      return reply.send({ pullRequest: pr, message: 'Merge realizado com sucesso!' });
    } catch (err: any) {
      if (err.message === 'PR_NOT_FOUND') {
        return reply.status(404).send({ message: 'Pull Request not found' });
      }
      if (err.message === 'PR_NOT_APPROVED_BY_REVIEWER') {
        return reply.status(400).send({
          statusCode: 400,
          error: 'Bad Request',
          message:
            'O Pull Request não pode ser mesclado pois ainda não foi aprovado pelo Revisor designado.',
        });
      }
      if (err.message === 'NIT_NOT_APPROVED') {
        return reply.status(400).send({
          statusCode: 400,
          error: 'Bad Request',
          message:
            'O Pull Request não pode ser mesclado pois pendente de aprovação do NIT (Núcleo de Inovação Tecnológica).',
        });
      }
      throw err;
    }
  }
}
