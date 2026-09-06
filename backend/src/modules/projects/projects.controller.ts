import { FastifyRequest, FastifyReply } from 'fastify';
import { ProjectsService } from './projects.service';
import { z } from 'zod';

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
    const body = updateProjectSchema.parse(request.body);

    try {
      const project = await this.projectsService.updateProject(id, body);
      return reply.send({ project });
    } catch (err: any) {
      if (err.message === 'PROJECT_NOT_FOUND') {
        return reply.status(404).send({ message: 'Project not found' });
      }
      throw err;
    }
  }
}
