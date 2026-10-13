import Brightness4Icon from "@mui/icons-material/Brightness4";
import Brightness7Icon from "@mui/icons-material/Brightness7";
import LogoutIcon from "@mui/icons-material/Logout";
import SignalCellularAltIcon from "@mui/icons-material/SignalCellularAlt";
import {
  AppBar,
  Box,
  Chip,
  IconButton,
  Menu,
  MenuItem,
  Stack,
  Toolbar,
  Tooltip,
  Typography,
} from "@mui/material";
import React, { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { useSSEEventSource } from "../../hooks/useSSEEventSource";
import type { RootState } from "../../store";
import { logout } from "../../store/slices/authSlice";
import { useColorMode } from "../../theme";

import { UserAvatar } from "./UserAvatar";

export interface AppHeaderBarProps {
  /** Título principal exibido na barra superior. Padrão: "SCIA — Scientific Collaboration + AI" */
  title?: React.ReactNode;
  /** Ícone opcional exibido ao lado do título */
  icon?: React.ReactNode;
  /** Elementos extras exibidos no lado esquerdo da barra (ex: seletores de ciclo, badges de equipe) */
  extraHeaderActions?: React.ReactNode;
}

/**
 * Componente Reutilizável e Padronizado de Barra Superior (AppBar / Topbar).
 * Unifica a navegação, indicação SSE em tempo real, alternador de tema claro/escuro
 * e menu de perfil/logout em todas as visões de layout por persona.
 */
export const AppHeaderBar = ({
  title = "SCIA — Scientific Collaboration + AI",
  icon,
  extraHeaderActions,
}: AppHeaderBarProps) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const user = useSelector((state: RootState) => state.auth.user);
  const { mode, toggleColorMode } = useColorMode();
  const { isConnected } = useSSEEventSource();

  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const handleOpenUserMenu = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleCloseUserMenu = () => {
    setAnchorEl(null);
  };

  const handleLogout = () => {
    handleCloseUserMenu();
    dispatch(logout());
  };

  return (
    <AppBar
      position="static"
      color="default"
      elevation={0}
      sx={{
        bgcolor: "background.paper",
        borderBottom: "1px solid",
        borderColor: "divider",
        borderRadius: 0,
      }}
    >
      <Toolbar
        variant="dense"
        sx={{ justifyContent: "space-between", gap: 2, minHeight: 48 }}
      >
        {/* Lado Esquerdo: Marca, Ícone, Título e Ações Secundárias */}
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
          {icon && (
            <Box
              onClick={() => navigate("/")}
              sx={{ cursor: "pointer", display: "flex", alignItems: "center" }}
            >
              {icon}
            </Box>
          )}

          {typeof title === "string" ? (
            <Typography
              variant="subtitle1"
              sx={{
                fontWeight: 700,
                color: "primary.main",
                cursor: "pointer",
              }}
              onClick={() => navigate("/")}
            >
              {title}
            </Typography>
          ) : (
            title
          )}

          {extraHeaderActions}
        </Box>

        {/* Lado Direito: SSE Status, Alternador de Tema e Perfil do Usuário */}
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
          <Tooltip
            title={
              isConnected
                ? "Conexão Real-time SSE Ativa"
                : "Desconectado do SSE"
            }
          >
            <Chip
              icon={<SignalCellularAltIcon fontSize="small" />}
              label={isConnected ? "Real-time SSE" : "Offline"}
              size="small"
              color={isConnected ? "success" : "default"}
              variant="outlined"
            />
          </Tooltip>

          <Tooltip title="Alternar Modo Claro / Escuro">
            <IconButton onClick={toggleColorMode} size="small" color="inherit">
              {mode === "dark" ? (
                <Brightness7Icon fontSize="small" />
              ) : (
                <Brightness4Icon fontSize="small" />
              )}
            </IconButton>
          </Tooltip>

          <IconButton onClick={handleOpenUserMenu} size="small" sx={{ p: 0 }}>
            <UserAvatar
              user={user ?? undefined}
              role={user?.role}
              size={28}
              showTooltip={false}
              sx={{ bgcolor: "primary.main" }}
            />
          </IconButton>

          <Menu
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={handleCloseUserMenu}
            transformOrigin={{ horizontal: "right", vertical: "top" }}
            anchorOrigin={{ horizontal: "right", vertical: "bottom" }}
          >
            <Stack sx={{ px: 2, py: 1, gap: 0.5 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                {user?.name || "Usuário"}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Perfil Ativo: {user?.role || "Geral"}
              </Typography>
            </Stack>

            <MenuItem
              onClick={handleLogout}
              sx={{ gap: 1, color: "error.main", fontWeight: 600 }}
            >
              <LogoutIcon fontSize="small" />
              Sair
            </MenuItem>
          </Menu>
        </Box>
      </Toolbar>
    </AppBar>
  );
};
