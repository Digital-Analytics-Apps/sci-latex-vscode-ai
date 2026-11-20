import type { PaletteOptions } from '@mui/material/styles';
import { alpha } from '@mui/material/styles';
import { colors } from './tokens';

export const lightPalette: PaletteOptions = {
  mode: 'light',
  common: {
    black: colors.black,
    white: colors.white,
  },
  primary: {
    main: colors.indigo[600],
    light: colors.indigo[400],
    dark: colors.indigo[800],
    contrastText: colors.white,
  },
  secondary: {
    main: colors.cyan[700],
    light: colors.cyan[500],
    dark: colors.cyan[900],
    contrastText: colors.white,
  },
  error: {
    main: colors.red[700],
    light: colors.red[400],
    dark: colors.red[800],
    contrastText: colors.white,
  },
  warning: {
    main: colors.orange[800],
    light: colors.orange[500],
    dark: colors.orange[900],
    contrastText: colors.white,
  },
  info: {
    main: colors.sky[700],
    light: colors.sky[500],
    dark: colors.sky[900],
    contrastText: colors.white,
  },
  success: {
    main: colors.green[800],
    light: colors.green[500],
    dark: colors.green[900],
    contrastText: colors.white,
  },
  grey: colors.grey,
  contrastThreshold: 3,
  tonalOffset: 0.2,
  text: {
    primary: alpha(colors.black, 0.87),
    secondary: alpha(colors.black, 0.6),
    disabled: alpha(colors.black, 0.38),
  },
  divider: alpha(colors.black, 0.08),
  background: {
    paper: colors.background.paperLight,
    default: colors.background.light,
  },
  action: {
    active: alpha(colors.black, 0.54),
    hover: alpha(colors.black, 0.04),
    hoverOpacity: 0.04,
    selected: alpha(colors.black, 0.08),
    selectedOpacity: 0.08,
    disabled: alpha(colors.black, 0.26),
    disabledBackground: alpha(colors.black, 0.12),
    disabledOpacity: 0.38,
    focus: alpha(colors.black, 0.12),
    focusOpacity: 0.12,
    activatedOpacity: 0.12,
  },
};

export const darkPalette: PaletteOptions = {
  mode: 'dark',
  common: {
    black: colors.black,
    white: colors.white,
  },
  primary: {
    main: colors.indigo[200],
    light: colors.indigo[100],
    dark: colors.indigo[400],
    contrastText: alpha(colors.black, 0.87),
  },
  secondary: {
    main: colors.cyan[300],
    light: colors.cyan[100],
    dark: colors.cyan[500],
    contrastText: alpha(colors.black, 0.87),
  },
  error: {
    main: colors.red[500],
    light: colors.red[300],
    dark: colors.red[700],
    contrastText: colors.white,
  },
  warning: {
    main: colors.orange[400],
    light: colors.orange[300],
    dark: colors.orange[700],
    contrastText: alpha(colors.black, 0.87),
  },
  info: {
    main: colors.sky[400],
    light: colors.sky[300],
    dark: colors.sky[700],
    contrastText: alpha(colors.black, 0.87),
  },
  success: {
    main: colors.green[400],
    light: colors.green[300],
    dark: colors.green[700],
    contrastText: alpha(colors.black, 0.87),
  },
  grey: colors.grey,
  contrastThreshold: 3,
  tonalOffset: 0.2,
  text: {
    primary: colors.white,
    secondary: alpha(colors.white, 0.7),
    disabled: alpha(colors.white, 0.5),
  },
  divider: alpha(colors.white, 0.08),
  background: {
    paper: colors.background.paperDark,
    default: colors.background.dark,
  },
  action: {
    active: colors.white,
    hover: alpha(colors.white, 0.08),
    hoverOpacity: 0.08,
    selected: alpha(colors.white, 0.16),
    selectedOpacity: 0.16,
    disabled: alpha(colors.white, 0.3),
    disabledBackground: alpha(colors.white, 0.12),
    disabledOpacity: 0.38,
    focus: alpha(colors.white, 0.12),
    focusOpacity: 0.12,
    activatedOpacity: 0.24,
  },
};

export const getPalette = (mode: 'light' | 'dark', _preset?: string): PaletteOptions => {
  return mode === 'dark' ? darkPalette : lightPalette;
};
