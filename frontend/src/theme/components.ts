import type { Components, Theme } from "@mui/material/styles";

export const componentsOverrides: Components<Omit<Theme, "components">> = {
  MuiCssBaseline: {
    styleOverrides: {
      "*": {
        boxSizing: "border-box",
        margin: 0,
        padding: 0,
      },
      html: {
        WebkitFontSmoothing: "antialiased",
        MozOsxFontSmoothing: "grayscale",
        height: "100%",
        width: "100%",
      },
      body: {
        height: "100%",
        width: "100%",
      },
      "#root": {
        height: "100%",
        width: "100%",
      },
      "code, pre, kbd, samp": {
        fontFamily: "var(--font-mono)",
      },
    },
  },
  MuiButton: {
    styleOverrides: {
      root: {
        borderRadius: "8px",
        padding: "6px 14px",
        boxShadow: "none",
        textTransform: "none",
        fontWeight: 600,
        "&:hover": {
          boxShadow: "none",
        },
      },
      contained: {
        fontWeight: 600,
      },
    },
  },
  MuiPaper: {
    styleOverrides: {
      root: {
        backgroundImage: "none",
        borderRadius: "8px",
        boxShadow: "none",
        border: "1px solid var(--border-color)",
      },
      outlined: {
        borderColor: "var(--border-color)",
      },
    },
  },
  MuiCard: {
    styleOverrides: {
      root: {
        borderRadius: "12px",
        boxShadow: "none",
        border: "1px solid var(--border-color)",
        overflow: "hidden",
      },
    },
  },
  MuiChip: {
    styleOverrides: {
      root: {
        fontWeight: 600,
        borderRadius: "6px",
        height: "22px",
        fontSize: "0.72rem",
      },
      sizeSmall: {
        height: "20px",
        fontSize: "0.68rem",
      },
    },
  },
  MuiTextField: {
    defaultProps: {
      size: "small",
      variant: "outlined",
    },
  },
  MuiOutlinedInput: {
    styleOverrides: {
      root: {
        borderRadius: "8px",
        fontSize: "0.8125rem",
      },
    },
  },
  MuiTableCell: {
    styleOverrides: {
      root: {
        padding: "10px 12px",
        fontSize: "0.8125rem",
        borderBottom: "1px solid var(--border-color)",
      },
      head: {
        fontWeight: 600,
        textTransform: "uppercase",
        fontSize: "0.7rem",
        letterSpacing: "0.05em",
      },
    },
  },
  MuiDrawer: {
    styleOverrides: {
      paper: {
        borderRight: "1px solid var(--border-color)",
      },
    },
  },
  MuiAppBar: {
    styleOverrides: {
      root: {
        boxShadow: "none",
        borderBottom: "1px solid var(--border-color)",
      },
    },
  },
};
