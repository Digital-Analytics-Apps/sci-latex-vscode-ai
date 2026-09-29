import type { PaletteOptions } from "@mui/material/styles";
import { colors, sciLatexTokens } from "./tokens";

const darkTokens = sciLatexTokens.dark;
const lightTokens = sciLatexTokens.light;

// Paleta Dark Mode (Tailwind Gray 950 + Sky 400 Acento + Emerald/Amber/Red)
export const darkPalette: PaletteOptions = {
  mode: "dark",
  primary: {
    main: darkTokens.primary.main,
    light: darkTokens.primary.hover,
    dark: darkTokens.primary.active,
    contrastText: darkTokens.primary.contrast,
  },
  secondary: {
    main: colors.indigo[400],
    light: colors.indigo[300],
    dark: colors.indigo[600],
    contrastText: colors.white,
  },
  error: {
    main: darkTokens.error.main,
    light: colors.red[300],
    dark: colors.red[600],
    contrastText: colors.white,
  },
  warning: {
    main: darkTokens.warning.main,
    light: colors.amber[300],
    dark: colors.amber[600],
    contrastText: colors.gray[950],
  },
  info: {
    main: darkTokens.primary.main,
    light: colors.sky[300],
    dark: colors.sky[600],
    contrastText: colors.gray[950],
  },
  success: {
    main: darkTokens.success.main,
    light: colors.emerald[300],
    dark: colors.emerald[600],
    contrastText: colors.gray[950],
  },
  grey: colors.gray,
  background: {
    default: darkTokens.background.default, // #030712 (Gray 950)
    paper: darkTokens.background.paper,     // #111827 (Gray 900)
  },
  text: {
    primary: darkTokens.text.primary,       // #f9fafb (Gray 50)
    secondary: darkTokens.text.secondary,   // #d1d5db (Gray 300)
    disabled: darkTokens.text.disabled,     // #6b7280 (Gray 500)
  },
  divider: darkTokens.border.default,       // #1f2937 (Gray 800)
  action: {
    active: darkTokens.primary.main,
    hover: "rgba(56, 189, 248, 0.08)",
    selected: "rgba(56, 189, 248, 0.16)",
  },
};

// Paleta Light Mode (Tailwind Clean White/Gray-50 + Sky 600 Acento)
export const lightPalette: PaletteOptions = {
  mode: "light",
  primary: {
    main: lightTokens.primary.main,
    light: lightTokens.primary.hover,
    dark: lightTokens.primary.active,
    contrastText: lightTokens.primary.contrast,
  },
  secondary: {
    main: colors.indigo[600],
    light: colors.indigo[500],
    dark: colors.indigo[700],
    contrastText: colors.white,
  },
  error: {
    main: lightTokens.error.main,
    light: colors.red[500],
    dark: colors.red[700],
    contrastText: colors.white,
  },
  warning: {
    main: lightTokens.warning.main,
    light: colors.amber[500],
    dark: colors.amber[700],
    contrastText: colors.white,
  },
  info: {
    main: lightTokens.primary.main,
    light: colors.sky[500],
    dark: colors.sky[700],
    contrastText: colors.white,
  },
  success: {
    main: lightTokens.success.main,
    light: colors.emerald[500],
    dark: colors.emerald[700],
    contrastText: colors.white,
  },
  grey: colors.gray,
  background: {
    default: lightTokens.background.default, // #ffffff (White)
    paper: lightTokens.background.paper,     // #ffffff (White)
  },
  text: {
    primary: lightTokens.text.primary,       // #030712 (Gray 950 - Alta Legibilidade)
    secondary: lightTokens.text.secondary,   // #4b5563 (Gray 600)
    disabled: lightTokens.text.disabled,     // #9ca3af (Gray 400)
  },
  divider: lightTokens.border.default,       // #e5e7eb (Gray 200)
  action: {
    active: lightTokens.primary.main,
    hover: "rgba(2, 132, 199, 0.08)",
    selected: "rgba(2, 132, 199, 0.14)",
  },
};
