import type { UserSimple } from "./user.types";

export interface TeamMemberItem {
  id: string;
  teamId: string;
  userId: string;
  user: UserSimple;
}

export interface TeamItem {
  id: string;
  name: string;
  coordinatorId?: string | null;
  coordinator?: UserSimple | null;
  members?: TeamMemberItem[];
  _count?: {
    projects: number;
    members: number;
  };
}

export interface CreateTeamInput {
  name: string;
  coordinatorId?: string;
  coordinatorEmail?: string;
}

export interface UpdateTeamInput {
  name?: string;
  coordinatorId?: string;
  coordinatorEmail?: string;
}
