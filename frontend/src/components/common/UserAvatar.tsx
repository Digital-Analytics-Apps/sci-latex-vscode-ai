import type { AvatarProps } from "@mui/material";
import { Avatar, Tooltip } from "@mui/material";
import type { Role } from "../../constants/roles";
import type { ProjectMember, UserSimple } from "../../types/user.types";
import { getMemberAvatarColor } from "../../utils/memberUtils";

export interface UserAvatarProps extends AvatarProps {
  member?: ProjectMember;
  user?: UserSimple;
  name?: string;
  role?: Role;
  size?: number;
  showTooltip?: boolean;
  tooltipTitle?: string;
  useDeterministicColor?: boolean;
}

/**
 * Componente atômico para exibição de Avatar de Usuário ou ProjectMember
 * com Tooltip automático e cor padrão do tema (primary.main) ou determinística por membro.
 */
export const UserAvatar = ({
  member,
  user,
  name: nameProp,
  role: roleProp,
  size = 28,
  showTooltip = true,
  tooltipTitle,
  useDeterministicColor = false,
  sx,
  ...restAvatarProps
}: UserAvatarProps) => {
  const name = member?.user?.name || user?.name || nameProp;
  if (!name) return null;

  const role = member?.role || user?.role || roleProp;
  const title = tooltipTitle || (role ? `${name} (${role})` : name);
  const initial = name[0].toUpperCase();
  const avatarId = member?.userId || member?.id || user?.id || name;

  // Usa cor determinística se explicitado ou se for membro de lista; caso contrário usa cor padrão do tema
  const defaultBgColor =
    useDeterministicColor || Boolean(member)
      ? getMemberAvatarColor(avatarId)
      : "primary.main";

  const avatarNode = (
    <Avatar
      sx={{
        width: size,
        height: size,
        fontSize: Math.max(10, Math.floor(size * 0.45)),
        fontWeight: 700,
        bgcolor: defaultBgColor,
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
