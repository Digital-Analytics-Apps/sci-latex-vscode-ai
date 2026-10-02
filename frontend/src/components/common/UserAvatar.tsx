import { Avatar, Tooltip } from "@mui/material";
import type { AvatarProps } from "@mui/material";
import React from "react";
import { Role } from "../../constants/roles";
import type { ProjectMember } from "../../types/user.types";

export interface UserAvatarProps extends AvatarProps {
  member: ProjectMember;
  size?: number;
  showTooltip?: boolean;
}

/**
 * Componente atômico para exibição de Avatar de um ProjectMember com Tooltip e estilo por papel (Autor/Revisor).
 */
export const UserAvatar: React.FC<UserAvatarProps> = ({
  member,
  size = 28,
  showTooltip = true,
  sx,
  ...restAvatarProps
}) => {
  const name = member.user?.name;
  if (!name) return null;

  const isReviewer = member.role === Role.REVIEWER;
  const roleLabel = isReviewer ? "Revisor" : "Autor";
  const title = `${name} (${roleLabel})`;
  const initial = name[0].toUpperCase();

  const avatarNode = (
    <Avatar
      sx={{
        width: size,
        height: size,
        fontSize: Math.max(10, Math.floor(size * 0.45)),
        fontWeight: 700,
        border: "2px solid #1e1e2d",
        bgcolor: isReviewer ? "secondary.main" : "primary.main",
        ...sx,
      }}
      {...restAvatarProps}
    >
      {initial}
    </Avatar>
  );

  if (!showTooltip) return avatarNode;

  return <Tooltip title={title}>{avatarNode}</Tooltip>;
};
