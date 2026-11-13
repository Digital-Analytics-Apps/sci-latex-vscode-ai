import { Box, Chip, Button } from "@mui/material";
import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ShieldCheck, BarChart3 } from "lucide-react";
import { AppHeaderBar } from "../components/common/AppHeaderBar";

export const AdminLayout: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const isAdminCenter = location.pathname.startsWith("/admin");

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
      {/* Topbar Padronizada para o Administrador do Sistema */}
      <AppHeaderBar
        extraHeaderActions={
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Chip
              icon={<ShieldCheck size={14} />}
              label="SCIA Admin"
              size="small"
              color="error"
              variant="filled"
              sx={{ fontWeight: 700 }}
            />
            <Button
              size="small"
              variant={isAdminCenter ? "contained" : "outlined"}
              color="primary"
              onClick={() => navigate("/admin")}
              startIcon={<ShieldCheck size={14} />}
              sx={{ textTransform: "none", py: 0.2, px: 1, height: 26, fontSize: "0.75rem" }}
            >
              Admin Center
            </Button>
            <Button
              size="small"
              variant={!isAdminCenter ? "contained" : "outlined"}
              color="secondary"
              onClick={() => navigate("/manager")}
              startIcon={<BarChart3 size={14} />}
              sx={{ textTransform: "none", py: 0.2, px: 1, height: 26, fontSize: "0.75rem" }}
            >
              Visão Institucional
            </Button>
          </Box>
        }
      />

      <Box
        sx={{
          flexGrow: 1,
          overflow: "auto",
          bgcolor: "background.default",
          p: { xs: 1.5, sm: 2, md: 3 },
        }}
      >
        {children}
      </Box>
    </Box>
  );
};
