import type { BoxProps } from "@mui/material";
import { Box } from "@mui/material";
import React from "react";

export interface PageContainerProps extends BoxProps {
  children: React.ReactNode;
  disablePadding?: boolean;
}

/**
 * Container Padronizado de Página para a Aplicação.
 * Mantém layout flexbox coluna (100% altura/largura), box-sizing border-box e overflow oculto
 * para acomodar perfeitamente AutoSizer, DataGrids e conteúdos responsivos sem boilerplate.
 */
export const PageContainer = ({
  children,
  disablePadding = false,
  sx,
  ...restProps
}: PageContainerProps) => {
  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        width: "100%",
        p: disablePadding ? 0 : { xs: 2, sm: 3, md: 4 },
        boxSizing: "border-box",
        overflow: "hidden",
        ...sx,
      }}
      {...restProps}
    >
      {children}
    </Box>
  );
};
