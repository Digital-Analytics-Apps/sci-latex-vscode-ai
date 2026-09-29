import { createTheme, CssBaseline, ThemeProvider } from "@mui/material";
import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { componentsOverrides } from "./components";
import { darkPalette, lightPalette } from "./palette";
import { sciLatexTokens, tailwindFonts } from "./tokens";
import { typography } from "./typography";

// Re-export Tokens e Cores do SCI-LaTeX
export * from "./tokens";

// Importação das fontes 100% locais (Self-Hosted, sem chamadas externas CDN)
import "@fontsource/inter/400.css";
import "@fontsource/inter/500.css";
import "@fontsource/inter/600.css";
import "@fontsource/inter/700.css";
import "@fontsource/jetbrains-mono/400.css";
import "@fontsource/jetbrains-mono/500.css";
import "@fontsource/jetbrains-mono/600.css";
import "@fontsource/jetbrains-mono/700.css";
import "@fontsource/plus-jakarta-sans/400.css";
import "@fontsource/plus-jakarta-sans/500.css";
import "@fontsource/plus-jakarta-sans/600.css";
import "@fontsource/plus-jakarta-sans/700.css";

type ColorMode = "dark" | "light";

interface ThemeContextType {
  mode: ColorMode;
  toggleColorMode: () => void;
  setMode: (mode: ColorMode) => void;
}

const ThemeContext = createContext<ThemeContextType>({
  mode: "dark",
  toggleColorMode: () => {},
  setMode: () => {},
});

export const useColorMode = () => useContext(ThemeContext);

export const ThemeContextProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [mode, setModeState] = useState<ColorMode>(() => {
    const saved = localStorage.getItem("theme_mode");
    return saved === "light" || saved === "dark" ? saved : "dark";
  });

  const toggleColorMode = () => {
    setModeState((prev) => {
      const next = prev === "dark" ? "light" : "dark";
      localStorage.setItem("theme_mode", next);
      return next;
    });
  };

  const setMode = (newMode: ColorMode) => {
    setModeState(newMode);
    localStorage.setItem("theme_mode", newMode);
  };

  useEffect(() => {
    const root = document.documentElement;
    const tokens = sciLatexTokens[mode];

    root.setAttribute("data-theme", mode);
    root.style.setProperty("--font-sans", tailwindFonts.sans);
    root.style.setProperty("--font-mono", tailwindFonts.mono);

    root.style.setProperty("--bg-default", tokens.background.default);
    root.style.setProperty("--bg-paper", tokens.background.paper);
    root.style.setProperty("--text-primary", tokens.text.primary);
    root.style.setProperty("--text-secondary", tokens.text.secondary);
    root.style.setProperty("--border-color", tokens.border.default);
    root.style.setProperty("--primary-main", tokens.primary.main);
    root.style.setProperty("--code-bg", tokens.code.background);
    root.style.setProperty("--code-fg", tokens.code.foreground);
  }, [mode]);

  const theme = useMemo(() => {
    const palette = mode === "dark" ? darkPalette : lightPalette;
    return createTheme({
      cssVariables: true,
      palette,
      typography,
      shape: {
        borderRadius: 8,
      },
      components: componentsOverrides,
    });
  }, [mode]);

  return (
    <ThemeContext.Provider value={{ mode, toggleColorMode, setMode }}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </ThemeProvider>
    </ThemeContext.Provider>
  );
};
