import type { StackProps } from "@mui/material";
import { Stack } from "@mui/material";
import type { ProjectMember } from "../../types/user.types";
import { UserAvatar } from "./UserAvatar";

export interface UserAvatarStackProps extends StackProps {
  members: ProjectMember[];
  avatarSize?: number;
}

/**
 * Componente reutilizável para exibição de pilha sobreposta de Avatares a partir de um array de ProjectMember.
 */
export const UserAvatarStack = ({
  members,
  avatarSize = 28,
  direction = "row",
  spacing = -0.8,
  sx,
  ...restStackProps
}: UserAvatarStackProps) => {
  if (!members || members.length === 0) return null;

  return (
    <Stack
      direction={direction}
      spacing={spacing}
      sx={{ alignItems: "center", ...sx }}
      {...restStackProps}
    >
      {members.map((m, idx) => (
        <UserAvatar
          key={m.id || m.userId || `avatar-${idx}`}
          member={m}
          size={avatarSize}
        />
      ))}
    </Stack>
  );
};
