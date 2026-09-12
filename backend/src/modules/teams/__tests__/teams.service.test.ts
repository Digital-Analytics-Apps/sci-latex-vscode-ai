import { beforeEach, describe, expect, it } from 'vitest';
import { TeamsService } from '../teams.service';

describe('TeamsService', () => {
  let teamsService: TeamsService;
  let mockTeamsRepo: any;

  beforeEach(() => {
    mockTeamsRepo = {
      create: async (data: any) => ({
        id: 'team-123',
        ...data,
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
      findById: async (id: string) => {
        if (id === 'team-123') {
          return {
            id: 'team-123',
            name: 'Laboratório de IA',
            coordinatorId: 'coord-1',
            managerId: 'manager-1',
          };
        }
        return null;
      },
      findAll: async () => [{ id: 'team-123', name: 'Laboratório de IA' }],
      update: async (id: string, data: any) => ({
        id,
        name: data.name || 'Laboratório de IA',
        ...data,
      }),
      addMember: async () => {},
      removeMember: async () => {},
      delete: async () => {},
    };

    teamsService = new TeamsService(mockTeamsRepo as any);
  });

  it('should create a new team with coordinator', async () => {
    const team = await teamsService.createTeam('manager-1', {
      name: 'Laboratório de IA',
      coordinatorId: 'coord-1',
      managerId: 'manager-1',
    });

    expect(team).toBeDefined();
    expect(team.name).toBe('Laboratório de IA');
  });

  it('should list all teams', async () => {
    const teams = await teamsService.listTeams();
    expect(teams).toHaveLength(1);
    expect(teams[0].name).toBe('Laboratório de IA');
  });

  it('should throw error when team is not found', async () => {
    await expect(teamsService.getTeamById('invalid-id')).rejects.toThrow('TEAM_NOT_FOUND');
  });
});
