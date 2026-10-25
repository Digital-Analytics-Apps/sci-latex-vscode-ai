import { Project, Role, SubmissionStatus } from '@prisma/client';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  CreateProjectData,
  IProjectsRepository,
  ProjectFilterOptions,
  UpdateProjectData,
} from '../../../repositories/projects.repository';
import { IProjectStagesRepository } from '../../../repositories/project-stages.repository';
import { ProjectsService } from '../projects.service';

class InMemoryProjectsRepository implements IProjectsRepository {
  public projects: (Project & { members?: any[]; deletedAt?: Date | null })[] = [];

  async create(data: CreateProjectData): Promise<Project> {
    const project: Project & { members?: any[]; deletedAt?: Date | null } = {
      id: data.id ?? `proj-${Date.now()}-${Math.random()}`,
      name: data.name,
      description: data.description ?? null,
      coordinatorId: data.coordinatorId,
      managerId: data.managerId,
      academicPeriodId: data.academicPeriodId ?? null,
      submissionStatus: SubmissionStatus.IN_PROGRESS,
      currentVersion: 1,
      ownerGeneration: 0,
      targetConferenceName: data.targetConferenceName ?? null,
      targetConferenceDate: data.targetConferenceDate ?? null,
      backupConferenceName: data.backupConferenceName ?? null,
      backupConferenceDate: data.backupConferenceDate ?? null,
      doi: null,
      publicationUrl: null,
      datasetUrl: null,
      publishedAt: null,
      reviewerFeedback: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
      members: [{ userId: data.creatorId, role: Role.AUTHOR }],
    };
    this.projects.push(project);
    return project;
  }

  async findById(id: string): Promise<Project | null> {
    return this.projects.find((p) => p.id === id && !p.deletedAt) ?? null;
  }

  async findAll(filters?: ProjectFilterOptions): Promise<Project[]> {
    return this.projects.filter((p) => {
      if (p.deletedAt) return false;
      if (filters?.coordinatorId && p.coordinatorId !== filters.coordinatorId) return false;
      if (filters?.managerId && p.managerId !== filters.managerId) return false;
      if (filters?.academicPeriodId && p.academicPeriodId !== filters.academicPeriodId)
        return false;
      return true;
    });
  }

  async update(id: string, data: UpdateProjectData): Promise<Project> {
    const index = this.projects.findIndex((p) => p.id === id && !p.deletedAt);
    if (index === -1) throw new Error('PROJECT_NOT_FOUND');

    const updated = {
      ...this.projects[index],
      ...data,
      updatedAt: new Date(),
    };
    this.projects[index] = updated;
    return updated;
  }

  async addMember(projectId: string, userId: string, role: Role): Promise<void> {
    const proj = this.projects.find((p) => p.id === projectId && !p.deletedAt);
    if (proj) {
      if (!proj.members) proj.members = [];
      const existing = proj.members.find((m) => m.userId === userId);
      if (existing) {
        existing.role = role;
      } else {
        proj.members.push({ userId, role });
      }
    }
  }

  async removeMember(projectId: string, userId: string): Promise<void> {
    const proj = this.projects.find((p) => p.id === projectId && !p.deletedAt);
    if (proj && proj.members) {
      proj.members = proj.members.filter((m) => m.userId !== userId);
    }
  }

  async delete(id: string): Promise<void> {
    const index = this.projects.findIndex((p) => p.id === id);
    if (index !== -1) {
      this.projects[index].deletedAt = new Date();
    }
  }
}



class InMemoryProjectStagesRepository implements IProjectStagesRepository {
  public stages: any[] = [];

  async findByProjectId(projectId: string): Promise<any[]> {
    return this.stages.filter((s) => s.projectId === projectId).sort((a, b) => a.order - b.order);
  }
  async findById(id: string): Promise<any> {
    return this.stages.find((s) => s.id === id) ?? null;
  }
  async create(data: any): Promise<any> {
    const stage = {
      id: `stage-${Date.now()}-${Math.random()}`,
      projectId: data.projectId,
      title: data.title,
      description: data.description ?? null,
      order: data.order,
      status: 'NOT_STARTED',
      isGatekeeper: data.isGatekeeper ?? false,
      gatekeeperType: data.gatekeeperType ?? null,
      plannedStartAt: data.plannedStartAt ? new Date(data.plannedStartAt) : null,
      plannedEndAt:
        data.plannedEndAt || data.plannedCompletionDate
          ? new Date(data.plannedEndAt || data.plannedCompletionDate)
          : null,
      plannedCompletionDate:
        data.plannedCompletionDate || data.plannedEndAt
          ? new Date(data.plannedCompletionDate || data.plannedEndAt)
          : null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.stages.push(stage);
    return stage;
  }
  async update(id: string, data: any): Promise<any> {
    const index = this.stages.findIndex((s) => s.id === id);
    if (index === -1) throw new Error('STAGE_NOT_FOUND');
    const updated = { ...this.stages[index], ...data, updatedAt: new Date() };
    this.stages[index] = updated;
    return updated;
  }
  async delete(id: string): Promise<void> {
    this.stages = this.stages.filter((s) => s.id !== id);
  }
  async autoCreateDefaultStages(): Promise<any[]> {
    return [];
  }
  async reorderStages(
    projectId: string,
    stageOrders: { id: string; order: number }[]
  ): Promise<any[]> {
    for (const item of stageOrders) {
      const stage = this.stages.find((s) => s.id === item.id);
      if (stage) stage.order = item.order;
    }
    return this.findByProjectId(projectId);
  }
}

describe('ProjectsService', () => {
  let repository: InMemoryProjectsRepository;
  let stagesRepository: InMemoryProjectStagesRepository;
  let projectsService: ProjectsService;

  beforeEach(() => {
    repository = new InMemoryProjectsRepository();
    stagesRepository = new InMemoryProjectStagesRepository();
    projectsService = new ProjectsService(
      repository,
      stagesRepository
    );
  });

  it('should create a project successfully in the database', async () => {
    const project = await projectsService.createProject('user-1', {
      name: 'Paper sobre Sistemas Distribuídos',
      description: 'Estudo experimental sobre consistência eventual.',
      coordinatorId: 'coord-1',
      managerId: 'manager-1',
      targetConferenceName: 'SBRC 2026',
    });

    expect(project).toBeDefined();
    expect(project.name).toBe('Paper sobre Sistemas Distribuídos');
  });

  it('should create custom stages and provision feature branches correctly', async () => {
    const created = await projectsService.createProject('user-1', {
      name: 'Paper com 4 Etapas Customizadas',
      coordinatorId: 'coord-1',
      managerId: 'manager-1',
      stages: [
        { title: 'Planejamento e Pesquisa', plannedCompletionDate: new Date('2026-10-29') },
        { title: 'Desenvolvimento e Experimentos', plannedCompletionDate: new Date('2026-12-02') },
        { title: 'Escrita da Versão Rascunho', plannedCompletionDate: new Date('2026-12-30') },
        { title: 'Escrita da Conclusão', plannedCompletionDate: new Date('2027-01-28') },
      ],
    });

    const stages = await stagesRepository.findByProjectId(created.id);
    expect(stages).toHaveLength(6);
    expect(stages[0].title).toBe('Planejamento e Pesquisa');
    expect(stages[3].title).toBe('Escrita da Conclusão');
    expect(stages[4].title).toBe('Parecer do NIT (Gatekeeper 1)');
    expect(stages[5].title).toBe('Submissão ao Congresso Alvo (Gatekeeper 2)');
    expect(stages[0].plannedCompletionDate).toBeDefined();
    expect(stages[3].plannedCompletionDate).toBeDefined();
  });

  it('should list projects with optional filters', async () => {
    await projectsService.createProject('user-1', {
      name: 'Projeto A',
      coordinatorId: 'coord-1',
      managerId: 'manager-1',
    });

    await projectsService.createProject('user-1', {
      name: 'Projeto B',
      coordinatorId: 'coord-2',
      managerId: 'manager-1',
    });

    const coord1Projects = await projectsService.listProjects({ coordinatorId: 'coord-1' });
    expect(coord1Projects).toHaveLength(1);
    expect(coord1Projects[0].name).toBe('Projeto A');
  });

  it('should update project metadata and conference details', async () => {
    const created = await projectsService.createProject('user-1', {
      name: 'Projeto Original',
      coordinatorId: 'coord-1',
      managerId: 'manager-1',
    });

    const updated = await projectsService.updateProject(created.id, 'user-1', {
      name: 'Projeto Atualizado',
      backupConferenceName: 'WIC 2026',
    });

    expect(updated.name).toBe('Projeto Atualizado');
    expect(updated.backupConferenceName).toBe('WIC 2026');
  });

  it('should throw error when updating a non-existing project', async () => {
    await expect(
      projectsService.updateProject('non-existing-id', 'user-1', { name: 'Novo Nome' })
    ).rejects.toThrow('PROJECT_NOT_FOUND');
  });

  it('should allow adding 1 reviewer and throw when adding a second reviewer to a project', async () => {
    const created = await projectsService.createProject('user-1', {
      name: 'Artigo com Revisor Único',
      coordinatorId: 'coord-1',
      managerId: 'manager-1',
    });

    // Adiciona o 1º Revisor com sucesso
    await projectsService.addMember(created.id, 'rev-1', Role.REVIEWER, 'user-1');

    // Tentar adicionar um 2º Revisor deve lançar erro
    await expect(
      projectsService.addMember(created.id, 'rev-2', Role.REVIEWER, 'user-1')
    ).rejects.toThrow('PROJECT_ALREADY_HAS_REVIEWER');
  });

  it('should commit task progress silently for an existing project', async () => {
    const created = await projectsService.createProject('user-1', {
      name: 'Artigo de Teste Commit',
      coordinatorId: 'coord-1',
      managerId: 'manager-1',
    });

    const result = await projectsService.commitTaskProgress(
      created.id,
      'task-1',
      'user-1',
      'Custom commit message'
    );

    expect(result).toBeDefined();
    expect(result.taskId).toBe('task-1');
    expect(result.projectId).toBe(created.id);
    expect(result.commitHash).toBeDefined();
  });

  it('should get task diff summary with classified academic categories and generated description', async () => {
    const created = await projectsService.createProject('user-1', {
      name: 'Artigo de Teste Diff Summary',
      coordinatorId: 'coord-1',
      managerId: 'manager-1',
    });

    const summary = await projectsService.getTaskDiffSummary(created.id, 'task-1', 'user-1');

    expect(summary).toBeDefined();
    expect(summary.lastSavedAuthor).toBeDefined();
    expect(summary.summary).toBeDefined();
    expect(summary.generatedProgressDescription).toBeDefined();
  });

  it('should use generatedProgressDescription when commitMessage is omitted in commitTaskProgress', async () => {
    const created = await projectsService.createProject('user-1', {
      name: 'Artigo de Teste Fallback Description',
      coordinatorId: 'coord-1',
      managerId: 'manager-1',
    });

    const result = await projectsService.commitTaskProgress(created.id, 'task-1', 'user-1');

    expect(result).toBeDefined();
    expect(result.commitMessage).toBeDefined();
  });
});
