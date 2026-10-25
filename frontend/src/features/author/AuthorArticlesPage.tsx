import AddIcon from "@mui/icons-material/Add";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import { Button, Stack, ToggleButton, ToggleButtonGroup } from "@mui/material";
import type { GridColDef } from "@mui/x-data-grid";
import { useMemo, useState } from "react";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { AutoSizer } from "react-virtualized-auto-sizer";
import {
  createActionsColumn,
  createAvatarStackColumn,
  createChipColumn,
  createProgressColumn,
  createTitleSubtitleColumn,
} from "../../components/common/dataGridColumns";
import { GenericDataGrid } from "../../components/common/GenericDataGrid";
import { PageContainer } from "../../components/common/PageContainer";
import { TableContainer } from "../../components/common/TableContainer";
import { TableHeaderToolbar } from "../../components/common/TableFilters";
import { WelcomeHeader } from "../../components/common/WelcomeHeader";
import { useUserArticlesQuery } from "../../hooks/useArticleQueries";
import type { ArticleItem } from "../../services/articlesService";
import type { RootState } from "../../store";
import { CreateProjectModal } from "./modals/CreateProjectModal";

export const AuthorArticlesPage = () => {
  const navigate = useNavigate();
  const currentUser = useSelector((state: RootState) => state.auth.user);
  const { data: articles = [], isLoading } = useUserArticlesQuery();

  const [searchArticleQuery, setSearchArticleQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("ALL");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const articlesWithRoles = useMemo(() => {
    return articles.map((art) => {
      const isReviewer = art.members?.some(
        (m) =>
          m.role === "REVIEWER" &&
          (m.userId === currentUser?.id || m.user?.id === currentUser?.id),
      );
      const role: "Autor" | "Revisor Oficial" = isReviewer
        ? "Revisor Oficial"
        : "Autor";
      return {
        ...art,
        role,
      };
    });
  }, [articles, currentUser?.id]);

  const authorCount = useMemo(
    () => articlesWithRoles.filter((a) => a.role === "Autor").length,
    [articlesWithRoles],
  );

  const reviewerCount = useMemo(
    () => articlesWithRoles.filter((a) => a.role === "Revisor Oficial").length,
    [articlesWithRoles],
  );

  const filteredArticles = useMemo(() => {
    return articlesWithRoles.filter((article) => {
      const matchesSearch =
        searchArticleQuery.trim() === "" ||
        article.title
          .toLowerCase()
          .includes(searchArticleQuery.toLowerCase()) ||
        article.conference
          .toLowerCase()
          .includes(searchArticleQuery.toLowerCase()) ||
        article.status.toLowerCase().includes(searchArticleQuery.toLowerCase());

      const matchesRole =
        roleFilter === "ALL" ||
        (roleFilter === "AUTHOR" && article.role === "Autor") ||
        (roleFilter === "REVIEWER" && article.role === "Revisor Oficial");

      return matchesSearch && matchesRole;
    });
  }, [articlesWithRoles, searchArticleQuery, roleFilter]);

  const articleColumns = useMemo<GridColDef<ArticleItem>[]>(
    () => [
      createTitleSubtitleColumn<ArticleItem>(
        {
          field: "title",
          headerName: "Artigo Científico",
          flex: 2.2,
          minWidth: 260,
        },
        (params) => ({
          title: params.row.title,
          subtitle: params.row.conference,
        }),
      ),
      createChipColumn<ArticleItem>(
        {
          field: "role",
          headerName: "Atuação",
          flex: 1.1,
          minWidth: 150,
        },
        (params) => ({
          label: String(params.value),
          variant: String(params.value).includes("Revisor")
            ? "filled"
            : "outlined",
          color: String(params.value).includes("Revisor")
            ? "secondary"
            : "primary",
        }),
      ),
      createChipColumn<ArticleItem>(
        {
          field: "status",
          headerName: "Status da Submissão",
          flex: 1.2,
          minWidth: 160,
        },
        (params) => ({
          label: String(params.value),
          variant: "outlined",
          color:
            String(params.value).includes("Aprovado") ||
            String(params.value).includes("Publicado")
              ? "success"
              : "info",
        }),
      ),
      createProgressColumn<ArticleItem>(
        {
          field: "progress",
          headerName: "Progresso da Escrita",
          flex: 1.5,
          minWidth: 180,
        },
        (params) => ({
          value: Number(params.value || 0),
          label: "Progresso",
          color: params.row.role === "Autor" ? "primary" : "secondary",
        }),
      ),
      createTitleSubtitleColumn<ArticleItem>(
        {
          field: "tasks",
          headerName: "Tarefas Ativas",
          flex: 1,
          minWidth: 130,
        },
        (params) => ({
          title: `${params.row.tasks.length} Tarefa(s)`,
          icon: "📋",
        }),
      ),
      createAvatarStackColumn<ArticleItem>(
        {
          field: "members",
          headerName: "Coautores / Equipe",
          flex: 1.2,
          minWidth: 140,
          filterable: false,
          sortable: false,
          hideable: false,
        },
        (params) => params.row.members,
      ),
      createActionsColumn<ArticleItem>(
        {
          field: "actions",
          headerName: "Ação",
          flex: 1.3,
          minWidth: 160,
        },
        [
          {
            label: "Ver Tarefas",
            icon: <ArrowForwardIcon />,
            color: "primary",
            variant: "contained",
            onClick: (row) => navigate(`/articles/${row.id}`),
          },
        ],
      ),
    ],
    [navigate],
  );

  const headerToolbarNode = useMemo(
    () => (
      <TableHeaderToolbar
        sx={{ borderBottom: "none", p: 2 }}
        searchProps={{
          placeholder: "Buscar artigo por Título ou Conferência...",
          value: searchArticleQuery,
          onChange: setSearchArticleQuery,
        }}
        actions={
          <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
            <ToggleButtonGroup
              size="small"
              value={roleFilter}
              exclusive
              onChange={(_, val) => {
                if (val !== null) setRoleFilter(val);
              }}
              sx={{ height: 40 }}
            >
              <ToggleButton
                value="ALL"
                sx={{ fontWeight: 600, textTransform: "none", px: 1.5 }}
              >
                Todos ({articlesWithRoles.length})
              </ToggleButton>
              <ToggleButton
                value="AUTHOR"
                sx={{ fontWeight: 600, textTransform: "none", px: 1.5 }}
              >
                Meus Artigos ({authorCount})
              </ToggleButton>
              <ToggleButton
                value="REVIEWER"
                sx={{ fontWeight: 600, textTransform: "none", px: 1.5 }}
              >
                Sob Minha Revisão ({reviewerCount})
              </ToggleButton>
            </ToggleButtonGroup>

            <Button
              variant="contained"
              color="primary"
              size="small"
              startIcon={<AddIcon />}
              onClick={() => setIsCreateModalOpen(true)}
              sx={{ whiteSpace: "nowrap", height: 40, fontWeight: 700 }}
            >
              Novo Artigo
            </Button>
          </Stack>
        }
        clearFiltersProps={{
          visible: searchArticleQuery.trim() !== "" || roleFilter !== "ALL",
          onClear: () => {
            setSearchArticleQuery("");
            setRoleFilter("ALL");
          },
        }}
      />
    ),
    [searchArticleQuery, roleFilter],
  );

  return (
    <PageContainer>
      <WelcomeHeader subtitle="Seja bem-vindo ao SCIA — Scientific Collaboration and Intelligent Assistance. Selecione um artigo para gerenciar suas tarefas e acessar o workspace." />

      {/* Container flexível para o AutoSizer medir a altura exata disponível */}
      <TableContainer sx={{ mt: 2 }}>
        <AutoSizer
          renderProp={({ height, width }) => (
            <GenericDataGrid<ArticleItem>
              headerToolbarContent={headerToolbarNode}
              rows={filteredArticles}
              columns={articleColumns}
              getRowId={(row) => row.id}
              loading={isLoading}
              pageSizeOptions={[5, 10, 25]}
              height={height}
              width={width}
              rowHeight={64}
              emptyMessage="Nenhum artigo científico encontrado com os filtros selecionados."
            />
          )}
        />
      </TableContainer>

      {/* Modal de Criação de Novo Artigo */}
      <CreateProjectModal
        open={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onArticleCreated={(articleId) => navigate(`/articles/${articleId}`)}
      />
    </PageContainer>
  );
};
