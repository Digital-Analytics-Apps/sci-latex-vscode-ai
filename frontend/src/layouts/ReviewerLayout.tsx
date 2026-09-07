import Brightness4Icon from "@mui/icons-material/Brightness4";
import Brightness7Icon from "@mui/icons-material/Brightness7";
import LogoutIcon from "@mui/icons-material/Logout";
import RateReviewIcon from "@mui/icons-material/RateReview";
import SignalCellularAltIcon from "@mui/icons-material/SignalCellularAlt";
import {
  AppBar,
  Avatar,
  Box,
  Chip,
  IconButton,
  Menu,
  MenuItem,
  Toolbar,
  Tooltip,
  Typography,
} from "@mui/material";
import React from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { useSSEEventSource } from "../hooks/useSSEEventSource";
import type { RootState } from "../store";
import { logout } from "../store/slices/authSlice";
import { useColorMode } from "../theme";

export const ReviewerLayout: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const user = useSelector((state: RootState) => state.auth.user);
  const { mode, toggleColorMode } = useColorMode();
  const { isConnected } = useSSEEventSource();

  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const handleOpenUserMenu = (event: React.MouseEvent<HTMLElement>) =>
    setAnchorEl(event.currentTarget);
  const handleCloseUserMenu = () => setAnchorEl(null);

  const handleLogout = () => {
    handleCloseUserMenu();
    dispatch(logout());
  };

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        height: "100vh",
        width: "100vw",
        overflow: "hidden",
      }}
    >
      {/* Header do Revisor */}
      <AppBar
        position="static"
        color="default"
        sx={{ bgcolor: "background.paper" }}
      >
        <Toolbar
          variant="dense"
          sx={{ justifyContent: "space-between", gap: 2 }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
            <RateReviewIcon
              color="primary"
              sx={{ cursor: "pointer" }}
              onClick={() => navigate("/")}
            />
            <Typography
              variant="subtitle1"
              sx={{ fontWeight: 700, cursor: "pointer" }}
              onClick={() => navigate("/")}
            >
              Painel de Revisão & Parecer NIT
            </Typography>
          </Box>

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
              <IconButton
                onClick={toggleColorMode}
                size="small"
                color="inherit"
              >
                {mode === "dark" ? (
                  <Brightness7Icon fontSize="small" />
                ) : (
                  <Brightness4Icon fontSize="small" />
                )}
              </IconButton>
            </Tooltip>

            <IconButton onClick={handleOpenUserMenu} size="small" sx={{ p: 0 }}>
              <Avatar
                sx={{
                  width: 28,
                  height: 28,
                  bgcolor: "secondary.main",
                  fontSize: "0.75rem",
                }}
              >
                {user?.name?.charAt(0).toUpperCase() || "R"}
              </Avatar>
            </IconButton>

            <Menu
              anchorEl={anchorEl}
              open={Boolean(anchorEl)}
              onClose={handleCloseUserMenu}
              transformOrigin={{ horizontal: "right", vertical: "top" }}
              anchorOrigin={{ horizontal: "right", vertical: "bottom" }}
            >
              <Box sx={{ px: 2, py: 1 }}>
                <Typography variant="subtitle2">{user?.name}</Typography>
                <Typography variant="caption" color="text.secondary">
                  Perfil: {user?.role}
                </Typography>
              </Box>
              <MenuItem
                onClick={handleLogout}
                sx={{ gap: 1, color: "error.main" }}
              >
                <LogoutIcon fontSize="small" />
                Sair
              </MenuItem>
            </Menu>
          </Box>
        </Toolbar>
      </AppBar>

      <Box
        sx={{ flexGrow: 1, overflow: "hidden", bgcolor: "background.default" }}
      >
        {children}
      </Box>
    </Box>
  );
};
