import { Box } from "@mui/material";
import React from "react";
import sciLatexLogoAnimated from "../../../assets/sci-latex-logo-animated.svg";

interface SciLatexAnimatedLogoProps {
  size?: number | string;
  mode?: "light" | "dark";
}

export const SciLatexAnimatedLogo: React.FC<SciLatexAnimatedLogoProps> = ({
  size = 320,
  mode = "dark",
}) => {
  return (
    <Box
      sx={{
        position: "relative",
        width: size,
        height: size,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: "pointer",
        transition: "transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)",
        "&:hover": {
          transform: "scale(1.05)",
        },
      }}
    >
      <Box
        component="img"
        src={sciLatexLogoAnimated}
        alt="SCI-LaTeX Animated Logo"
        sx={{
          width: "100%",
          height: "100%",
          objectFit: "contain",
          filter:
            mode === "dark"
              ? "drop-shadow(0 0 28px rgba(14, 165, 233, 0.4)) drop-shadow(0 0 16px rgba(49, 94, 245, 0.3))"
              : "drop-shadow(0 12px 28px rgba(0, 0, 0, 0.12))",
        }}
      />
    </Box>
  );
};
