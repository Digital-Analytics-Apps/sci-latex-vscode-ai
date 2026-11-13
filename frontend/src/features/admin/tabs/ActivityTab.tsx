import {
  Box,
  Chip,
  CircularProgress,
  Divider,
  Paper,
  Stack,
  Typography,
} from "@mui/material";
import {
  BookOpen,
  Cpu,
  History,
  Info,
  ShieldAlert,
  Users,
} from "lucide-react";
import React, { useState } from "react";
import { useAdminActivity } from "../hooks/useAdminCenterQueries";

interface ActivityTabProps {
  autoRefresh: boolean;
}

export const ActivityTab: React.FC<ActivityTabProps> = ({ autoRefresh }) => {
  const { data, isLoading, isError } = useAdminActivity(autoRefresh);
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");

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
        <Typography color="error">Erro ao carregar linha do tempo de atividades.</Typography>
      </Paper>
    );
  }

  const filteredEvents = data.events.filter((ev) =>
    selectedCategory === "ALL" ? true : ev.category === selectedCategory
  );

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "EDITORIAL":
        return <BookOpen size={16} color="#8b5cf6" />;
      case "COLLABORATION":
        return <Users size={16} color="#3b82f6" />;
      case "COMPILER":
        return <Cpu size={16} color="#ea580c" />;
      case "SECURITY":
        return <ShieldAlert size={16} color="#ef4444" />;
      default:
        return <Info size={16} />;
    }
  };

  const getSeverityChip = (severity: "INFO" | "WARNING" | "ERROR") => {
    const colorMap = {
      INFO: "default" as const,
      WARNING: "warning" as const,
      ERROR: "error" as const,
    };
    return <Chip label={severity} size="small" color={colorMap[severity]} variant="outlined" />;
  };

  return (
    <Stack spacing={3}>
      {/* Filtros de Categoria */}
      <Paper sx={{ p: 2, borderRadius: 2 }}>
        <Stack
          direction="row"
          spacing={1}
          sx={{ alignItems: "center", flexWrap: "wrap" }}
        >
          <Typography variant="body2" sx={{ fontWeight: 600, mr: 1 }}>
            Filtrar por Categoria:
          </Typography>
          {["ALL", "EDITORIAL", "COLLABORATION", "COMPILER", "SECURITY"].map((cat) => (
            <Chip
              key={cat}
              label={cat === "ALL" ? "Todos os Eventos" : cat}
              color={selectedCategory === cat ? "primary" : "default"}
              onClick={() => setSelectedCategory(cat)}
              sx={{ cursor: "pointer", fontWeight: 600 }}
            />
          ))}
        </Stack>
      </Paper>

      {/* Linha do Tempo de Eventos */}
      <Paper sx={{ p: 3, borderRadius: 2 }}>
        <Stack direction="row" spacing={1} sx={{ alignItems: "center", mb: 2 }}>
          <History size={20} />
          <Typography variant="h6" sx={{ fontWeight: 700 }}>
            Linha do Tempo de Auditoria e Eventos Operacionais
          </Typography>
        </Stack>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Registro cronológico imutável de ações críticas, revisões, compilações e segurança.
        </Typography>

        {filteredEvents.length === 0 ? (
          <Box sx={{ py: 6, textAlign: "center" }}>
            <Typography color="text.secondary">Nenhum evento registrado nesta categoria.</Typography>
          </Box>
        ) : (
          <Stack spacing={2} divider={<Divider flexItem />}>
            {filteredEvents.map((ev) => (
              <Box key={ev.id} sx={{ py: 0.5 }}>
                <Stack
                  direction="row"
                  sx={{
                    alignItems: "center",
                    justifyContent: "space-between",
                    mb: 0.5,
                  }}
                >
                  <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
                    {getCategoryIcon(ev.category)}
                    <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                      {ev.title}
                    </Typography>
                    <Chip label={ev.category} size="small" sx={{ fontSize: "0.7rem", height: 20 }} />
                  </Stack>
                  <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
                    {getSeverityChip(ev.severity)}
                    <Typography variant="caption" color="text.secondary">
                      {new Date(ev.timestamp).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                        second: "2-digit",
                      })}
                    </Typography>
                  </Stack>
                </Stack>
                <Typography variant="body2" color="text.secondary">
                  {ev.description}
                </Typography>
              </Box>
            ))}
          </Stack>
        )}
      </Paper>
    </Stack>
  );
};
