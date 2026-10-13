import type { UserOption } from "../components/common/ReviewerSelector";
import { Role } from "../constants/roles";
import type { ProjectMember } from "../services/projectsService";
import { colors } from "../theme";

export { Role };

export function formatMemberToOption(member: ProjectMember): UserOption | null {
  const user = member.user;
  const id = user?.id || member.userId || member.id;
  const name = user?.name || user?.email || (member as { name?: string }).name;

  if (!id || !name) return null;
  return { id, name };
}

// Paleta expandida de 16 cores vibrantes do Design System para Avatares
const AVATAR_COLOR_PALETTE = [
  colors.blue[600], // 0: Cobalt Blue
  colors.indigo[600], // 1: Indigo
  colors.violet[600], // 2: Violet
  colors.emerald[600], // 3: Emerald
  colors.rose[600], // 4: Rose
  colors.cyan[600], // 5: Cyan
  colors.amber[600], // 6: Amber
  colors.teal[600], // 7: Teal
  colors.fuchsia[600], // 8: Fuchsia
  colors.purple[600], // 9: Purple
  colors.sky[600], // 10: Sky Blue
  colors.orange[600], // 11: Orange
  colors.red[600], // 12: Bright Red
  colors.pink[600], // 13: Pink
  // colors.lime[600],    // 14: Lime Green
  colors.slate[600], // 15: Slate
] as const;

/**
 * Função Hash Puramente Determinística (DJB2).
 * Recebe o ID, email ou nome do usuário.
 * Retorna SEMPRE a mesma cor em qualquer artigo ou tela da aplicação para o mesmo usuário.
 */
export function getMemberAvatarColor(
  userOrId?: string | number | null,
): string {
  if (userOrId === undefined || userOrId === null) {
    return AVATAR_COLOR_PALETTE[0];
  }

  if (typeof userOrId === "number") {
    const idx = Math.abs(Math.floor(userOrId)) % AVATAR_COLOR_PALETTE.length;
    return AVATAR_COLOR_PALETTE[idx];
  }

  const str = String(userOrId).trim().toLowerCase();
  if (!str) {
    return AVATAR_COLOR_PALETTE[0];
  }

  // Algoritmo DJB2 (hash determinístico com excelente distribuição)
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 33) ^ str.charCodeAt(i);
  }

  const index = Math.abs(hash) % AVATAR_COLOR_PALETTE.length;
  return AVATAR_COLOR_PALETTE[index];
}

/** Alias para compatibilidade retroativa com componentes existentes */
export const getRandomColor = getMemberAvatarColor;

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
