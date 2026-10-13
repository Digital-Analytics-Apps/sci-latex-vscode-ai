import CalendarTodayIcon from "@mui/icons-material/CalendarToday";
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Grid,
  Paper,
  Typography,
} from "@mui/material";
import type { AcademicPeriod } from "../../../types/academic-period.types";

interface AcademicPeriodsSectionProps {
  periods: AcademicPeriod[];
  isLoadingPeriods: boolean;
  onOpenCreatePeriod: () => void;
}

export const AcademicPeriodsSection = ({
  periods,
  isLoadingPeriods,
  onOpenCreatePeriod,
}: AcademicPeriodsSectionProps) => {
  const renderPeriodsContent = () => {
    if (isLoadingPeriods) {
      return (
        <Box
          sx={{
            p: 4,
            display: "flex",
            justifyContent: "center",
            width: "100%",
          }}
        >
          <CircularProgress size={32} />
        </Box>
      );
    }

    if (periods.length === 0) {
      return (
        <Grid size={{ xs: 12 }}>
          <Paper sx={{ p: 4, textAlign: "center" }} variant="outlined">
            <Typography variant="body1" color="text.secondary">
              Nenhum ciclo acadêmico cadastrado até o momento.
            </Typography>
          </Paper>
        </Grid>
      );
    }

    return periods.map((p) => (
      <Grid key={p.id} size={{ xs: 12, md: 6 }}>
        <Card variant="outlined">
          <CardContent sx={{ p: 3 }}>
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                mb: 1.5,
              }}
            >
              <Typography variant="h6" sx={{ fontWeight: 700 }}>
                {p.name}
              </Typography>
              <Chip
                label={p.status || "ATIVO"}
                color="success"
                size="small"
                sx={{ fontWeight: 700 }}
              />
            </Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Período: {new Date(p.startDate).toLocaleDateString("pt-BR")} até{" "}
              {new Date(p.endDate).toLocaleDateString("pt-BR")}
            </Typography>
            <Box
              sx={{
                p: 2,
                bgcolor: "background.default",
                borderRadius: 1,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ fontWeight: 700 }}
              >
                META GLOBAL DE ARTIGOS
              </Typography>
              <Typography
                variant="h6"
                color="warning.main"
                sx={{ fontWeight: 800 }}
              >
                {p.targetArticlesCount} Artigos Concluídos
              </Typography>
            </Box>
          </CardContent>
        </Card>
      </Grid>
    ));
  };

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 2,
        }}
      >
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 800, mb: 0.5 }}>
            Gestão dos Ciclos Acadêmicos
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Cadastre novos ciclos e acompanhe as metas institucionais de
            publicação.
          </Typography>
        </Box>

        <Button
          variant="contained"
          color="warning"
          size="small"
          startIcon={<CalendarTodayIcon fontSize="small" />}
          onClick={onOpenCreatePeriod}
        >
          Novo Ciclo Acadêmico
        </Button>
      </Box>

      {/* Listagem de Ciclos Acadêmicos Cadastrados */}
      <Grid container spacing={3}>
        {renderPeriodsContent()}
      </Grid>
    </Box>
  );
};
