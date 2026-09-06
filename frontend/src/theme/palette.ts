import type { PaletteOptions } from "@mui/material/styles";

// Paleta Dark Mode (Obsidian Emerald - Fundo #0b0f17, primária #10b981)
export const darkPalette: PaletteOptions = {
  mode: "dark",
  primary: {
    main: "#10b981", // Emerald 500
    light: "#34d399", // Emerald 400
    dark: "#059669", // Emerald 600
    contrastText: "#042f2e",
  },
  secondary: {
    main: "#0ea5e9", // Sky 500
    light: "#38bdf8",
    dark: "#0284c7",
    contrastText: "#ffffff",
  },
  background: {
    default: "#0b0f17", // Black Obsidian
    paper: "#111827", // Slate Dark
  },
  text: {
    primary: "#f3f4f6",
    secondary: "#9ca3af",
    disabled: "#4b5563",
  },
  divider: "rgba(255, 255, 255, 0.08)",
  action: {
    active: "#10b981",
    hover: "rgba(16, 185, 129, 0.08)",
    selected: "rgba(16, 185, 129, 0.16)",
  },
};

// Paleta Light Mode (Clean Emerald - Fundo #f8fafc, primária #059669)
export const lightPalette: PaletteOptions = {
  mode: "light",
  primary: {
    main: "#059669", // Emerald 600
    light: "#10b981", // Emerald 500
    dark: "#047857", // Emerald 700
    contrastText: "#ffffff",
  },
  secondary: {
    main: "#0284c7", // Sky 600
    light: "#0ea5e9",
    dark: "#0369a1",
    contrastText: "#ffffff",
  },
  background: {
    default: "#f8fafc",
    paper: "#ffffff",
  },
  text: {
    primary: "#0f172a",
    secondary: "#475569",
    disabled: "#94a3b8",
  },
  divider: "rgba(0, 0, 0, 0.08)",
  action: {
    active: "#059669",
    hover: "rgba(5, 150, 105, 0.08)",
    selected: "rgba(5, 150, 105, 0.14)",
  },
};
