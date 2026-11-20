import { createTheme, CssBaseline, ThemeProvider } from '@mui/material';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { componentsOverrides } from './components';
import { darkPalette, lightPalette } from './palette';
import { typography } from './typography';

// Re-export Tokens e Cores oficiais do Material UI
export * from './tokens';

// Fontes locais instaladas
import '@fontsource/inter/300.css';
import '@fontsource/inter/400.css';
import '@fontsource/inter/500.css';
import '@fontsource/inter/700.css';
import '@fontsource/jetbrains-mono/400.css';
import '@fontsource/jetbrains-mono/500.css';

export type ColorMode = 'dark' | 'light';

// ============================================================================
// CRIAÇÃO DO TEMA OFICIAL MUI (Material UI v6 / v5 Canonical Architecture)
// https://mui.com/material-ui/customization/theming/
// https://mui.com/material-ui/customization/css-theme-variables/usage/
// ============================================================================
export const muiTheme = createTheme({
  cssVariables: {
    colorSchemeSelector: 'data-mui-color-scheme',
  },
  colorSchemes: {
    light: {
      palette: lightPalette,
    },
    dark: {
      palette: darkPalette,
    },
  },
  typography,
  shape: {
    borderRadius: 4,
  },
  components: componentsOverrides,
});

interface ThemeContextType {
  mode: ColorMode;
  toggleColorMode: () => void;
  setMode: (mode: ColorMode) => void;
}

const ThemeContext = createContext<ThemeContextType>({
  mode: 'dark',
  toggleColorMode: () => {},
  setMode: () => {},
});

export const useColorMode = () => useContext(ThemeContext);

export const ThemeContextProvider: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  const [mode, setModeState] = useState<ColorMode>(() => {
    const saved = localStorage.getItem('theme_mode');
    return saved === 'light' || saved === 'dark' ? saved : 'dark';
  });

  const toggleColorMode = () => {
    setModeState((prev) => {
      const next = prev === 'dark' ? 'light' : 'dark';
      localStorage.setItem('theme_mode', next);
      return next;
    });
  };

  const setMode = (newMode: ColorMode) => {
    setModeState(newMode);
    localStorage.setItem('theme_mode', newMode);
  };

  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute('data-theme', mode);
    root.setAttribute('data-mui-color-scheme', mode);
  }, [mode]);

  return (
    <ThemeContext.Provider value={{ mode, toggleColorMode, setMode }}>
      <ThemeProvider theme={muiTheme} defaultMode={mode}>
        <CssBaseline />
        {children}
      </ThemeProvider>
    </ThemeContext.Provider>
  );
};
