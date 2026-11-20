import {
  amber,
  blue,
  common,
  cyan,
  deepPurple,
  green,
  grey,
  indigo,
  lightBlue,
  orange,
  pink,
  purple,
  red,
  teal,
} from '@mui/material/colors';

// Mapeamento canônico das cores oficiais da biblioteca Material UI (MUI)
export const colors = {
  blue,
  indigo,
  purple,
  violet: deepPurple,
  emerald: green,
  green,
  rose: red,
  red,
  cyan,
  amber,
  teal,
  fuchsia: purple,
  sky: lightBlue,
  orange,
  pink,
  slate: grey,
  gray: grey,
  grey,
  white: common.white,
  black: common.black,
  background: {
    dark: '#0b0f17',
    paperDark: '#111827',
    light: '#f8fafc',
    paperLight: common.white,
  },
} as const;

export const muiColors = {
  indigo,
  blue,
  cyan,
  grey,
} as const;

export type ThemePreset = 'indigo' | 'blue';
