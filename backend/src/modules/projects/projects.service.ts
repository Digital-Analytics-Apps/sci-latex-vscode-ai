import { IProjectsRepository, ProjectFilterOptions } from '../../repositories/projects.repository';
import { GitService } from '../git/git.service';

export interface CreateProjectDTO {
  name: string;
  description?: string;
  teamId: string;
  academicPeriodId?: string;
  targetConferenceName?: string;
  targetConferenceDate?: Date;
  backupConferenceName?: string;
  backupConferenceDate?: Date;
}

export interface UpdateProjectDTO {
  name?: string;
  description?: string;
  targetConferenceName?: string;
  targetConferenceDate?: Date;
  backupConferenceName?: string;
  backupConferenceDate?: Date;
  doi?: string;
  publicationUrl?: string;
  datasetUrl?: string;
}

export class ProjectsService {
  constructor(
    private projectsRepository: IProjectsRepository,
    private gitService: GitService
  ) {}

  // Criar um novo projeto/artigo e provisionar seu repositório Git Bare
  async createProject(userId: string, data: CreateProjectDTO) {
    // 1. Criar registro temporário do projeto para obter o ID único
    const tempPath = `storage/git/pending`;
    const project = await this.projectsRepository.create({
      ...data,
      gitRepoPath: tempPath,
      creatorId: userId,
    });

    // 2. Provisionar repositório Git bare no disco
    try {
      const gitRepoPath = await this.gitService.initBareRepository(project.id, project.name);
      
      // 3. Atualizar o caminho do repositório no projeto
      const updatedProject = await this.projectsRepository.update(project.id, {
        ...data,
      });

      return {
        ...updatedProject,
        gitRepoPath,
      };
    } catch (err) {
      console.error('❌ Error initializing Git repository for project:', err);
      return project;
    }
  }

  // Listar projetos com suporte a filtros por equipe, ciclo acadêmico ou usuário
  async listProjects(filters?: ProjectFilterOptions) {
    return this.projectsRepository.findAll(filters);
  }

  // Buscar detalhes de um projeto pelo ID
  async getProjectById(projectId: string) {
    const project = await this.projectsRepository.findById(projectId);
    if (!project) {
      throw new Error('PROJECT_NOT_FOUND');
    }
    return project;
  }

  // Atualizar informações do projeto (conferências alvo/backup, metadados)
  async updateProject(projectId: string, data: UpdateProjectDTO) {
    const existing = await this.projectsRepository.findById(projectId);
    if (!existing) {
      throw new Error('PROJECT_NOT_FOUND');
    }

    return this.projectsRepository.update(projectId, data);
  }
}
