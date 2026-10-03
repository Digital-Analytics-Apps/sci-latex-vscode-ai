import { Box, Chip, FormControl, MenuItem, Select } from "@mui/material";
import React, { useState } from "react";
import { AppHeaderBar } from "../components/common/AppHeaderBar";

export const ManagerLayout: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [academicPeriod, setAcademicPeriod] = useState("2026-2027");

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
      {/* Topbar Padronizada do Gerente com nome da aplicação */}
      <AppHeaderBar
        extraHeaderActions={
          <>
            <Chip
              label="Dashboard Executivo"
              size="small"
              color="warning"
              variant="outlined"
            />
            <FormControl size="small" sx={{ minWidth: 200 }}>
              <Select
                value={academicPeriod}
                onChange={(e) => setAcademicPeriod(e.target.value)}
                displayEmpty
                sx={{ height: 28, fontSize: "0.75rem", fontWeight: 600 }}
              >
                <MenuItem value="2026-2027">Ciclo Acadêmico 2026/2027</MenuItem>
                <MenuItem value="2025-2026">Ciclo Acadêmico 2025/2026</MenuItem>
              </Select>
            </FormControl>
          </>
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
