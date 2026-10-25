import { ProjectStage, StageStatus } from '@prisma/client';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  CreateStageData,
  DEFAULT_STAGES,
  IProjectStagesRepository,
  UpdateStageData,
} from '../../../repositories/project-stages.repository';
import { ProjectStagesService } from '../project-stages.service';

class InMemoryProjectStagesRepository implements IProjectStagesRepository {
  public stages: ProjectStage[] = [];

  async findByProjectId(projectId: string): Promise<ProjectStage[]> {
    const projectStages = this.stages
      .filter((s) => s.projectId === projectId)
      .sort((a, b) => a.order - b.order);

    if (projectStages.length === 0) {
      return this.autoCreateDefaultStages(projectId);
    }

    return projectStages;
  }

  async findById(id: string): Promise<ProjectStage | null> {
    return this.stages.find((s) => s.id === id) ?? null;
  }

  async create(data: CreateStageData): Promise<ProjectStage> {
    const stage: ProjectStage = {
      id: `stage-${Date.now()}-${Math.random()}`,
      projectId: data.projectId,
      title: data.title,
      description: data.description ?? null,
      order: data.order,
      status: StageStatus.NOT_STARTED,
      isGatekeeper: data.isGatekeeper ?? false,
      gatekeeperType: data.gatekeeperType ?? null,
      plannedStartAt: data.plannedStartAt ? new Date(data.plannedStartAt) : null,
      plannedEndAt: data.plannedEndAt ? new Date(data.plannedEndAt) : null,
      plannedCompletionDate: data.plannedCompletionDate
        ? new Date(data.plannedCompletionDate)
        : null,
      startedAt: data.startedAt ? new Date(data.startedAt) : null,
      completedAt: data.completedAt ? new Date(data.completedAt) : null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.stages.push(stage);
    return stage;
  }

  async update(id: string, data: UpdateStageData): Promise<ProjectStage> {
    const index = this.stages.findIndex((s) => s.id === id);
    if (index === -1) throw new Error('STAGE_NOT_FOUND');

    const current = this.stages[index];
    const updated: ProjectStage = {
      ...current,
      ...data,
      plannedStartAt:
        data.plannedStartAt !== undefined
          ? data.plannedStartAt
            ? new Date(data.plannedStartAt)
            : null
          : current.plannedStartAt,
      plannedEndAt:
        data.plannedEndAt !== undefined
          ? data.plannedEndAt
            ? new Date(data.plannedEndAt)
            : null
          : current.plannedEndAt,
      plannedCompletionDate:
        data.plannedCompletionDate !== undefined
          ? data.plannedCompletionDate
            ? new Date(data.plannedCompletionDate)
            : null
          : current.plannedCompletionDate,
      startedAt:
        data.startedAt !== undefined
          ? data.startedAt
            ? new Date(data.startedAt)
            : null
          : current.startedAt,
      completedAt:
        data.completedAt !== undefined
          ? data.completedAt
            ? new Date(data.completedAt)
            : null
          : current.completedAt,
      updatedAt: new Date(),
    };
    this.stages[index] = updated;
    return updated;
  }

  async delete(id: string): Promise<void> {
    this.stages = this.stages.filter((s) => s.id !== id);
  }

  async autoCreateDefaultStages(projectId: string): Promise<ProjectStage[]> {
    const created: ProjectStage[] = [];
    for (const def of DEFAULT_STAGES) {
      const stage: ProjectStage = {
        id: `stage-${projectId}-${def.order}`,
        projectId,
        title: def.title,
        description: null,
        order: def.order,
        status: StageStatus.NOT_STARTED,
        isGatekeeper: def.isGatekeeper,
        gatekeeperType: def.gatekeeperType ?? null,
        plannedStartAt: null,
        plannedEndAt: null,
        plannedCompletionDate: null,
        startedAt: null,
        completedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      this.stages.push(stage);
      created.push(stage);
    }
    return created;
  }

  async reorderStages(
    projectId: string,
    stageOrders: { id: string; order: number }[]
  ): Promise<ProjectStage[]> {
    for (const item of stageOrders) {
      const stage = this.stages.find((s) => s.id === item.id);
      if (stage) {
        stage.order = item.order;
        stage.updatedAt = new Date();
      }
    }
    return this.findByProjectId(projectId);
  }
}

describe('ProjectStagesService', () => {
  let repository: InMemoryProjectStagesRepository;
  let service: ProjectStagesService;

  beforeEach(() => {
    repository = new InMemoryProjectStagesRepository();
    service = new ProjectStagesService(repository);
  });

  it('should list stages and auto-create default 6 stages if none exist', async () => {
    const stages = await service.listStages('proj-1');
    expect(stages).toHaveLength(6);
    expect(stages[0].title).toBe('Planejamento e Pesquisa');
    expect(stages[3].title).toBe('Revisão Técnica e Científica');
    expect(stages[4].isGatekeeper).toBe(true);
    expect(stages[4].title).toContain('NIT');
    expect(stages[5].isGatekeeper).toBe(true);
    expect(stages[5].title).toContain('Congresso');
  });

  it('should create a custom writing stage', async () => {
    await service.listStages('proj-1');
    const newStage = await service.createStage('proj-1', {
      title: 'Revisão Sistemática da Literatura',
    });

    expect(newStage).toBeDefined();
    expect(newStage.title).toBe('Revisão Sistemática da Literatura');
    expect(newStage.isGatekeeper).toBe(false);

    const all = await service.listStages('proj-1');
    expect(all).toHaveLength(7);
  });

  it('should block NIT Gatekeeper stage activation when writing stages or review are NOT completed', async () => {
    const stages = await service.listStages('proj-1');
    const nitStage = stages.find((s) => s.order === 5)!;

    await expect(
      service.updateStage('proj-1', nitStage.id, { status: StageStatus.IN_PROGRESS })
    ).rejects.toThrow(
      'Não é possível liberar a etapa do NIT enquanto a etapa de Revisão Técnica ou etapas anteriores estiverem pendentes.'
    );
  });

  it('should allow NIT Gatekeeper stage activation when all writing stages and review are completed', async () => {
    const stages = await service.listStages('proj-1');
    const priorStages = stages.filter((s) => s.order < 5);

    for (const s of priorStages) {
      await service.updateStage('proj-1', s.id, { status: StageStatus.COMPLETED });
    }

    const nitStage = stages.find((s) => s.order === 5)!;
    const updatedNit = await service.updateStage('proj-1', nitStage.id, {
      status: StageStatus.IN_PROGRESS,
    });

    expect(updatedNit.status).toBe(StageStatus.IN_PROGRESS);
  });

  it('should block Target Conference Gatekeeper stage when NIT is NOT completed', async () => {
    const stages = await service.listStages('proj-1');
    const conferenceStage = stages.find((s) => s.order === 6)!;

    await expect(
      service.updateStage('proj-1', conferenceStage.id, { status: StageStatus.COMPLETED })
    ).rejects.toThrow('Não é possível submeter ao congresso alvo sem o Parecer Favorável do NIT.');
  });

  it('should allow Target Conference Gatekeeper stage when NIT is completed', async () => {
    const stages = await service.listStages('proj-1');
    const priorStages = stages.filter((s) => s.order < 6);

    for (const s of priorStages) {
      await service.updateStage('proj-1', s.id, { status: StageStatus.COMPLETED });
    }

    const conferenceStage = stages.find((s) => s.order === 6)!;
    const updatedConf = await service.updateStage('proj-1', conferenceStage.id, {
      status: StageStatus.COMPLETED,
    });

    expect(updatedConf.status).toBe(StageStatus.COMPLETED);
  });

  it('should prevent deleting any stage due to fixed stages rule (ADR-008)', async () => {
    const stages = await service.listStages('proj-1');
    await expect(service.deleteStage('proj-1', stages[0].id)).rejects.toThrow(
      'FIXED_STAGES: As etapas do projeto são padronizadas e fixas (1 a 6) e não podem ser excluídas.'
    );
  });
});
