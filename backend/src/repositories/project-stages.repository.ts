import { ProjectStage, StageStatus } from '@prisma/client';
import { prisma } from '../db/prisma';

export interface CreateStageData {
  projectId: string;
  title: string;
  order: number;
  isGatekeeper?: boolean;
  gatekeeperType?: string;
  description?: string;
  plannedStartAt?: Date | string;
  plannedEndAt?: Date | string;
  plannedCompletionDate?: Date | string;
  startedAt?: Date | string;
  completedAt?: Date | string;
}

export interface UpdateStageData {
  title?: string;
  order?: number;
  status?: StageStatus;
  isGatekeeper?: boolean;
  gatekeeperType?: string;
  description?: string;
  plannedStartAt?: Date | string | null;
  plannedEndAt?: Date | string | null;
  plannedCompletionDate?: Date | string | null;
  startedAt?: Date | string | null;
  completedAt?: Date | string | null;
}

export interface IProjectStagesRepository {
  findByProjectId(projectId: string): Promise<ProjectStage[]>;
  findById(id: string): Promise<(ProjectStage & { tasks?: any[] }) | null>;
  create(data: CreateStageData): Promise<ProjectStage>;
  update(id: string, data: UpdateStageData): Promise<ProjectStage>;
  delete(id: string): Promise<void>;
  autoCreateDefaultStages(projectId: string): Promise<ProjectStage[]>;
  reorderStages(
    projectId: string,
    stageOrders: { id: string; order: number }[]
  ): Promise<ProjectStage[]>;
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
          include: {
            assignee: true,
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
    const endDate = data.plannedEndAt || data.plannedCompletionDate;
    return prisma.projectStage.create({
      data: {
        projectId: data.projectId,
        title: data.title,
        order: data.order,
        isGatekeeper: data.isGatekeeper ?? false,
        gatekeeperType: data.gatekeeperType,
        description: data.description,
        plannedStartAt: data.plannedStartAt ? new Date(data.plannedStartAt) : undefined,
        plannedEndAt: endDate ? new Date(endDate) : undefined,
        plannedCompletionDate: endDate ? new Date(endDate) : undefined,
        startedAt: data.startedAt ? new Date(data.startedAt) : undefined,
        completedAt: data.completedAt ? new Date(data.completedAt) : undefined,
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

  async reorderStages(
    projectId: string,
    stageOrders: { id: string; order: number }[]
  ): Promise<ProjectStage[]> {
    return prisma.$transaction(async (tx) => {
      // Passo 1: Atribui ordem negativa temporária para evitar colisões com unique index @@unique([projectId, order])
      for (const item of stageOrders) {
        await tx.projectStage.update({
          where: { id: item.id },
          data: { order: -(item.order + 1000) },
        });
      }

      // Passo 2: Aplica as ordens positivas finais
      for (const item of stageOrders) {
        await tx.projectStage.update({
          where: { id: item.id },
          data: { order: item.order },
        });
      }

      return tx.projectStage.findMany({
        where: { projectId },
        include: {
          tasks: {
            include: {
              assignee: true,
            },
          },
        },
        orderBy: { order: 'asc' },
      });
    });
  }
}
