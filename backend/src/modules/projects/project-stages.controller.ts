import { FastifyReply, FastifyRequest } from 'fastify';
import { StageStatus } from '@prisma/client';
import { z } from 'zod';
import { ProjectStagesService } from './project-stages.service';

export const projectParamsSchema = z.object({
  projectId: z.string().min(1),
});

export const stageParamsSchema = z.object({
  projectId: z.string().min(1),
  stageId: z.string().min(1),
});

export const createStageSchema = z.object({
  title: z.string().min(2),
  description: z.string().optional(),
  order: z.number().optional(),
});

export const updateStageSchema = z.object({
  title: z.string().optional(),
  description: z.string().optional(),
  order: z.number().optional(),
  status: z.nativeEnum(StageStatus).optional().default(StageStatus.NOT_STARTED),
});

export class ProjectStagesController {
  constructor(private readonly stagesService: ProjectStagesService) {}

  async list(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { projectId } = projectParamsSchema.parse(request.params);
      const stages = await this.stagesService.listStages(projectId);
      return reply.send(stages);
    } catch (error: any) {
      return reply.status(400).send({ message: error.message });
    }
  }

  async create(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { projectId } = projectParamsSchema.parse(request.params);
      const body = createStageSchema.parse(request.body);
      const stage = await this.stagesService.createStage(projectId, body);
      return reply.status(201).send(stage);
    } catch (error: any) {
      return reply.status(400).send({ message: error.message });
    }
  }

  async update(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { projectId, stageId } = stageParamsSchema.parse(request.params);
      const body = updateStageSchema.parse(request.body);
      const stage = await this.stagesService.updateStage(projectId, stageId, body);
      return reply.send(stage);
    } catch (error: any) {
      return reply.status(400).send({ message: error.message });
    }
  }

  async delete(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { projectId, stageId } = stageParamsSchema.parse(request.params);
      await this.stagesService.deleteStage(projectId, stageId);
      return reply.status(204).send();
    } catch (error: any) {
      return reply.status(400).send({ message: error.message });
    }
  }
}
