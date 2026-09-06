import { Project, Role, SubmissionStatus } from '@prisma/client';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  CreateProjectData,
  IProjectsRepository,
  ProjectFilterOptions,
  UpdateProjectData,
} from '../../../repositories/projects.repository';
import {
  CreateTeamData,
  ITeamsRepository,
  UpdateTeamData,
} from '../../../repositories/teams.repository';
import { GitService } from '../../git/git.service';
import { ProjectsService } from '../projects.service';

class InMemoryProjectsRepository implements IProjectsRepository {
  public projects: (Project & { members?: any[]; deletedAt?: Date | null })[] = [];

  async create(data: CreateProjectData): Promise<Project> {
    const project: Project & { members?: any[]; deletedAt?: Date | null } = {
      id: `proj-${Date.now()}-${Math.random()}`,
      name: data.name,
      description: data.description ?? null,
      gitRepoPath: data.gitRepoPath,
      teamId: data.teamId,
      academicPeriodId: data.academicPeriodId ?? null,
      submissionStatus: SubmissionStatus.IN_PROGRESS,
      currentVersion: 1,
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
      if (filters?.teamId && p.teamId !== filters.teamId) return false;
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

class InMemoryTeamsRepository implements ITeamsRepository {
  public teams: any[] = [{ id: 'team-1', name: 'Equipe Teste' }];

  async create(data: CreateTeamData): Promise<any> {
    const team = { id: `team-${Date.now()}`, name: data.name, coordinatorId: data.coordinatorId };
    this.teams.push(team);
    return team;
  }
  async findById(id: string): Promise<any> {
    return this.teams.find((t) => t.id === id) ?? null;
  }
  async findAll(): Promise<any[]> {
    return this.teams;
  }
  async update(id: string, data: UpdateTeamData): Promise<any> {
    const index = this.teams.findIndex((t) => t.id === id);
    if (index !== -1) this.teams[index] = { ...this.teams[index], ...data };
    return this.teams[index];
  }
  async addMember(): Promise<void> {}
  async removeMember(): Promise<void> {}
  async delete(): Promise<void> {}
  async findDefaultTeamForUser(): Promise<any> {
    return this.teams[0] ?? null;
  }
  async getOrCreateDefaultTeam(coordinatorId: string): Promise<any> {
    if (this.teams.length > 0) return this.teams[0];
    return this.create({ name: 'Equipe Padrão', coordinatorId });
  }
}

class MockGitService extends GitService {
  async initRepository(projectId: string, projectTitle: string): Promise<string> {
    return `/storage/git/${projectId}.git`;
  }
  async commitFile(params?: any): Promise<string> {
    return 'a1b2c3d4e5f678901234567890abcdef12345678';
  }
}

describe('ProjectsService', () => {
  let repository: InMemoryProjectsRepository;
  let teamsRepository: InMemoryTeamsRepository;
  let mockGitService: MockGitService;
  let projectsService: ProjectsService;

  beforeEach(() => {
    repository = new InMemoryProjectsRepository();
    teamsRepository = new InMemoryTeamsRepository();
    mockGitService = new MockGitService();
    projectsService = new ProjectsService(repository, teamsRepository, mockGitService);
  });

  it('should create a project and initialize its Git bare repository', async () => {
    const project = await projectsService.createProject('user-1', {
      name: 'Paper sobre Sistemas Distribuídos',
      description: 'Estudo experimental sobre consistência eventual.',
      teamId: 'team-1',
      targetConferenceName: 'SBRC 2026',
    });

    expect(project).toBeDefined();
    expect(project.name).toBe('Paper sobre Sistemas Distribuídos');
    expect(project.gitRepoPath).toContain(project.id);
  });

  it('should list projects with optional filters', async () => {
    await projectsService.createProject('user-1', {
      name: 'Projeto A',
      teamId: 'team-1',
    });

    await projectsService.createProject('user-1', {
      name: 'Projeto B',
      teamId: 'team-2',
    });

    const team1Projects = await projectsService.listProjects({ teamId: 'team-1' });
    expect(team1Projects).toHaveLength(1);
    expect(team1Projects[0].name).toBe('Projeto A');
  });

  it('should update project metadata and conference details', async () => {
    const created = await projectsService.createProject('user-1', {
      name: 'Projeto Original',
      teamId: 'team-1',
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
      teamId: 'team-1',
    });

    // Adiciona o 1º Revisor com sucesso
    await projectsService.addMember(created.id, 'rev-1', Role.REVIEWER, 'user-1');

    // Tentar adicionar um 2º Revisor deve lançar erro
    await expect(
      projectsService.addMember(created.id, 'rev-2', Role.REVIEWER, 'user-1')
    ).rejects.toThrow('PROJECT_ALREADY_HAS_REVIEWER');
  });

  it('should commit section progress silently for an existing project', async () => {
    const created = await projectsService.createProject('user-1', {
      name: 'Artigo de Teste Commit',
      teamId: 'team-1',
    });

    const result = await projectsService.commitSectionProgress(
      created.id,
      'sec-1',
      'user-1',
      'Custom commit message'
    );

    expect(result).toBeDefined();
    expect(result.sectionId).toBe('sec-1');
    expect(result.projectId).toBe(created.id);
    expect(result.commitHash).toBeDefined();
  });
});
