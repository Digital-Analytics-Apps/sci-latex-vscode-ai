import { Box, Paper, Typography } from "@mui/material";
import React from "react";

interface LatexDiffViewerProps {
  diffContent?: string;
}

export const LatexDiffViewer: React.FC<LatexDiffViewerProps> = ({
  diffContent,
}) => {
  const hasDiff = Boolean(diffContent && diffContent.trim());
  const diffLines = hasDiff ? (diffContent as string).split("\n") : [];

  return (
    <Paper
      variant="outlined"
      sx={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        bgcolor: "background.paper",
        overflow: "hidden",
      }}
    >
      <Box sx={{ p: 1.5, borderBottom: "1px solid", borderColor: "divider" }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
          Diff do Código LaTeX (Alterações Submetidas pelo Autor)
        </Typography>
      </Box>

      <Box
        sx={{
          flexGrow: 1,
          overflow: "auto",
          p: 1.5,
          fontFamily: 'monospace, "Courier New", Courier',
          fontSize: "0.8rem",
          lineHeight: 1.6,
          bgcolor: "#090d14",
          display: hasDiff ? "block" : "flex",
          alignItems: hasDiff ? "stretch" : "center",
          justifyContent: hasDiff ? "stretch" : "center",
        }}
      >
        {!hasDiff ? (
          <Typography variant="body2" color="text.secondary">
            Nenhuma alteração de diff registrada para este Pull Request.
          </Typography>
        ) : (
          diffLines.map((line, index) => {
            const isAddition = line.startsWith("+") && !line.startsWith("+++");
            const isDeletion = line.startsWith("-") && !line.startsWith("---");
            const isHeader =
              line.startsWith("@@") ||
              line.startsWith("---") ||
              line.startsWith("+++");

            return (
              <Box
                key={index}
                sx={{
                  px: 1,
                  py: 0.2,
                  borderRadius: "2px",
                  bgcolor: isAddition
                    ? "rgba(16, 185, 129, 0.15)"
                    : isDeletion
                      ? "rgba(239, 68, 68, 0.15)"
                      : isHeader
                        ? "rgba(14, 165, 233, 0.1)"
                        : "transparent",
                  color: isAddition
                    ? "#34d399"
                    : isDeletion
                      ? "#f87171"
                      : isHeader
                        ? "#38bdf8"
                        : "text.primary",
                  display: "flex",
                  gap: 1,
                }}
              >
                <Typography
                  component="span"
                  sx={{
                    width: 32,
                    color: "text.disabled",
                    fontSize: "0.75rem",
                    userSelect: "none",
                  }}
                >
                  {index + 1}
                </Typography>
                <Typography
                  component="span"
                  sx={{
                    fontFamily: "inherit",
                    fontSize: "inherit",
                    whiteSpace: "pre-wrap",
                  }}
                >
                  {line}
                </Typography>
              </Box>
            );
          })
        )}
      </Box>
    </Paper>
  );
};
