import AccessTimeIcon from "@mui/icons-material/AccessTime";
import ArticleIcon from "@mui/icons-material/Article";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import FilterListIcon from "@mui/icons-material/FilterList";
import GavelIcon from "@mui/icons-material/Gavel";
import HourglassEmptyIcon from "@mui/icons-material/HourglassEmpty";
import RateReviewIcon from "@mui/icons-material/RateReview";
import SearchIcon from "@mui/icons-material/Search";
import VisibilityIcon from "@mui/icons-material/Visibility";
import {
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  FormControl,
  InputAdornment,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  NITStatus,
  PRStatus,
  usePendingReviews,
} from "../../hooks/useReviewQueries";

export const ReviewsListPage = () => {
  const navigate = useNavigate();
  const { data: reviews = [], isLoading } = usePendingReviews();

  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedProjectId, setSelectedProjectId] = useState<string>("ALL");
  const [selectedPRStatus, setSelectedPRStatus] = useState<string>("ALL");
  const [selectedNITStatus, setSelectedNITStatus] = useState<string>("ALL");

  // Lista única de projetos para o filtro
  const projectsList = useMemo(() => {
    const map = new Map<string, string>();
    reviews.forEach((pr) => {
      if (pr.projectId && pr.project?.name) {
        map.set(pr.projectId, pr.project.name);
      }
    });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [reviews]);

  // Métricas (KPIs)
  const metrics = useMemo(() => {
    const pendingReview = reviews.filter(
      (r) => r.status === PRStatus.UNDER_REVIEW,
    ).length;
    const waitingNIT = reviews.filter(
      (r) => r.nitStatus === NITStatus.WAITING_NIT,
    ).length;
    const approved = reviews.filter(
      (r) => r.status === PRStatus.APPROVED,
    ).length;
    const changesRequested = reviews.filter(
      (r) => r.status === PRStatus.CHANGES_REQUESTED,
    ).length;

    return { pendingReview, waitingNIT, approved, changesRequested };
  }, [reviews]);

  // Filtragem combinada em tempo real
  const filteredReviews = useMemo(() => {
    return reviews.filter((pr) => {
      // 1. Busca textual
      if (searchQuery.trim() !== "") {
        const q = searchQuery.toLowerCase();
        const matchTitle = pr.title?.toLowerCase().includes(q);
        const matchAuthor =
          pr.author?.name?.toLowerCase().includes(q) ||
          pr.author?.email?.toLowerCase().includes(q);
        const matchProject = pr.project?.name?.toLowerCase().includes(q);
        const matchId = pr.id?.toLowerCase().includes(q);
        const matchTask = pr.task?.title?.toLowerCase().includes(q);

        if (
          !matchTitle &&
          !matchAuthor &&
          !matchProject &&
          !matchId &&
          !matchTask
        ) {
          return false;
        }
      }

      // 2. Filtro de Projeto
      if (selectedProjectId !== "ALL" && pr.projectId !== selectedProjectId) {
        return false;
      }

      // 3. Filtro de Status de PR
      if (selectedPRStatus !== "ALL" && pr.status !== selectedPRStatus) {
        return false;
      }

      // 4. Filtro de Parecer NIT
      if (selectedNITStatus !== "ALL" && pr.nitStatus !== selectedNITStatus) {
        return false;
      }

      return true;
    });
  }, [
    reviews,
    searchQuery,
    selectedProjectId,
    selectedPRStatus,
    selectedNITStatus,
  ]);

  // Formatação amigável de datas em português
  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "N/D";
    try {
      const date = new Date(dateStr);
      return new Intl.DateTimeFormat("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }).format(date);
    } catch {
      return dateStr;
    }
  };

  const getPRStatusChip = (status: string) => {
    switch (status) {
      case PRStatus.APPROVED:
        return (
          <Chip
            label="Aprovado"
            size="small"
            color="success"
            variant="filled"
            sx={{ fontWeight: 600 }}
          />
        );
      case PRStatus.CHANGES_REQUESTED:
        return (
          <Chip
            label="Ajustes Solicitados"
            size="small"
            color="error"
            variant="filled"
            sx={{ fontWeight: 600 }}
          />
        );
      case PRStatus.UNDER_REVIEW:
        return (
          <Chip
            label="Em Avaliação"
            size="small"
            color="warning"
            variant="filled"
            sx={{ fontWeight: 600 }}
          />
        );
      case PRStatus.MERGED:
        return (
          <Chip
            label="Mesclado (Merged)"
            size="small"
            color="info"
            variant="filled"
            sx={{ fontWeight: 600 }}
          />
        );
      default:
        return <Chip label={status} size="small" variant="outlined" />;
    }
  };

  const getNITStatusChip = (status: string) => {
    switch (status) {
      case NITStatus.APPROVED_NIT:
        return (
          <Chip
            label="NIT Aprovado"
            size="small"
            color="success"
            variant="outlined"
            sx={{ fontWeight: 600 }}
          />
        );
      case NITStatus.REJECTED_NIT:
        return (
          <Chip
            label="NIT Rejeitado"
            size="small"
            color="error"
            variant="outlined"
            sx={{ fontWeight: 600 }}
          />
        );
      case NITStatus.WAITING_NIT:
      default:
        return (
          <Chip
            label="Pendente NIT"
            size="small"
            color="warning"
            variant="outlined"
            sx={{ fontWeight: 600 }}
          />
        );
    }
  };

  if (isLoading) {
    return (
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "60vh",
          gap: 2,
        }}
      >
        <CircularProgress color="primary" size={40} />
        <Typography variant="body2" color="text.secondary">
          Buscando solicitações de revisão e pareceres pendentes...
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3, maxWidth: 1400, margin: "0 auto" }}>
      {/* Cabeçalho da Página */}
      <Box
        sx={{
          mb: 3,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          flexWrap: "wrap",
          gap: 2,
        }}
      >
        <Box>
          <Typography
            variant="h4"
            component="h1"
            sx={{ fontWeight: 700, mb: 0.5 }}
          >
            Painel de Revisão & Pareceres NIT
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Avalie as seções dos artigos científicos submetidos pelos Autores,
            inspecione diffs TeX e emita o parecer formal do NIT.
          </Typography>
        </Box>
        <Chip
          icon={<RateReviewIcon fontSize="small" />}
          label={`${reviews.length} Solicitações Registradas`}
          color="primary"
          sx={{ fontWeight: 700, py: 2, px: 1, fontSize: "0.9rem" }}
        />
      </Box>

      {/* Cards de Métricas (KPIs) */}
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: {
            xs: "1fr",
            sm: "repeat(2, 1fr)",
            md: "repeat(4, 1fr)",
          },
          gap: 2,
          mb: 3,
        }}
      >
        <Card
          variant="outlined"
          sx={{ borderColor: "warning.main", bgcolor: "background.paper" }}
        >
          <CardContent sx={{ py: 1.5, px: 2, "&:last-child": { pb: 1.5 } }}>
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <Box>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ textTransform: "uppercase", fontWeight: 700 }}
                >
                  Em Avaliação
                </Typography>
                <Typography
                  variant="h4"
                  sx={{ fontWeight: 700, color: "warning.main" }}
                >
                  {metrics.pendingReview}
                </Typography>
              </Box>
              <HourglassEmptyIcon color="warning" sx={{ fontSize: 32 }} />
            </Box>
          </CardContent>
        </Card>

        <Card
          variant="outlined"
          sx={{ borderColor: "info.main", bgcolor: "background.paper" }}
        >
          <CardContent sx={{ py: 1.5, px: 2, "&:last-child": { pb: 1.5 } }}>
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <Box>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ textTransform: "uppercase", fontWeight: 700 }}
                >
                  Pendente NIT
                </Typography>
                <Typography
                  variant="h4"
                  sx={{ fontWeight: 700, color: "info.main" }}
                >
                  {metrics.waitingNIT}
                </Typography>
              </Box>
              <GavelIcon color="info" sx={{ fontSize: 32 }} />
            </Box>
          </CardContent>
        </Card>

        <Card
          variant="outlined"
          sx={{ borderColor: "success.main", bgcolor: "background.paper" }}
        >
          <CardContent sx={{ py: 1.5, px: 2, "&:last-child": { pb: 1.5 } }}>
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <Box>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ textTransform: "uppercase", fontWeight: 700 }}
                >
                  Seções Aprovadas
                </Typography>
                <Typography
                  variant="h4"
                  sx={{ fontWeight: 700, color: "success.main" }}
                >
                  {metrics.approved}
                </Typography>
              </Box>
              <CheckCircleIcon color="success" sx={{ fontSize: 32 }} />
            </Box>
          </CardContent>
        </Card>

        <Card
          variant="outlined"
          sx={{ borderColor: "divider", bgcolor: "background.paper" }}
        >
          <CardContent sx={{ py: 1.5, px: 2, "&:last-child": { pb: 1.5 } }}>
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <Box>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ textTransform: "uppercase", fontWeight: 700 }}
                >
                  Ajustes Solicitados
                </Typography>
                <Typography
                  variant="h4"
                  sx={{ fontWeight: 700, color: "error.main" }}
                >
                  {metrics.changesRequested}
                </Typography>
              </Box>
              <FilterListIcon color="action" sx={{ fontSize: 32 }} />
            </Box>
          </CardContent>
        </Card>
      </Box>

      {/* Painel de Busca & Filtros */}
      <Paper
        variant="outlined"
        sx={{ p: 2, mb: 3, bgcolor: "background.paper" }}
      >
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: {
              xs: "1fr",
              sm: "1fr 1fr",
              md: "2fr 1fr 1fr 1fr",
            },
            gap: 2,
            alignItems: "center",
          }}
        >
          <TextField
            fullWidth
            size="small"
            placeholder="Buscar por Título, Autor, Projeto ou ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon fontSize="small" />
                  </InputAdornment>
                ),
              },
            }}
          />

          <FormControl fullWidth size="small">
            <InputLabel>Projeto</InputLabel>
            <Select
              value={selectedProjectId}
              label="Projeto"
              onChange={(e) => setSelectedProjectId(e.target.value)}
            >
              <MenuItem value="ALL">
                Todos os Projetos ({projectsList.length})
              </MenuItem>
              {projectsList.map((p) => (
                <MenuItem key={p.id} value={p.id}>
                  {p.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl fullWidth size="small">
            <InputLabel>Status do PR</InputLabel>
            <Select
              value={selectedPRStatus}
              label="Status do PR"
              onChange={(e) => setSelectedPRStatus(e.target.value)}
            >
              <MenuItem value="ALL">Todos os Status</MenuItem>
              <MenuItem value={PRStatus.UNDER_REVIEW}>Em Avaliação</MenuItem>
              <MenuItem value={PRStatus.CHANGES_REQUESTED}>
                Ajustes Solicitados
              </MenuItem>
              <MenuItem value={PRStatus.APPROVED}>Aprovado</MenuItem>
              <MenuItem value={PRStatus.MERGED}>Mesclado (Merged)</MenuItem>
            </Select>
          </FormControl>

          <FormControl fullWidth size="small">
            <InputLabel>Parecer NIT</InputLabel>
            <Select
              value={selectedNITStatus}
              label="Parecer NIT"
              onChange={(e) => setSelectedNITStatus(e.target.value)}
            >
              <MenuItem value="ALL">Todos os Pareceres</MenuItem>
              <MenuItem value={NITStatus.WAITING_NIT}>Pendente NIT</MenuItem>
              <MenuItem value={NITStatus.APPROVED_NIT}>NIT Aprovado</MenuItem>
              <MenuItem value={NITStatus.REJECTED_NIT}>NIT Rejeitado</MenuItem>
            </Select>
          </FormControl>
        </Box>
      </Paper>

      {/* Tabela Acadêmica de Solicitações */}
      <Card variant="outlined">
        <CardContent sx={{ p: 0 }}>
          <Paper variant="outlined" sx={{ border: "none" }}>
            <Table size="medium">
              <TableHead sx={{ bgcolor: "action.hover" }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700 }}>Projeto & ID</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>
                    Título da Submissão & Seção TeX
                  </TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>
                    Autor Responsável
                  </TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Data de Envio</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Status PR</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Parecer NIT</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700 }}>
                    Ação
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredReviews.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} align="center" sx={{ py: 6 }}>
                      <Typography
                        variant="body1"
                        color="text.secondary"
                        sx={{ mb: 1 }}
                      >
                        Nenhuma solicitação de revisão encontrada.
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Tente ajustar os filtros de busca no painel superior.
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredReviews.map((pr) => (
                    <TableRow
                      key={pr.id}
                      hover
                      sx={{ "&:hover": { bgcolor: "action.hover" } }}
                    >
                      {/* Coluna 1: Projeto & ID */}
                      <TableCell>
                        <Box
                          sx={{
                            display: "flex",
                            flexDirection: "column",
                            gap: 0.5,
                          }}
                        >
                          <Box
                            sx={{
                              display: "flex",
                              alignItems: "center",
                              gap: 1,
                            }}
                          >
                            <ArticleIcon fontSize="small" color="primary" />
                            <Typography
                              variant="subtitle2"
                              sx={{ fontWeight: 700, color: "text.primary" }}
                            >
                              {pr.project?.name || "Projeto Acadêmico"}
                            </Typography>
                          </Box>
                          <Typography
                            variant="caption"
                            color="text.secondary"
                            sx={{ fontFamily: "monospace" }}
                          >
                            PR ID: #{pr.id.slice(0, 8)}
                          </Typography>
                        </Box>
                      </TableCell>

                      {/* Coluna 2: Título da Submissão & Seção TeX */}
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 700 }}>
                          {pr.title}
                        </Typography>
                        <Box
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            gap: 1,
                            mt: 0.5,
                          }}
                        >
                          <Typography variant="caption" color="text.secondary">
                            Seção: {pr.task?.title || pr.taskId || "Seção TeX"}
                          </Typography>
                          {pr.task?.branchName && (
                            <Chip
                              label={pr.task.branchName}
                              size="small"
                              variant="outlined"
                              sx={{
                                height: 18,
                                fontSize: "0.65rem",
                                fontFamily: "monospace",
                              }}
                            />
                          )}
                        </Box>
                      </TableCell>

                      {/* Coluna 3: Autor Responsável */}
                      <TableCell>
                        <Box
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            gap: 1.5,
                          }}
                        >
                          <Avatar
                            sx={{
                              width: 32,
                              height: 32,
                              fontSize: "0.8rem",
                              bgcolor: "primary.main",
                            }}
                          >
                            {pr.author?.name?.charAt(0).toUpperCase() || "A"}
                          </Avatar>
                          <Box>
                            <Typography
                              variant="body2"
                              sx={{ fontWeight: 600 }}
                            >
                              {pr.author?.name || "Autor Não Identificado"}
                            </Typography>
                            <Typography
                              variant="caption"
                              color="text.secondary"
                            >
                              {pr.author?.email || "autor@sci-latex.org"}
                            </Typography>
                          </Box>
                        </Box>
                      </TableCell>

                      {/* Coluna 4: Data de Envio */}
                      <TableCell>
                        <Tooltip
                          title={`Criado em: ${formatDate(pr.createdAt)}`}
                        >
                          <Box
                            sx={{
                              display: "flex",
                              alignItems: "center",
                              gap: 0.8,
                            }}
                          >
                            <AccessTimeIcon fontSize="small" color="action" />
                            <Typography
                              variant="body2"
                              sx={{ fontSize: "0.85rem" }}
                            >
                              {formatDate(pr.sentToNitAt || pr.createdAt)}
                            </Typography>
                          </Box>
                        </Tooltip>
                      </TableCell>

                      {/* Coluna 5: Status PR */}
                      <TableCell>{getPRStatusChip(pr.status)}</TableCell>

                      {/* Coluna 6: Parecer NIT */}
                      <TableCell>{getNITStatusChip(pr.nitStatus)}</TableCell>

                      {/* Coluna 7: Ação */}
                      <TableCell align="right">
                        <Button
                          variant="contained"
                          size="small"
                          color="primary"
                          startIcon={<VisibilityIcon fontSize="small" />}
                          onClick={() => navigate(`/reviews/${pr.id}`)}
                          sx={{
                            textTransform: "none",
                            fontWeight: 600,
                            borderRadius: 1.5,
                          }}
                        >
                          Avaliar (Diff & PDF)
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Paper>
        </CardContent>
      </Card>
    </Box>
  );
};
