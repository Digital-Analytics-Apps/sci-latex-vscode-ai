import { Box, Chip } from "@mui/material";
import React from "react";
import { AppHeaderBar } from "../components/common/AppHeaderBar";

export const CoordinatorLayout: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
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
      {/* Topbar Padronizada do Coordenador com nome da aplicação */}
      <AppHeaderBar
        extraHeaderActions={
          <Chip
            label="Gestão de Equipe & Matriz de Cronogramas"
            size="small"
            color="info"
            variant="outlined"
          />
        }
      />

      <Box
        sx={{
          flexGrow: 1,
          overflow: "auto",
          bgcolor: "background.default",
          p: 3,
        }}
      >
        {children}
      </Box>
    </Box>
  );
};
