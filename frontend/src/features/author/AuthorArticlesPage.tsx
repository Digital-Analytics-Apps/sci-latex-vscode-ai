import AddIcon from "@mui/icons-material/Add";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import { Box, Button, Card, CardContent } from "@mui/material";
import type { GridColDef } from "@mui/x-data-grid";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AutoSizer } from "react-virtualized-auto-sizer";
import { GenericDataGrid } from "../../components/common/GenericDataGrid";
import { WelcomeHeader } from "../../components/common/WelcomeHeader";
import {
  createActionsColumn,
  createAvatarStackColumn,
  createChipColumn,
  createProgressColumn,
  createTitleSubtitleColumn,
} from "../../components/common/dataGridColumns";
import {
  ClearFiltersButton,
  TableFilterBar,
  TableSearchInput,
} from "../../components/common/TableFilters";
import { useUserArticlesQuery } from "../../hooks/useArticleQueries";
import type { ArticleItem } from "../../services/articlesService";
import { CreateProjectModal } from "../workspace/CreateProjectModal";

export const AuthorArticlesPage = () => {
  const navigate = useNavigate();
  const { data: articles = [], isLoading } = useUserArticlesQuery();

  const [searchArticleQuery, setSearchArticleQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("ALL");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const filteredArticles = useMemo(() => {
    return articles.filter((article) => {
      const matchesSearch =
        searchArticleQuery.trim() === "" ||
        article.title
          .toLowerCase()
          .includes(searchArticleQuery.toLowerCase()) ||
        article.conference
          .toLowerCase()
          .includes(searchArticleQuery.toLowerCase()) ||
        article.status.toLowerCase().includes(searchArticleQuery.toLowerCase());

      const matchesRole = roleFilter === "ALL" || article.role === roleFilter;

      return matchesSearch && matchesRole;
    });
  }, [articles, searchArticleQuery, roleFilter]);

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

  return (
    <Box sx={{ p: 4 }}>
      <WelcomeHeader subtitle="Seja bem-vindo ao SCIA — Scientific Collaboration + AI. Selecione um artigo para gerenciar suas tarefas e acessar o workspace." />

      {/* Painel de Busca & Filtros por Papel */}
      <TableFilterBar>
        <TableSearchInput
          placeholder="Buscar artigo por Título ou Conferência..."
          value={searchArticleQuery}
          onChange={setSearchArticleQuery}
        />
        <Button
          variant="contained"
          color="primary"
          size="small"
          startIcon={<AddIcon />}
          onClick={() => setIsCreateModalOpen(true)}
          sx={{ whiteSpace: "nowrap", height: 40, fontWeight: 700, width: 120 }}
        >
          Novo Artigo
        </Button>

        <ClearFiltersButton
          visible={searchArticleQuery.trim() !== "" || roleFilter !== "ALL"}
          onClick={() => {
            setSearchArticleQuery("");
            setRoleFilter("ALL");
          }}
        />
      </TableFilterBar>

      {/* Tabela de Artigos em DataGrid com AutoSizer */}
      <Card variant="outlined">
        <CardContent sx={{ p: 0, height: 680, width: "100%" }}>
          <AutoSizer
            renderProp={({ height = 600, width }) => (
              <GenericDataGrid<ArticleItem>
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
        </CardContent>
      </Card>

      {/* Modal de Criação de Novo Artigo */}
      <CreateProjectModal
        open={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onArticleCreated={(articleId) => navigate(`/articles/${articleId}`)}
      />
    </Box>
  );
};
