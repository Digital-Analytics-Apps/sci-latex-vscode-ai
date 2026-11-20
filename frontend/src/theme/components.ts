import type { Components, Theme } from '@mui/material/styles';

export const componentsOverrides: Components<Omit<Theme, 'components'>> = {
  MuiCssBaseline: {
    styleOverrides: {
      '*': {
        boxSizing: 'border-box',
        margin: 0,
        padding: 0,
      },
      html: {
        WebkitFontSmoothing: 'antialiased',
        MozOsxFontSmoothing: 'grayscale',
        height: '100%',
        width: '100%',
      },
      body: {
        height: '100%',
        width: '100%',
      },
      '#root': {
        height: '100%',
        width: '100%',
      },
      'code, pre, kbd, samp': {
        fontFamily: 'var(--font-mono, "JetBrains Mono", monospace)',
      },
    },
  },
  MuiButton: {
    styleOverrides: {
      root: {
        borderRadius: 4,
        padding: '6px 16px',
        textTransform: 'uppercase',
        fontWeight: 500,
        letterSpacing: '0.02857em',
        transition: 'background-color 250ms cubic-bezier(0.4, 0, 0.2, 1), box-shadow 250ms cubic-bezier(0.4, 0, 0.2, 1), border-color 250ms cubic-bezier(0.4, 0, 0.2, 1)',
      },
      contained: {
        boxShadow: '0px 3px 1px -2px rgba(0,0,0,0.2), 0px 2px 2px 0px rgba(0,0,0,0.14), 0px 1px 5px 0px rgba(0,0,0,0.12)',
        '&:hover': {
          boxShadow: '0px 2px 4px -1px rgba(0,0,0,0.2), 0px 4px 5px 0px rgba(0,0,0,0.14), 0px 1px 10px 0px rgba(0,0,0,0.12)',
        },
      },
    },
  },
  MuiPaper: {
    styleOverrides: {
      root: {
        backgroundImage: 'none',
        borderRadius: 4,
      },
    },
  },
  MuiCard: {
    styleOverrides: {
      root: {
        borderRadius: 4,
        border: '1px solid var(--mui-palette-divider, rgba(0, 0, 0, 0.12))',
        backgroundImage: 'none',
      },
    },
  },
  MuiChip: {
    styleOverrides: {
      root: {
        fontWeight: 500,
        borderRadius: 16,
      },
    },
  },
  MuiTextField: {
    defaultProps: {
      size: 'small',
      variant: 'outlined',
    },
  },
  MuiOutlinedInput: {
    styleOverrides: {
      root: {
        borderRadius: 4,
      },
    },
  },
  MuiTableCell: {
    styleOverrides: {
      root: {
        padding: '12px 16px',
        borderBottom: '1px solid var(--mui-palette-divider, rgba(0, 0, 0, 0.12))',
      },
      head: {
        fontWeight: 600,
        textTransform: 'uppercase',
        fontSize: '0.75rem',
        letterSpacing: '0.05em',
      },
    },
  },
  MuiAppBar: {
    styleOverrides: {
      root: {
        boxShadow: 'none',
        borderBottom: '1px solid var(--mui-palette-divider, rgba(0, 0, 0, 0.12))',
      },
    },
  },
};
