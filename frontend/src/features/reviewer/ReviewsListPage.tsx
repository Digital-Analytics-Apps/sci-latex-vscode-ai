import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import FilterListIcon from "@mui/icons-material/FilterList";
import GavelIcon from "@mui/icons-material/Gavel";
import HourglassEmptyIcon from "@mui/icons-material/HourglassEmpty";
import { Grid } from "@mui/material";
import type { GridColDef, GridPaginationModel } from "@mui/x-data-grid";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AutoSizer } from "react-virtualized-auto-sizer";
import { createDateColumn } from "../../components/common/dataGridColumns";
import { GenericDataGrid } from "../../components/common/GenericDataGrid";
import { MetricCard } from "../../components/common/MetricCard";
import { PageContainer } from "../../components/common/PageContainer";
import {
  NITStatusChip,
  PRStatusChip,
} from "../../components/common/StatusChips";
import { TableContainer } from "../../components/common/TableContainer";
import {
  TableHeaderToolbar,
  type TableSelectOption,
} from "../../components/common/TableFilters";
import { WelcomeHeader } from "../../components/common/WelcomeHeader";
import { useDashboardSummaryQuery } from "../../hooks/useDashboardQueries";
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

  // Busca cirúrgica de métricas de KPI do Dashboard calculadas no backend (Prisma)
  const { data: dashboardSummary, isLoading: isLoadingDashboard } =
    useDashboardSummaryQuery({
      projectId: filters.projectId,
    });

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

  const projectSelectOptions = useMemo<TableSelectOption[]>(
    () => [
      { value: "all", label: `Todos os Projetos (${projectsList.length})` },
      ...projectsList.map((p) => ({ value: p.id, label: p.name })),
    ],
    [projectsList],
  );

  const fullPrStatusOptions = useMemo<TableSelectOption[]>(() => {
    const opts = [
      { value: "ALL", label: "Todos os Status" },
      ...prStatusOptions,
    ];
    if (
      !opts.some((o) => o.value === currentStatusValue) &&
      currentStatusValue !== "ALL"
    ) {
      opts.push({ value: currentStatusValue, label: currentStatusValue });
    }
    return opts;
  }, [currentStatusValue, prStatusOptions]);

  const fullNitStatusOptions = useMemo<TableSelectOption[]>(() => {
    const opts = [
      { value: "ALL", label: "Todos os Pareceres" },
      ...nitStatusOptions,
    ];
    if (
      !opts.some((o) => o.value === currentNitStatusValue) &&
      currentNitStatusValue !== "ALL"
    ) {
      opts.push({ value: currentNitStatusValue, label: currentNitStatusValue });
    }
    return opts;
  }, [currentNitStatusValue, nitStatusOptions]);

  const isFiltered = useMemo(() => {
    return (
      filters.projectId !== "all" ||
      filters.status !== "ALL" ||
      filters.nitStatus !== "ALL" ||
      Boolean(searchTerm.trim()) ||
      Boolean(filters.search.trim())
    );
  }, [filters, searchTerm]);

  // Métricas de KPI obtidas de forma agregada e cirúrgica da API do backend
  const metrics = useMemo(() => {
    const m = dashboardSummary?.metrics || {};
    return {
      pendingReview: m.pendingReview ?? 0,
      waitingNIT: m.waitingNIT ?? 0,
      approved: m.approved ?? 0,
      changesRequested: m.changesRequested ?? 0,
    };
  }, [dashboardSummary?.metrics]);

  // Configuração declarativa dos cards de métricas (DRY)
  const metricCards = useMemo(
    () => [
      {
        id: "pending-review",
        title: "Em Avaliação",
        value: metrics.pendingReview,
        icon: <HourglassEmptyIcon color="warning" />,
        color: "warning.main",
      },
      {
        id: "waiting-nit",
        title: "Pendente NIT",
        value: metrics.waitingNIT,
        icon: <GavelIcon color="info" />,
        color: "info.main",
      },
      {
        id: "approved",
        title: "Seções Aprovadas",
        value: metrics.approved,
        icon: <CheckCircleIcon color="success" />,
        color: "success.main",
      },
      {
        id: "changes-requested",
        title: "Ajustes Solicitados",
        value: metrics.changesRequested,
        icon: <FilterListIcon color="action" />,
        color: "error.main",
      },
    ],
    [metrics],
  );

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
        flex: 0.9,
        minWidth: 150,
        renderCell: (params) => <ProjectCell row={params.row} />,
      },
      {
        field: "title",
        headerName: "Título da Submissão & Seção TeX",
        flex: 3,
        minWidth: 300,
        renderCell: (params) => <SubmissionTitleCell row={params.row} />,
      },
      {
        field: "author",
        headerName: "Autor Responsável",
        flex: 1.5,
        minWidth: 200,
        renderCell: (params) => <AuthorCell row={params.row} />,
      },
      createDateColumn({
        field: "createdAt",
        headerName: "Data de Envio",
        flex: 1,
        minWidth: 160,
      }),
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
    <PageContainer>
      <WelcomeHeader subtitle="Seja bem-vindo ao SCIA — Scientific Collaboration + AI. Avalie as seções dos artigos científicos submetidos pelos Autores, inspecione diffs TeX." />

      {/* Cards de Métricas (KPIs) */}
      <Grid
        direction="row"
        container
        sx={{
          gap: 2,
          mb: 3,
        }}
      >
        {metricCards.map((card) => (
          <Grid key={card.id} sx={{ flexGrow: 1 }}>
            <MetricCard
              title={card.title}
              value={card.value}
              icon={card.icon}
              color={card.color}
              isLoading={isLoadingDashboard}
              sx={{
                "& .MuiCardContent-root": {
                  display: "flex",
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "flex-start",
                  gap: 2,
                },
              }}
            />
          </Grid>
        ))}
      </Grid>

      {/* Tabela Acadêmica de Solicitações com GenericDataGrid & AutoSizer com Header Integrado */}
      <TableContainer>
        <AutoSizer
          renderProp={({ height, width }) => (
            <GenericDataGrid<PullRequestDetail>
              headerToolbarContent={
                <TableHeaderToolbar
                  searchProps={{
                    placeholder: "Buscar por Título, Autor, Projeto ou ID...",
                    value: searchTerm,
                    onChange: setSearchTerm,
                  }}
                  selectFilters={[
                    {
                      id: "project",
                      label: "Projeto",
                      value: filters.projectId,
                      onChange: (projectId) =>
                        setFilters({ projectId, page: 1 }),
                      options: projectSelectOptions,
                    },
                    {
                      id: "prStatus",
                      label: "Status do PR",
                      value: currentStatusValue,
                      onChange: (status) => setFilters({ status, page: 1 }),
                      options: fullPrStatusOptions,
                    },
                    {
                      id: "nitStatus",
                      label: "Parecer NIT",
                      value: currentNitStatusValue,
                      onChange: (nitStatus) =>
                        setFilters({ nitStatus, page: 1 }),
                      options: fullNitStatusOptions,
                    },
                  ]}
                  clearFiltersProps={{
                    visible: isFiltered,
                    onClear: handleResetFilters,
                  }}
                />
              }
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
      </TableContainer>
    </PageContainer>
  );
};
