import { ProjectStage, StageStatus } from '@prisma/client';
import {
  CreateStageData,
  IProjectStagesRepository,
  UpdateStageData,
} from '../../repositories/project-stages.repository';

export class ProjectStagesService {
  constructor(private readonly stagesRepository: IProjectStagesRepository) {}

  async listStages(projectId: string): Promise<ProjectStage[]> {
    return this.stagesRepository.findByProjectId(projectId);
  }

  async createStage(
    projectId: string,
    data: { title: string; order?: number; description?: string }
  ): Promise<ProjectStage> {
    const existingStages = await this.stagesRepository.findByProjectId(projectId);
    const maxOrder = existingStages.reduce((max, s) => Math.max(max, s.order), 0);
    const order = data.order ?? maxOrder + 1;

    const createData: CreateStageData = {
      projectId,
      title: data.title,
      description: data.description,
      order,
      isGatekeeper: false,
    };

    return this.stagesRepository.create(createData);
  }

  async updateStage(
    projectId: string,
    stageId: string,
    data: UpdateStageData
  ): Promise<ProjectStage> {
    const stage = await this.stagesRepository.findById(stageId);
    if (stage?.projectId !== projectId) {
      throw new Error('Etapa de projeto não encontrada.');
    }

    const allStages = await this.stagesRepository.findByProjectId(projectId);

    // Validação do Gatekeeper 1 (NIT)
    const isNitGatekeeper =
      stage.isGatekeeper &&
      (stage.gatekeeperType === 'NIT' ||
        stage.title.toLowerCase().includes('nit') ||
        stage.order === 4);

    if (
      isNitGatekeeper &&
      data.status &&
      (data.status === StageStatus.IN_PROGRESS || data.status === StageStatus.COMPLETED)
    ) {
      const nonGatekeepers = allStages.filter((s) => !s.isGatekeeper);
      const pendingContentStages = nonGatekeepers.filter((s) => s.status !== StageStatus.COMPLETED);

      if (pendingContentStages.length > 0) {
        throw new Error(
          'Não é possível liberar a etapa do NIT enquanto houver etapas de escrita pendentes.'
        );
      }
    }

    // Validação do Gatekeeper 2 (Congresso Alvo / Submissão)
    const isConferenceGatekeeper =
      stage.isGatekeeper &&
      (stage.gatekeeperType === 'TARGET_CONFERENCE' ||
        stage.title.toLowerCase().includes('congresso') ||
        stage.title.toLowerCase().includes('submissão') ||
        stage.order === 5);

    if (
      isConferenceGatekeeper &&
      data.status &&
      (data.status === StageStatus.IN_PROGRESS || data.status === StageStatus.COMPLETED)
    ) {
      const nitStage = allStages.find(
        (s) =>
          s.isGatekeeper &&
          (s.gatekeeperType === 'NIT' || s.title.toLowerCase().includes('nit') || s.order === 4)
      );

      if (nitStage && nitStage.status !== StageStatus.COMPLETED) {
        throw new Error(
          'Não é possível submeter ao congresso alvo sem o Parecer Favorável do NIT.'
        );
      }
    }

    return this.stagesRepository.update(stageId, data);
  }

  async deleteStage(projectId: string, stageId: string): Promise<void> {
    const stage = await this.stagesRepository.findById(stageId);
    if (stage?.projectId !== projectId) {
      throw new Error('Etapa de projeto não encontrada.');
    }

    if (stage.isGatekeeper) {
      throw new Error(
        'Não é possível excluir etapas de Gatekeeper obrigatórias (NIT e Congresso Alvo).'
      );
    }

    await this.stagesRepository.delete(stageId);
  }
}
