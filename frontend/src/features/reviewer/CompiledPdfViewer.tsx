import DownloadIcon from "@mui/icons-material/Download";
import PictureAsPdfIcon from "@mui/icons-material/PictureAsPdf";
import ZoomInIcon from "@mui/icons-material/ZoomIn";
import ZoomOutIcon from "@mui/icons-material/ZoomOut";
import {
  Box,
  Button,
  CircularProgress,
  IconButton,
  Paper,
  Tooltip,
  Typography,
} from "@mui/material";
import React, { useState } from "react";

interface CompiledPdfViewerProps {
  pdfUrl?: string;
  projectId?: string;
}

export const CompiledPdfViewer: React.FC<CompiledPdfViewerProps> = ({
  pdfUrl,
  projectId = "demo-project-1",
}) => {
  const [zoom, setZoom] = useState<number>(100);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const baseUrl =
    import.meta.env.VITE_API_URL || "http://localhost:3333/api/v1";
  const targetPdfUrl = pdfUrl || `${baseUrl}/projects/${projectId}/pdf`;

  const handleZoomIn = () => setZoom((prev) => Math.min(prev + 15, 200));
  const handleZoomOut = () => setZoom((prev) => Math.max(prev - 15, 50));

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
      <Box
        sx={{
          p: 1.5,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          borderBottom: "1px solid",
          borderColor: "divider",
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <PictureAsPdfIcon color="error" fontSize="small" />
          <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
            PDF Oficial Compilado (TeX Live Server)
          </Typography>
        </Box>

        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Tooltip title="Diminuir Zoom">
            <IconButton onClick={handleZoomOut} size="small">
              <ZoomOutIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Typography
            variant="caption"
            sx={{ minWidth: 40, textAlign: "center" }}
          >
            {zoom}%
          </Typography>
          <Tooltip title="Aumentar Zoom">
            <IconButton onClick={handleZoomIn} size="small">
              <ZoomInIcon fontSize="small" />
            </IconButton>
          </Tooltip>

          <Button
            component="a"
            href={targetPdfUrl}
            target="_blank"
            download="compiled-paper.pdf"
            variant="outlined"
            size="small"
            startIcon={<DownloadIcon fontSize="small" />}
          >
            Download PDF
          </Button>
        </Box>
      </Box>

      <Box
        sx={{
          flexGrow: 1,
          position: "relative",
          bgcolor: "#1e293b",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          overflow: "auto",
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
              gap: 1.5,
              bgcolor: "background.paper",
              zIndex: 5,
            }}
          >
            <CircularProgress size={32} color="primary" />
            <Typography variant="body2" color="text.secondary">
              Carregando PDF oficial gerado pelo TeX Live...
            </Typography>
          </Box>
        )}

        <iframe
          src={`${targetPdfUrl}#zoom=${zoom}`}
          title="Compiled TeX PDF Document"
          onLoad={() => setIsLoading(false)}
          style={{
            width: "100%",
            height: "100%",
            border: "none",
            transform: `scale(${zoom / 100})`,
            transformOrigin: "top center",
          }}
        />
      </Box>
    </Paper>
  );
};
