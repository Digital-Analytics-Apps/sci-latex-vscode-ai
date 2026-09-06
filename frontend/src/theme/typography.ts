import type { TypographyVariantsOptions } from "@mui/material/styles";

export const typography: TypographyVariantsOptions = {
  fontFamily: [
    '"Plus Jakarta Sans"',
    '"Inter"',
    "-apple-system",
    "BlinkMacSystemFont",
    '"Segoe UI"',
    "Roboto",
    "sans-serif",
  ].join(","),
  fontSize: 13, // Base compacta para alta densidade visual técnica
  htmlFontSize: 16,
  h1: {
    fontSize: "1.75rem",
    fontWeight: 700,
    lineHeight: 1.2,
    letterSpacing: "-0.02em",
  },
  h2: {
    fontSize: "1.4rem",
    fontWeight: 700,
    lineHeight: 1.25,
    letterSpacing: "-0.015em",
  },
  h3: {
    fontSize: "1.2rem",
    fontWeight: 600,
    lineHeight: 1.3,
  },
  h4: {
    fontSize: "1.05rem",
    fontWeight: 600,
    lineHeight: 1.35,
  },
  h5: {
    fontSize: "0.95rem",
    fontWeight: 600,
    lineHeight: 1.4,
  },
  h6: {
    fontSize: "0.875rem",
    fontWeight: 600,
    lineHeight: 1.4,
  },
  subtitle1: {
    fontSize: "0.875rem",
    fontWeight: 500,
    lineHeight: 1.4,
  },
  subtitle2: {
    fontSize: "0.8125rem",
    fontWeight: 500,
    lineHeight: 1.4,
  },
  body1: {
    fontSize: "0.8125rem",
    lineHeight: 1.5,
  },
  body2: {
    fontSize: "0.75rem",
    lineHeight: 1.45,
  },
  button: {
    fontSize: "0.8125rem",
    fontWeight: 600,
    textTransform: "none",
    letterSpacing: "0.01em",
  },
  caption: {
    fontSize: "0.7rem",
    lineHeight: 1.3,
  },
  overline: {
    fontSize: "0.65rem",
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: "0.08em",
  },
};
