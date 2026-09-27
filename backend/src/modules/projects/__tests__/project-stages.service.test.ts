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
      plannedCompletionDate: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.stages.push(stage);
    return stage;
  }

  async update(id: string, data: UpdateStageData): Promise<ProjectStage> {
    const index = this.stages.findIndex((s) => s.id === id);
    if (index === -1) throw new Error('STAGE_NOT_FOUND');

    const updated = {
      ...this.stages[index],
      ...data,
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
        plannedCompletionDate: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      this.stages.push(stage);
      created.push(stage);
    }
    return created;
  }
}

describe('ProjectStagesService', () => {
  let repository: InMemoryProjectStagesRepository;
  let service: ProjectStagesService;

  beforeEach(() => {
    repository = new InMemoryProjectStagesRepository();
    service = new ProjectStagesService(repository);
  });

  it('should list stages and auto-create default 5 stages if none exist', async () => {
    const stages = await service.listStages('proj-1');
    expect(stages).toHaveLength(5);
    expect(stages[0].title).toBe('Planejamento e Pesquisa');
    expect(stages[3].isGatekeeper).toBe(true);
    expect(stages[3].title).toContain('NIT');
    expect(stages[4].isGatekeeper).toBe(true);
    expect(stages[4].title).toContain('Congresso');
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
    expect(all).toHaveLength(6);
  });

  it('should block NIT Gatekeeper stage activation when writing stages are NOT completed', async () => {
    const stages = await service.listStages('proj-1');
    const nitStage = stages.find((s) => s.order === 4)!;

    await expect(
      service.updateStage('proj-1', nitStage.id, { status: StageStatus.IN_PROGRESS })
    ).rejects.toThrow(
      'Não é possível liberar a etapa do NIT enquanto houver etapas de escrita pendentes.'
    );
  });

  it('should allow NIT Gatekeeper stage activation when all writing stages are completed', async () => {
    const stages = await service.listStages('proj-1');
    const writingStages = stages.filter((s) => !s.isGatekeeper);

    for (const s of writingStages) {
      await service.updateStage('proj-1', s.id, { status: StageStatus.COMPLETED });
    }

    const nitStage = stages.find((s) => s.order === 4)!;
    const updatedNit = await service.updateStage('proj-1', nitStage.id, {
      status: StageStatus.IN_PROGRESS,
    });

    expect(updatedNit.status).toBe(StageStatus.IN_PROGRESS);
  });

  it('should block Target Conference Gatekeeper stage when NIT is NOT completed', async () => {
    const stages = await service.listStages('proj-1');
    const conferenceStage = stages.find((s) => s.order === 5)!;

    await expect(
      service.updateStage('proj-1', conferenceStage.id, { status: StageStatus.COMPLETED })
    ).rejects.toThrow('Não é possível submeter ao congresso alvo sem o Parecer Favorável do NIT.');
  });

  it('should allow Target Conference Gatekeeper stage when NIT is completed', async () => {
    const stages = await service.listStages('proj-1');
    const writingStages = stages.filter((s) => !s.isGatekeeper);

    for (const s of writingStages) {
      await service.updateStage('proj-1', s.id, { status: StageStatus.COMPLETED });
    }

    const nitStage = stages.find((s) => s.order === 4)!;
    await service.updateStage('proj-1', nitStage.id, { status: StageStatus.COMPLETED });

    const conferenceStage = stages.find((s) => s.order === 5)!;
    const updatedConf = await service.updateStage('proj-1', conferenceStage.id, {
      status: StageStatus.COMPLETED,
    });

    expect(updatedConf.status).toBe(StageStatus.COMPLETED);
  });

  it('should delete a custom stage but prevent deleting gatekeeper stages', async () => {
    await service.listStages('proj-1');
    const custom = await service.createStage('proj-1', { title: 'Análise Qualitativa Extra' });

    await service.deleteStage('proj-1', custom.id);
    const stagesAfterDelete = await service.listStages('proj-1');
    expect(stagesAfterDelete.find((s) => s.id === custom.id)).toBeUndefined();

    const nitStage = stagesAfterDelete.find((s) => s.order === 4)!;
    await expect(service.deleteStage('proj-1', nitStage.id)).rejects.toThrow(
      'Não é possível excluir etapas de Gatekeeper obrigatórias'
    );
  });
});
