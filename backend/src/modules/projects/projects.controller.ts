import { FastifyRequest, FastifyReply } from 'fastify';
import { ProjectsService } from './projects.service';
import { z } from 'zod';
import { Role } from '@prisma/client';

export const createProjectSchema = z.object({
  name: z.string().min(3),
  description: z.string().optional(),
  teamId: z.string().uuid(),
  academicPeriodId: z.string().uuid().optional(),
  targetConferenceName: z.string().optional(),
  targetConferenceDate: z.coerce.date().optional(),
  backupConferenceName: z.string().optional(),
  backupConferenceDate: z.coerce.date().optional(),
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

export class ProjectsController {
  constructor(private projectsService: ProjectsService) {}

  async create(request: FastifyRequest, reply: FastifyReply) {
    const userId = request.user.sub;
    const body = createProjectSchema.parse(request.body);

    const project = await this.projectsService.createProject(userId, body);
    return reply.status(201).send({ project });
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
      id: z.string().uuid(),
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
}
