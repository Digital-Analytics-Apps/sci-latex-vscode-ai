import CodeIcon from "@mui/icons-material/Code";
import { Box, CircularProgress, Typography } from "@mui/material";
import React, { useState } from "react";

interface CodeServerIframeProps {
  projectId: string;
}

export const CodeServerIframe: React.FC<CodeServerIframeProps> = ({
  projectId,
}) => {
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const baseUrl =
    import.meta.env.VITE_API_URL || "http://localhost:3333/api/v1";
  const iframeSrc = `${baseUrl}/editor-proxy/${projectId}`;

  return (
    <Box
      sx={{
        width: "100%",
        height: "100%",
        position: "relative",
        bgcolor: "#0b0f17",
      }}
    >
      {isLoading && (
        <Box
          sx={{
            position: "absolute",
            inset: 0,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 2,
            bgcolor: "background.default",
            zIndex: 10,
          }}
        >
          <CodeIcon sx={{ fontSize: 40, color: "primary.main" }} />
          <CircularProgress size={32} color="primary" />
          <Typography variant="body2" color="text.secondary">
            Carregando ambiente de escrita VS Code (`code-server`)...
          </Typography>
        </Box>
      )}

      <iframe
        src={iframeSrc}
        title="VS Code Editor"
        onLoad={() => setIsLoading(false)}
        style={{
          width: "100%",
          height: "100%",
          border: "none",
          display: "block",
        }}
        sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-downloads"
      />
    </Box>
  );
};
