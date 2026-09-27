import { Role } from '@prisma/client';
import {
  CreateTeamData,
  PrismaTeamsRepository,
  UpdateTeamData,
} from '../../repositories/teams.repository';
import { logAudit } from '../../utils/audit';
import { prisma } from '../../db/prisma';
import { hashPassword } from '../../utils/hash';

export class TeamsService {
  constructor(private readonly teamsRepository: PrismaTeamsRepository) {}

  // Criar uma nova Equipe (Requer papel MANAGER ou ADMIN)
  async createTeam(requesterId: string, data: CreateTeamData) {
    let coordinatorId = data.coordinatorId;

    if (!coordinatorId && data.coordinatorEmail) {
      const email = data.coordinatorEmail.trim().toLowerCase();
      let user = await prisma.user.findUnique({ where: { email } });
      if (!user) {
        const hashedPassword = await hashPassword('123456');
        user = await prisma.user.create({
          data: {
            email,
            name: email.split('@')[0],
            passwordHash: hashedPassword,
            role: Role.COORDINATOR,
          },
        });
      }
      coordinatorId = user.id;
    }

    if (!coordinatorId) {
      coordinatorId = requesterId;
    }

    const team = await this.teamsRepository.create({
      name: data.name,
      description: data.description,
      coordinatorId,
      managerId: data.managerId || requesterId,
    });

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

    let coordinatorId = data.coordinatorId;

    if (!coordinatorId && data.coordinatorEmail) {
      const email = data.coordinatorEmail.trim().toLowerCase();
      let user = await prisma.user.findUnique({ where: { email } });
      if (!user) {
        const hashedPassword = await hashPassword('123456');
        user = await prisma.user.create({
          data: {
            email,
            name: email.split('@')[0],
            passwordHash: hashedPassword,
            role: Role.COORDINATOR,
          },
        });
      }
      coordinatorId = user.id;
    }

    const updatePayload: UpdateTeamData = {
      name: data.name,
      description: data.description,
      managerId: data.managerId,
      ...(coordinatorId ? { coordinatorId } : {}),
    };

    const updated = await this.teamsRepository.update(id, updatePayload);

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
