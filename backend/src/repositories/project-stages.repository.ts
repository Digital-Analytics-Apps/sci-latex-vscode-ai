import { ProjectStage, StageStatus } from '@prisma/client';
import { prisma } from '../db/prisma';

export interface CreateStageData {
  projectId: string;
  title: string;
  order: number;
  isGatekeeper?: boolean;
  gatekeeperType?: string;
  description?: string;
}

export interface UpdateStageData {
  title?: string;
  order?: number;
  status?: StageStatus;
  isGatekeeper?: boolean;
  gatekeeperType?: string;
  description?: string;
}

export interface IProjectStagesRepository {
  findByProjectId(projectId: string): Promise<ProjectStage[]>;
  findById(id: string): Promise<ProjectStage | null>;
  create(data: CreateStageData): Promise<ProjectStage>;
  update(id: string, data: UpdateStageData): Promise<ProjectStage>;
  delete(id: string): Promise<void>;
  autoCreateDefaultStages(projectId: string): Promise<ProjectStage[]>;
}

export const DEFAULT_STAGES = [
  { order: 1, title: 'Planejamento e Pesquisa', isGatekeeper: false },
  { order: 2, title: 'Desenvolvimento e Experimentos', isGatekeeper: false },
  { order: 3, title: 'Escrita da Versão Rascunho', isGatekeeper: false },
  { order: 4, title: 'Parecer do NIT (Gatekeeper 1)', isGatekeeper: true, gatekeeperType: 'NIT' },
  {
    order: 5,
    title: 'Submissão ao Congresso Alvo (Gatekeeper 2)',
    isGatekeeper: true,
    gatekeeperType: 'TARGET_CONFERENCE',
  },
];

export class PrismaProjectStagesRepository implements IProjectStagesRepository {
  async findByProjectId(projectId: string): Promise<ProjectStage[]> {
    const stages = await prisma.projectStage.findMany({
      where: { projectId },
      include: {
        tasks: {
          select: {
            id: true,
            title: true,
            status: true,
            assignedToId: true,
          },
        },
      },
      orderBy: { order: 'asc' },
    });

    if (stages.length === 0) {
      return this.autoCreateDefaultStages(projectId);
    }

    return stages;
  }

  async findById(id: string): Promise<ProjectStage | null> {
    return prisma.projectStage.findUnique({
      where: { id },
      include: {
        tasks: true,
        project: {
          include: {
            stages: true,
          },
        },
      },
    });
  }

  async create(data: CreateStageData): Promise<ProjectStage> {
    return prisma.projectStage.create({
      data: {
        projectId: data.projectId,
        title: data.title,
        order: data.order,
        isGatekeeper: data.isGatekeeper ?? false,
        gatekeeperType: data.gatekeeperType,
        description: data.description,
        status: StageStatus.NOT_STARTED,
      },
      include: {
        tasks: true,
      },
    });
  }

  async update(id: string, data: UpdateStageData): Promise<ProjectStage> {
    return prisma.projectStage.update({
      where: { id },
      data,
      include: {
        tasks: true,
      },
    });
  }

  async delete(id: string): Promise<void> {
    await prisma.projectStage.delete({
      where: { id },
    });
  }

  async autoCreateDefaultStages(projectId: string): Promise<ProjectStage[]> {
    const created: ProjectStage[] = [];
    for (const def of DEFAULT_STAGES) {
      const stage = await prisma.projectStage.upsert({
        where: {
          projectId_order: {
            projectId,
            order: def.order,
          },
        },
        update: {},
        create: {
          projectId,
          title: def.title,
          order: def.order,
          isGatekeeper: def.isGatekeeper,
          gatekeeperType: def.gatekeeperType,
          status: StageStatus.NOT_STARTED,
        },
        include: {
          tasks: true,
        },
      });
      created.push(stage);
    }
    return created;
  }
}
