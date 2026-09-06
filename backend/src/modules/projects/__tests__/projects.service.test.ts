import { describe, it, expect, beforeEach } from 'vitest';
import { ProjectsService } from '../projects.service';
import { IProjectsRepository, ProjectFilterOptions, CreateProjectData, UpdateProjectData } from '../../../repositories/projects.repository';
import { GitService } from '../../git/git.service';
import { Project, Role, SubmissionStatus } from '@prisma/client';

class InMemoryProjectsRepository implements IProjectsRepository {
  public projects: Project[] = [];

  async create(data: CreateProjectData): Promise<Project> {
    const project: Project = {
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
    };
    this.projects.push(project);
    return project;
  }

  async findById(id: string): Promise<Project | null> {
    return this.projects.find((p) => p.id === id) ?? null;
  }

  async findAll(filters?: ProjectFilterOptions): Promise<Project[]> {
    return this.projects.filter((p) => {
      if (filters?.teamId && p.teamId !== filters.teamId) return false;
      if (filters?.academicPeriodId && p.academicPeriodId !== filters.academicPeriodId) return false;
      return true;
    });
  }

  async update(id: string, data: UpdateProjectData): Promise<Project> {
    const index = this.projects.findIndex((p) => p.id === id);
    if (index === -1) throw new Error('PROJECT_NOT_FOUND');

    const updated = {
      ...this.projects[index],
      ...data,
      updatedAt: new Date(),
    };
    this.projects[index] = updated;
    return updated;
  }

  async addMember(projectId: string, userId: string, role: Role): Promise<void> {}
  async removeMember(projectId: string, userId: string): Promise<void> {}
  async delete(id: string): Promise<void> {
    this.projects = this.projects.filter((p) => p.id !== id);
  }
}

class MockGitService extends GitService {
  async initBareRepository(projectId: string, projectTitle: string): Promise<string> {
    return `/storage/git/${projectId}.git`;
  }
}

describe('ProjectsService', () => {
  let repository: InMemoryProjectsRepository;
  let mockGitService: MockGitService;
  let projectsService: ProjectsService;

  beforeEach(() => {
    repository = new InMemoryProjectsRepository();
    mockGitService = new MockGitService();
    projectsService = new ProjectsService(repository, mockGitService);
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
});
