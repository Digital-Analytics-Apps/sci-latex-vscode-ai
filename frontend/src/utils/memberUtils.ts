import type { UserOption } from "../components/common/ReviewerSelector";
import { Role } from "../constants/roles";
import type { ProjectMember } from "../services/projectsService";

export { Role };

export function formatMemberToOption(member: ProjectMember): UserOption | null {
  const user = member.user;
  const id = user?.id || member.userId || member.id;
  const name = user?.name || user?.email || (member as { name?: string }).name;

  if (!id || !name) return null;
  return { id, name };
}

export function categorizeProjectMembers(members: ProjectMember[] = []): {
  allMembers: UserOption[];
  coAuthors: UserOption[];
  reviewers: UserOption[];
} {
  const allMembers: UserOption[] = [];
  const coAuthors: UserOption[] = [];
  const reviewers: UserOption[] = [];

  for (const m of members) {
    const option = formatMemberToOption(m);
    if (!option) continue;

    allMembers.push(option);

    const role = m.role || m.user?.role || "";
    if (role === Role.REVIEWER) {
      reviewers.push(option);
    } else {
      coAuthors.push(option);
    }
  }

  return { allMembers, coAuthors, reviewers };
}
