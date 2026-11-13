import {
  Box,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Grid,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import {
  Activity,
  CheckCircle,
  FileText,
  Radio,
  Server,
  Zap,
} from "lucide-react";
import React from "react";
import { useAdminCollaboration } from "../hooks/useAdminCenterQueries";

interface CollaborationTabProps {
  autoRefresh: boolean;
}

export const CollaborationTab: React.FC<CollaborationTabProps> = ({ autoRefresh }) => {
  const { data, isLoading, isError } = useAdminCollaboration(autoRefresh);

  if (isLoading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (isError || !data) {
    return (
      <Paper sx={{ p: 4, textAlign: "center" }}>
        <Typography color="error">Erro ao carregar dados de colaboração em tempo real.</Typography>
      </Paper>
    );
  }

  return (
    <Stack spacing={3}>
      {/* 1. Indicadores em Tempo Real da Colaboração */}
      <Grid container spacing={2.5}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card sx={{ height: "100%", borderRadius: 2 }}>
            <CardContent>
              <Stack direction="row" spacing={1} sx={{ alignItems: "center", mb: 0.5 }}>
                <FileText size={18} color="#3b82f6" />
                <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>
                  Artigos em Edição
                </Typography>
              </Stack>
              <Typography variant="h4" color="primary.main" sx={{ fontWeight: 800 }}>
                {data.activeDocumentsCount}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Documentos abertos em RAM
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card sx={{ height: "100%", borderRadius: 2 }}>
            <CardContent>
              <Stack direction="row" spacing={1} sx={{ alignItems: "center", mb: 0.5 }}>
                <Radio size={18} color="#06b6d4" />
                <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>
                  Usuários no Editor
                </Typography>
              </Stack>
              <Typography variant="h4" color="info.main" sx={{ fontWeight: 800 }}>
                {data.connectedUsersCount}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Autores conectados nas salas
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card sx={{ height: "100%", borderRadius: 2 }}>
            <CardContent>
              <Stack direction="row" spacing={1} sx={{ alignItems: "center", mb: 0.5 }}>
                <Activity size={18} color="#10b981" />
                <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>
                  Throughput OT
                </Typography>
              </Stack>
              <Typography variant="h4" color="success.main" sx={{ fontWeight: 800 }}>
                {data.otOperationsPerSecond.toFixed(1)}{" "}
                <Typography component="span" variant="body1">
                  ops/s
                </Typography>
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Deltas de digitação processados
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card sx={{ height: "100%", borderRadius: 2 }}>
            <CardContent>
              <Stack direction="row" spacing={1} sx={{ alignItems: "center", mb: 0.5 }}>
                <Zap size={18} color="#f59e0b" />
                <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>
                  Latência em RAM
                </Typography>
              </Stack>
              <Typography variant="h4" color="warning.main" sx={{ fontWeight: 800 }}>
                {data.avgMemoryProcessingMs} ms
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Processamento local no Pod Dono
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* 2. Distribuição de Documentos por Pod Dono */}
      <Paper sx={{ p: 3, borderRadius: 2 }}>
        <Stack direction="row" spacing={1} sx={{ alignItems: "center", mb: 2 }}>
          <Server size={20} />
          <Typography variant="h6" sx={{ fontWeight: 700 }}>
            Distribuição de Documentos e Carga por Pod Dono
          </Typography>
        </Stack>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Supervisão de autoridade Single-Writer (ADR-007.1) e leases em memória no cluster.
        </Typography>

        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 700 }}>Identificador do Pod</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Documentos em Memória</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Uso de Memória Heap</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Checkpoints Pendentes</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Status do Pod</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {data.documentsByPod.map((pod) => (
                <TableRow key={pod.podName}>
                  <TableCell>
                    <Typography variant="body2" sx={{ fontWeight: 600, fontFamily: "monospace" }}>
                      {pod.podName}
                    </Typography>
                  </TableCell>
                  <TableCell>{pod.documentsCount} artigos</TableCell>
                  <TableCell>{pod.memoryUsageMb} MB</TableCell>
                  <TableCell>
                    {data.pendingCheckpointsCount > 0 ? (
                      <Chip label={`${data.pendingCheckpointsCount} pendentes`} size="small" color="warning" />
                    ) : (
                      <Chip label="Sincronizado (ACID)" size="small" color="success" variant="outlined" />
                    )}
                  </TableCell>
                  <TableCell>
                    <Chip icon={<CheckCircle size={14} />} label="Ativo & Conectado" size="small" color="success" />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </Stack>
  );
};
