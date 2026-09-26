import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import FilterListIcon from "@mui/icons-material/FilterList";
import GavelIcon from "@mui/icons-material/Gavel";
import HourglassEmptyIcon from "@mui/icons-material/HourglassEmpty";
import RateReviewIcon from "@mui/icons-material/RateReview";
import SearchIcon from "@mui/icons-material/Search";
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  FormControl,
  InputAdornment,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  TextField,
  Typography,
} from "@mui/material";
import type { GridColDef, GridPaginationModel } from "@mui/x-data-grid";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AutoSizer } from "react-virtualized-auto-sizer";
import { GenericDataGrid } from "../../components/common/GenericDataGrid";
import {
  NITStatusChip,
  PRStatusChip,
} from "../../components/common/StatusChips";
import { useDebounce } from "../../hooks/useDebounce";
import { useProjectsList } from "../../hooks/useProjectQueries";
import {
  NITStatus,
  PRStatus,
  type PullRequestDetail,
  usePendingReviews,
} from "../../hooks/useReviewQueries";
import { useUrlFilters } from "../../hooks/useUrlFilters";
import {
  AuthorCell,
  ProjectCell,
  ReviewActionCell,
  SentDateCell,
  SubmissionTitleCell,
} from "./components/ReviewDataGridCells";

export interface ReviewFiltersState {
  projectId: string;
  status: string;
  nitStatus: string;
  search: string;
  page: number;
  limit: number;
}

const DEFAULT_REVIEW_FILTERS: ReviewFiltersState = {
  projectId: "all",
  status: "ALL",
  nitStatus: "ALL",
  search: "",
  page: 1,
  limit: 10,
};

export const ReviewsListPage = () => {
  const navigate = useNavigate();
  const { filters, setFilters, apiParams, resetFilters } = useUrlFilters(
    DEFAULT_REVIEW_FILTERS,
  );

  // Estado local para o input de busca imediato (evita travamento ao digitar)
  const [searchTerm, setSearchTerm] = useState(filters.search);
  const [prevUrlSearch, setPrevUrlSearch] = useState(filters.search);
  const debouncedSearchTerm = useDebounce(searchTerm, 400);

  // Sincroniza o input local durante o render se a busca da URL mudar externamente (sem causar cascading render em useEffect)
  if (prevUrlSearch !== filters.search) {
    setPrevUrlSearch(filters.search);
    setSearchTerm(filters.search);
  }

  // Atualiza os filtros de URL apenas quando o valor com debounce (400ms) estabilizar na digitação
  useEffect(() => {
    if (
      searchTerm === debouncedSearchTerm &&
      debouncedSearchTerm !== filters.search
    ) {
      setFilters({ search: debouncedSearchTerm, page: 1 });
    }
  }, [searchTerm, debouncedSearchTerm, filters.search, setFilters]);

  // Reseta tanto o estado local de busca quanto os filtros da URL
  const handleResetFilters = () => {
    setSearchTerm("");
    resetFilters();
  };

  const { data, isLoading, isFetching } = usePendingReviews(apiParams);

  const { data: allProjects = [] } = useProjectsList();

  const reviews = useMemo(() => data?.pullRequests ?? [], [data?.pullRequests]);
  const totalCount = useMemo(
    () => data?.total ?? reviews.length,
    [data?.total, reviews.length],
  );

  // Lista de projetos para o filtro combinando todos os projetos do usuário, os do resultado e o filtro ativo
  const projectsList = useMemo(() => {
    const map = new Map<string, string>();
    allProjects.forEach((p) => {
      if (p.id && p.name) {
        map.set(p.id, p.name);
      }
    });
    reviews.forEach((pr) => {
      if (pr.projectId && pr.project?.name) {
        map.set(pr.projectId, pr.project.name);
      }
    });
    // Se filters.projectId estiver no URL mas ainda não no mapa, garante fallback para o Select não ficar em branco
    if (
      filters.projectId &&
      filters.projectId !== "all" &&
      !map.has(filters.projectId)
    ) {
      map.set(
        filters.projectId,
        `Projeto (${filters.projectId.slice(0, 8)}...)`,
      );
    }
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [allProjects, reviews, filters.projectId]);

  // Opções válidas de Status do PR
  const prStatusOptions = useMemo(
    () => [
      { value: PRStatus.UNDER_REVIEW, label: "Em Avaliação" },
      { value: PRStatus.CHANGES_REQUESTED, label: "Ajustes Solicitados" },
      { value: PRStatus.APPROVED, label: "Aprovado" },
      { value: PRStatus.MERGED, label: "Mesclado (Merged)" },
      { value: PRStatus.DRAFT, label: "Rascunho (Draft)" },
      { value: PRStatus.CANCELLED, label: "Cancelado" },
    ],
    [],
  );

  // Opções válidas de Parecer NIT
  const nitStatusOptions = useMemo(
    () => [
      { value: NITStatus.WAITING_NIT, label: "Pendente NIT" },
      { value: NITStatus.APPROVED_NIT, label: "NIT Aprovado" },
      { value: NITStatus.REJECTED_NIT, label: "NIT Rejeitado" },
      { value: NITStatus.NOT_REQUIRED, label: "Não Requerido" },
    ],
    [],
  );

  // Normalização do status (maiúsculas/fallback) para evitar valor out-of-range no MUI Select
  const currentStatusValue = useMemo(() => {
    if (!filters.status || filters.status === "ALL") return "ALL";
    const upper = filters.status.toUpperCase();
    const found = prStatusOptions.find((s) => s.value === upper);
    return found ? found.value : filters.status;
  }, [filters.status, prStatusOptions]);

  const currentNitStatusValue = useMemo(() => {
    if (!filters.nitStatus || filters.nitStatus === "ALL") return "ALL";
    const upper = filters.nitStatus.toUpperCase();
    const found = nitStatusOptions.find((s) => s.value === upper);
    return found ? found.value : filters.nitStatus;
  }, [filters.nitStatus, nitStatusOptions]);

  const isFiltered = useMemo(() => {
    return (
      filters.projectId !== "all" ||
      filters.status !== "ALL" ||
      filters.nitStatus !== "ALL" ||
      Boolean(searchTerm.trim()) ||
      Boolean(filters.search.trim())
    );
  }, [filters, searchTerm]);

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

  // Modelo de Paginação conectado aos Filtros da URL
  const paginationModel = useMemo<GridPaginationModel>(() => {
    return {
      page: filters.page - 1,
      pageSize: filters.limit,
    };
  }, [filters.page, filters.limit]);

  const handlePaginationModelChange = (model: GridPaginationModel) => {
    setFilters({
      page: model.page + 1,
      limit: model.pageSize,
    });
  };

  // Definição limpa das colunas do MUI DataGrid usando componentes do domínio do Revisor
  const columns = useMemo<GridColDef<PullRequestDetail>[]>(
    () => [
      {
        field: "project",
        headerName: "Projeto & ID",
        flex: 1.2,
        minWidth: 200,
        renderCell: (params) => <ProjectCell row={params.row} />,
      },
      {
        field: "title",
        headerName: "Título da Submissão & Seção TeX",
        flex: 1.8,
        minWidth: 260,
        renderCell: (params) => <SubmissionTitleCell row={params.row} />,
      },
      {
        field: "author",
        headerName: "Autor Responsável",
        flex: 1.5,
        minWidth: 220,
        renderCell: (params) => <AuthorCell row={params.row} />,
      },
      {
        field: "createdAt",
        headerName: "Data de Envio",
        flex: 1,
        minWidth: 160,
        renderCell: (params) => <SentDateCell row={params.row} />,
      },
      {
        field: "status",
        headerName: "Status PR",
        flex: 1,
        minWidth: 160,
        renderCell: (params) => <PRStatusChip status={params.value} />,
      },
      {
        field: "nitStatus",
        headerName: "Parecer NIT",
        flex: 1,
        minWidth: 150,
        renderCell: (params) => <NITStatusChip status={params.value} />,
      },
      {
        field: "actions",
        headerName: "Ação",
        sortable: false,
        filterable: false,
        align: "right",
        headerAlign: "right",
        flex: 1,
        minWidth: 160,
        renderCell: (params) => (
          <ReviewActionCell
            prId={params.row.id}
            onEvaluate={(id) => navigate(`/reviews/${id}`)}
          />
        ),
      },
    ],
    [navigate],
  );

  return (
    <Box sx={{ p: 3, width: "100%", margin: "0 auto" }}>
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
          label={`${totalCount} Solicitações Registradas`}
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

      {/* Painel de Busca & Filtros Externos Sincronizados com a URL */}
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
              md: isFiltered
                ? "2fr 1.2fr 1.2fr 1.2fr auto"
                : "2fr 1.2fr 1.2fr 1.2fr",
            },
            gap: 2,
            alignItems: "center",
          }}
        >
          <TextField
            fullWidth
            size="small"
            placeholder="Buscar por Título, Autor, Projeto ou ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
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
              value={filters.projectId}
              label="Projeto"
              onChange={(e) =>
                setFilters({ projectId: e.target.value, page: 1 })
              }
            >
              <MenuItem value="all">
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
              value={currentStatusValue}
              label="Status do PR"
              onChange={(e) => setFilters({ status: e.target.value, page: 1 })}
            >
              <MenuItem value="ALL">Todos os Status</MenuItem>
              {prStatusOptions.map((opt) => (
                <MenuItem key={opt.value} value={opt.value}>
                  {opt.label}
                </MenuItem>
              ))}
              {!prStatusOptions.some((o) => o.value === currentStatusValue) &&
                currentStatusValue !== "ALL" && (
                  <MenuItem value={currentStatusValue}>
                    {currentStatusValue}
                  </MenuItem>
                )}
            </Select>
          </FormControl>

          <FormControl fullWidth size="small">
            <InputLabel>Parecer NIT</InputLabel>
            <Select
              value={currentNitStatusValue}
              label="Parecer NIT"
              onChange={(e) =>
                setFilters({ nitStatus: e.target.value, page: 1 })
              }
            >
              <MenuItem value="ALL">Todos os Pareceres</MenuItem>
              {nitStatusOptions.map((opt) => (
                <MenuItem key={opt.value} value={opt.value}>
                  {opt.label}
                </MenuItem>
              ))}
              {!nitStatusOptions.some(
                (o) => o.value === currentNitStatusValue,
              ) &&
                currentNitStatusValue !== "ALL" && (
                  <MenuItem value={currentNitStatusValue}>
                    {currentNitStatusValue}
                  </MenuItem>
                )}
            </Select>
          </FormControl>

          {isFiltered && (
            <Button
              variant="outlined"
              color="secondary"
              size="small"
              onClick={handleResetFilters}
              sx={{ whiteSpace: "nowrap", height: 40 }}
            >
              Limpar Filtros
            </Button>
          )}
        </Box>
      </Paper>

      {/* Tabela Acadêmica de Solicitações com GenericDataGrid & AutoSizer */}
      <Card variant="outlined">
        <CardContent sx={{ p: 0, height: 520, width: "100%" }}>
          <AutoSizer
            renderProp={({ height = 520, width }) => (
              <GenericDataGrid<PullRequestDetail>
                rows={reviews}
                columns={columns}
                getRowId={(row) => row.id}
                loading={isLoading || isFetching}
                totalCount={totalCount}
                paginationModel={paginationModel}
                onPaginationModelChange={handlePaginationModelChange}
                pageSizeOptions={[5, 10, 25, 50]}
                height={height}
                width={width}
                emptyMessage="Nenhuma solicitação de revisão encontrada com os filtros selecionados."
              />
            )}
          />
        </CardContent>
      </Card>
    </Box>
  );
};
