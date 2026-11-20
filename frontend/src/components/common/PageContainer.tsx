import type { BoxProps } from '@mui/material';
import { Box } from '@mui/material';
import React from 'react';

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
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        width: '100%',
        p: disablePadding ? 0 : { xs: 2, sm: 2.5, md: 3 },
        boxSizing: 'border-box',
        overflow: 'hidden',
        background: (theme) =>
          theme.palette.mode === 'dark'
            ? 'radial-gradient(ellipse 90% 50% at 50% -10%, rgba(79, 70, 229, 0.08), rgba(11, 15, 23, 0) 70%)'
            : 'radial-gradient(ellipse 90% 50% at 50% -10%, rgba(79, 70, 229, 0.04), rgba(248, 250, 252, 0) 70%)',
        ...sx,
      }}
      {...restProps}
    >
      {children}
    </Box>
  );
};
