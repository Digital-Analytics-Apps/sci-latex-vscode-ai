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
    dark: '#121212',
    light: common.white,
  },
} as const;

export const muiColors = {
  blue,
  grey,
} as const;

export type ThemePreset = 'blue';
