import { Role } from '@prisma/client';
import {
  PrismaTeamsRepository,
  CreateTeamData,
  UpdateTeamData,
} from '../../repositories/teams.repository';
import { logAudit } from '../../utils/audit';

export class TeamsService {
  constructor(private teamsRepository: PrismaTeamsRepository) {}

  // Criar uma nova Equipe (Requer papel MANAGER ou ADMIN)
  async createTeam(requesterId: string, data: CreateTeamData) {
    const team = await this.teamsRepository.create(data);

    await logAudit({
      userId: requesterId,
      action: 'TEAM_CREATED',
      entityType: 'Team',
      entityId: team.id,
      details: { name: team.name, coordinatorId: team.coordinatorId, managerId: team.managerId },
    });

    return team;
  }

  // Obter detalhes de uma equipe pelo ID
  async getTeamById(id: string) {
    const team = await this.teamsRepository.findById(id);
    if (!team) throw new Error('TEAM_NOT_FOUND');
    return team;
  }

  // Listar todas as equipes (opcionalmente filtrado por gerente)
  async listTeams(managerId?: string) {
    return this.teamsRepository.findAll(managerId);
  }

  // Atualizar informações da equipe (Nome, Descrição, Coordenador, Gerente)
  async updateTeam(id: string, requesterId: string, data: UpdateTeamData) {
    const existing = await this.teamsRepository.findById(id);
    if (!existing) throw new Error('TEAM_NOT_FOUND');

    const updated = await this.teamsRepository.update(id, data);

    await logAudit({
      userId: requesterId,
      action: 'TEAM_UPDATED',
      entityType: 'Team',
      entityId: id,
      details: data,
    });

    return updated;
  }

  // Adicionar membro (Autor ou Revisor) à equipe
  async addMember(teamId: string, userId: string, role: Role, requesterId: string) {
    const team = await this.teamsRepository.findById(teamId);
    if (!team) throw new Error('TEAM_NOT_FOUND');

    await this.teamsRepository.addMember(teamId, userId, role);

    await logAudit({
      userId: requesterId,
      action: 'TEAM_MEMBER_ADDED',
      entityType: 'Team',
      entityId: teamId,
      details: { addedUserId: userId, role },
    });
  }

  // Remover membro da equipe
  async removeMember(teamId: string, userId: string, requesterId: string) {
    const team = await this.teamsRepository.findById(teamId);
    if (!team) throw new Error('TEAM_NOT_FOUND');

    await this.teamsRepository.removeMember(teamId, userId);

    await logAudit({
      userId: requesterId,
      action: 'TEAM_MEMBER_REMOVED',
      entityType: 'Team',
      entityId: teamId,
      details: { removedUserId: userId },
    });
  }

  // Excluir equipe (Requer papel MANAGER ou ADMIN)
  async deleteTeam(id: string, requesterId: string) {
    const team = await this.teamsRepository.findById(id);
    if (!team) throw new Error('TEAM_NOT_FOUND');

    await this.teamsRepository.delete(id);

    await logAudit({
      userId: requesterId,
      action: 'TEAM_DELETED',
      entityType: 'Team',
      entityId: id,
      details: { teamName: team.name },
    });
  }
}
