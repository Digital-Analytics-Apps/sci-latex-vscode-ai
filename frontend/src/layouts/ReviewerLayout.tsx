import { Box, Chip } from "@mui/material";
import React from "react";
import { AppHeaderBar } from "../components/common/AppHeaderBar";

export const ReviewerLayout: React.FC<{ children: React.ReactNode }> = ({
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
      {/* Topbar Padronizada do Revisor com nome da aplicação */}
      <AppHeaderBar
        extraHeaderActions={
          <Chip
            label="Painel de Revisão"
            size="small"
            color="secondary"
            variant="outlined"
          />
        }
      />

      <Box
        sx={{ flexGrow: 1, overflow: "hidden", bgcolor: "background.default" }}
      >
        {children}
      </Box>
    </Box>
  );
};
