import type { BoxProps } from "@mui/material";
import { Box } from "@mui/material";
import React from "react";

export interface TableContainerProps extends BoxProps {
  children: React.ReactNode;
}

/**
 * Container Flexível para AutoSizer e GenericDataGrid.
 * Aplica flex: 1, minHeight: 0, width: "100%" para permitir que o AutoSizer
 * meça com precisão a área disponível em um layout flexbox sem boilerplate.
 */
export const TableContainer = ({
  children,
  sx,
  ...restProps
}: TableContainerProps) => {
  return (
    <Box
      sx={{
        flex: 1,
        minHeight: 0,
        width: "100%",
        ...sx,
      }}
      {...restProps}
    >
      {children}
    </Box>
  );
};
