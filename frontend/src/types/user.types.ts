import type { Role } from "../constants/roles";

export interface UserSimple {
  id: string;
  name: string;
  email?: string;
  role?: Role;
}

export interface UserMemberItem {
  id: string;
  name: string;
  email: string;
  role: Role;
  teams?: { id: string; name: string; role?: string }[];
  authoredProjectsCount?: number;
}

export interface ProjectMember {
  id?: string;
  userId?: string;
  role?: Role;
  user?: UserSimple;
}
