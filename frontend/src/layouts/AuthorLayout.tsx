import { Box } from "@mui/material";
import React from "react";
import { AppHeaderBar } from "../components/common/AppHeaderBar";

export const AuthorLayout: React.FC<{ children: React.ReactNode }> = ({
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
      {/* Topbar Padronizada do Autor */}
      <AppHeaderBar />

      {/* Conteúdo Principal (VS Code Iframe ou Visão Autor) */}
      <Box
        sx={{ flexGrow: 1, overflow: "hidden", bgcolor: "background.default" }}
      >
        {children}
      </Box>
    </Box>
  );
};
