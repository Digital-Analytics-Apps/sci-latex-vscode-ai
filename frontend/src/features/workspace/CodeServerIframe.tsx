import CodeIcon from "@mui/icons-material/Code";
import { Box, CircularProgress, Typography } from "@mui/material";
import { useState } from "react";
import { useSelector } from "react-redux";
import type { RootState } from "../../store";

interface CodeServerIframeProps {
  projectId: string;
  taskId?: string;
  mode?: string;
}

export const CodeServerIframe: React.FC<CodeServerIframeProps> = ({
  projectId,
  taskId,
  mode,
}) => {
  const token = useSelector((state: RootState) => state.auth.token);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const baseUrl =
    import.meta.env.VITE_API_URL || "http://localhost:3333/api/v1";

  const params = new URLSearchParams();
  if (token) params.set("token", token);
  if (taskId) params.set("taskId", taskId);
  if (mode) params.set("mode", mode);

  const iframeSrc = `${baseUrl}/editor-proxy/${projectId}?${params.toString()}`;

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
