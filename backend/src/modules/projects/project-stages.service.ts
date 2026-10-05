import { ProjectStage, StageStatus } from '@prisma/client';
import { prisma } from '../../db/prisma';
import { GitService } from '../../infra/git/git.service';
import {
  IProjectStagesRepository,
  UpdateStageData,
} from '../../repositories/project-stages.repository';

export class ProjectStagesService {
  constructor(
    private readonly stagesRepository: IProjectStagesRepository,
    private readonly gitService: GitService = new GitService()
  ) {}

  // Helper de validação da data da etapa contra a data de submissão do artigo
  // TODO / NOTE: A data limite da etapa não pode ser maior que a data de submissão do artigo (targetConferenceDate/backupConferenceDate).
  // No futuro, avaliar se esta data também deverá ser estritamente menor/respeitar a data do NIT.
  private async validateStageDateAgainstSubmission(
    projectId: string,
    stageDate?: Date | string | null
  ) {
    if (!stageDate) return;
    const project = await prisma.project.findUnique({ where: { id: projectId } });
    if (!project) return;
    const submissionDeadline = project.targetConferenceDate || project.backupConferenceDate;
    if (submissionDeadline && new Date(stageDate) > new Date(submissionDeadline)) {
      throw new Error(
        'STAGE_DATE_EXCEEDS_SUBMISSION: A data da etapa não pode ser maior que a data de submissão do artigo.'
      );
    }
  }

  async listStages(projectId: string): Promise<ProjectStage[]> {
    return this.stagesRepository.findByProjectId(projectId);
  }

  async createStage(
    projectId: string,
    data: {
      title: string;
      order?: number;
      description?: string;
      plannedCompletionDate?: Date | string;
      plannedEndAt?: Date | string;
    }
  ): Promise<ProjectStage> {
    const stageDate = data.plannedCompletionDate || data.plannedEndAt;
    await this.validateStageDateAgainstSubmission(projectId, stageDate);

    const existingStages = await this.stagesRepository.findByProjectId(projectId);
    const nonGatekeepers = existingStages.filter((s) => !s.isGatekeeper);
    const gatekeepers = existingStages.filter((s) => s.isGatekeeper);

    // 1. Cria temporariamente a nova etapa com ordem negativa para não violar unique index
    const newStage = await this.stagesRepository.create({
      projectId,
      title: data.title,
      description: data.description,
      order: -9999,
      isGatekeeper: false,
    });

    // 2. Monta a lista completa com a nova etapa de escrita posicionada antes dos Gatekeepers
    const allWriting = [...nonGatekeepers, newStage];
    const finalStageOrders: { id: string; order: number }[] = [];

    allWriting.forEach((s, idx) => {
      finalStageOrders.push({ id: s.id, order: idx + 1 });
    });

    gatekeepers.forEach((g, idx) => {
      finalStageOrders.push({ id: g.id, order: allWriting.length + 1 + idx });
    });

    // 3. Aplica reordenação atômica sem colisões de índice único
    await this.stagesRepository.reorderStages(projectId, finalStageOrders);

    // 4. Provisiona a Feature Branch correspondente derivada de dev
    await this.gitService.createFeatureBranch(projectId, data.title).catch((err) => {
      console.warn(`⚠️ Warning provisioning feature branch for stage "${data.title}":`, err);
    });

    const updated = await this.stagesRepository.findById(newStage.id);
    return updated || newStage;
  }

  async reorderStages(
    projectId: string,
    stageOrders: { id: string; order: number }[]
  ): Promise<ProjectStage[]> {
    const existingStages = await this.stagesRepository.findByProjectId(projectId);
    const existingIds = new Set(existingStages.map((s) => s.id));

    for (const item of stageOrders) {
      if (!existingIds.has(item.id)) {
        throw new Error(`Etapa ${item.id} não pertence ao projeto.`);
      }
    }

    return this.stagesRepository.reorderStages(projectId, stageOrders);
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

    const stageDate = data.plannedCompletionDate || data.plannedEndAt;
    await this.validateStageDateAgainstSubmission(projectId, stageDate);

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

    if (stage.tasks && stage.tasks.length > 0) {
      throw new Error(
        'STAGE_HAS_TASKS: Não é possível excluir uma etapa que possui tarefas associadas. Remova ou reatribua as tarefas antes de excluir.'
      );
    }

    await this.stagesRepository.delete(stageId);
  }
}
