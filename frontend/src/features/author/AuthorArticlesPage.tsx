import AddIcon from '@mui/icons-material/Add';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import ArticleIcon from '@mui/icons-material/Article';
import EditNoteIcon from '@mui/icons-material/EditNote';
import RateReviewIcon from '@mui/icons-material/RateReview';
import {
  Box,
  Button,
  Card,
  Chip,
  Grid,
  LinearProgress,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material';
import { motion } from 'framer-motion';
import type { GridColDef } from '@mui/x-data-grid';
import { useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { AutoSizer } from 'react-virtualized-auto-sizer';
import {
  createActionsColumn,
  createAvatarStackColumn,
  createChipColumn,
  createProgressColumn,
  createTitleSubtitleColumn,
} from '../../components/common/dataGridColumns';
import { GenericDataGrid } from '../../components/common/GenericDataGrid';
import { PageContainer } from '../../components/common/PageContainer';
import { TableContainer } from '../../components/common/TableContainer';
import { TableHeaderToolbar } from '../../components/common/TableFilters';
import { WelcomeHeader } from '../../components/common/WelcomeHeader';
import { useUserArticlesQuery } from '../../hooks/useArticleQueries';
import type { ArticleItem } from '../../services/articlesService';
import type { RootState } from '../../store';
import { CreateProjectModal } from './modals/CreateProjectModal';
import { CreateArticleAiModal } from './modals/CreateArticleAiModal';
export const AuthorArticlesPage = () => {
  const navigate = useNavigate();
  const currentUser = useSelector((state: RootState) => state.auth.user);
  const { data: articles = [], isLoading } = useUserArticlesQuery();

  const [searchArticleQuery, setSearchArticleQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('ALL');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const articlesWithRoles = useMemo(() => {
    return articles.map((art) => {
      const isReviewer = art.members?.some(
        (m) =>
          m.role === 'REVIEWER' && (m.userId === currentUser?.id || m.user?.id === currentUser?.id)
      );
      const role: 'Autor' | 'Revisor Oficial' = isReviewer ? 'Revisor Oficial' : 'Autor';
      return {
        ...art,
        role,
      };
    });
  }, [articles, currentUser?.id]);

  const authorCount = useMemo(
    () => articlesWithRoles.filter((a) => a.role === 'Autor').length,
    [articlesWithRoles]
  );

  const reviewerCount = useMemo(
    () => articlesWithRoles.filter((a) => a.role === 'Revisor Oficial').length,
    [articlesWithRoles]
  );

  const activeArticle = useMemo(() => {
    return articlesWithRoles.find((a) => (a.progress || 0) < 100) || articlesWithRoles[0];
  }, [articlesWithRoles]);

  const filteredArticles = useMemo(() => {
    return articlesWithRoles.filter((article) => {
      const matchesSearch =
        searchArticleQuery.trim() === '' ||
        article.title.toLowerCase().includes(searchArticleQuery.toLowerCase()) ||
        article.conference.toLowerCase().includes(searchArticleQuery.toLowerCase()) ||
        article.status.toLowerCase().includes(searchArticleQuery.toLowerCase());

      const matchesRole =
        roleFilter === 'ALL' ||
        (roleFilter === 'AUTHOR' && article.role === 'Autor') ||
        (roleFilter === 'REVIEWER' && article.role === 'Revisor Oficial');

      return matchesSearch && matchesRole;
    });
  }, [articlesWithRoles, searchArticleQuery, roleFilter]);

  const articleColumns = useMemo<GridColDef<ArticleItem>[]>(
    () => [
      createTitleSubtitleColumn<ArticleItem>(
        {
          field: 'title',
          headerName: 'Artigo Científico',
          flex: 2.2,
          minWidth: 260,
        },
        (params) => ({
          title: params.row.title,
          subtitle: params.row.conference,
        })
      ),
      createChipColumn<ArticleItem>(
        {
          field: 'role',
          headerName: 'Atuação',
          flex: 1.1,
          minWidth: 150,
        },
        (params) => ({
          label: String(params.value),
          variant: String(params.value).includes('Revisor') ? 'filled' : 'outlined',
          color: String(params.value).includes('Revisor') ? 'secondary' : 'primary',
        })
      ),
      createChipColumn<ArticleItem>(
        {
          field: 'status',
          headerName: 'Status da Submissão',
          flex: 1.2,
          minWidth: 160,
        },
        (params) => ({
          label: String(params.value),
          variant: 'outlined',
          color:
            String(params.value).includes('Aprovado') || String(params.value).includes('Publicado')
              ? 'success'
              : 'info',
        })
      ),
      createProgressColumn<ArticleItem>(
        {
          field: 'progress',
          headerName: 'Progresso da Escrita',
          flex: 1.5,
          minWidth: 180,
        },
        (params) => ({
          value: Number(params.value || 0),
          label: 'Progresso',
          color: params.row.role === 'Autor' ? 'primary' : 'secondary',
        })
      ),
      createTitleSubtitleColumn<ArticleItem>(
        {
          field: 'tasks',
          headerName: 'Tarefas Ativas',
          flex: 1,
          minWidth: 130,
        },
        (params) => ({
          title: `${params.row.tasks.length} Tarefa(s)`,
          icon: '📋',
        })
      ),
      createAvatarStackColumn<ArticleItem>(
        {
          field: 'members',
          headerName: 'Coautores / Equipe',
          flex: 1.2,
          minWidth: 140,
          filterable: false,
          sortable: false,
          hideable: false,
        },
        (params) => params.row.members
      ),
      createActionsColumn<ArticleItem>(
        {
          field: 'actions',
          headerName: 'Ação',
          flex: 1.3,
          minWidth: 160,
        },
        [
          {
            label: 'Ver Tarefas',
            icon: <ArrowForwardIcon />,
            color: 'primary',
            variant: 'contained',
            onClick: (row) => navigate(`/articles/${row.id}`),
          },
        ]
      ),
    ],
    [navigate]
  );

  const headerToolbarNode = useMemo(
    () => (
      <TableHeaderToolbar
        sx={{ borderBottom: 'none', p: 2 }}
        searchProps={{
          placeholder: 'Buscar artigo por Título ou Conferência...',
          value: searchArticleQuery,
          onChange: setSearchArticleQuery,
        }}
        actions={
          <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
            <ToggleButtonGroup
              size="small"
              value={roleFilter}
              exclusive
              onChange={(_, val) => {
                if (val !== null) setRoleFilter(val);
              }}
              sx={{ height: 40 }}
            >
              <ToggleButton value="ALL" sx={{ fontWeight: 600, textTransform: 'none', px: 1.5 }}>
                Todos ({articlesWithRoles.length})
              </ToggleButton>
              <ToggleButton value="AUTHOR" sx={{ fontWeight: 600, textTransform: 'none', px: 1.5 }}>
                Meus Artigos ({authorCount})
              </ToggleButton>
              <ToggleButton
                value="REVIEWER"
                sx={{ fontWeight: 600, textTransform: 'none', px: 1.5 }}
              >
                Sob Minha Revisão ({reviewerCount})
              </ToggleButton>
            </ToggleButtonGroup>

            <Button
              variant="outlined"
              color="primary"
              size="small"
              startIcon={<AutoAwesomeIcon />}
              onClick={() => setIsAiModalOpen(true)}
              sx={{ whiteSpace: 'nowrap', height: 40, fontWeight: 700 }}
            >
              Criar com Belisa
            </Button>

            <Button
              variant="contained"
              color="primary"
              size="small"
              startIcon={<AddIcon />}
              onClick={() => setIsCreateModalOpen(true)}
              sx={{ whiteSpace: 'nowrap', height: 40, fontWeight: 700 }}
            >
              Novo Artigo
            </Button>
          </Stack>
        }
        clearFiltersProps={{
          visible: searchArticleQuery.trim() !== '' || roleFilter !== 'ALL',
          onClear: () => {
            setSearchArticleQuery('');
            setRoleFilter('ALL');
          },
        }}
      />
    ),
    [searchArticleQuery, roleFilter, articlesWithRoles.length, authorCount, reviewerCount]
  );

  return (
    <PageContainer>
      <WelcomeHeader subtitle="Seja bem-vindo ao SCIA — Scientific Collaboration and Intelligent Assistance. Selecione um artigo para gerenciar suas tarefas e acessar o workspace." />

      {/* Bento Grid Editorial: Visão de Alta Prioridade */}
      {articlesWithRoles.length > 0 && activeArticle && (
        <Box
          component={motion.div}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          sx={{ mb: 2 }}
        >
          <Grid container spacing={2}>
            {/* Card Hero: Manuscrito em Foco */}
            <Grid size={{ xs: 12, md: 8 }}>
              <Card
                variant="outlined"
                sx={{
                  p: 2.5,
                  borderRadius: 2,
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  height: '100%',
                  bgcolor: 'background.paper',
                  borderColor: 'divider',
                  position: 'relative',
                  overflow: 'hidden',
                  '&:before': {
                    content: '""',
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    height: '3px',
                    background: (theme) =>
                      `linear-gradient(90deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
                  },
                }}
              >
                <Box>
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      mb: 1,
                      flexWrap: 'wrap',
                      gap: 1,
                    }}
                  >
                    <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                      <Chip
                        icon={<EditNoteIcon sx={{ fontSize: '1rem !important' }} />}
                        label="Manuscrito em Foco"
                        size="small"
                        color="primary"
                        sx={{ fontWeight: 700, fontSize: '0.75rem' }}
                      />
                      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                        {activeArticle.conference || 'Conferência Científica'}
                      </Typography>
                    </Stack>
                    <Chip
                      label={activeArticle.status}
                      size="small"
                      variant="outlined"
                      color={
                        activeArticle.status.includes('Aprovado') ||
                        activeArticle.status.includes('Publicado')
                          ? 'success'
                          : 'info'
                      }
                      sx={{ fontWeight: 600, fontSize: '0.75rem' }}
                    />
                  </Box>

                  <Typography
                    variant="h6"
                    sx={{
                      fontWeight: 700,
                      letterSpacing: '-0.01em',
                      mt: 0.5,
                      mb: 1,
                      lineHeight: 1.3,
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                    }}
                  >
                    {activeArticle.title}
                  </Typography>
                </Box>

                <Box sx={{ mt: 'auto' }}>
                  <Box
                    sx={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      mb: 0.5,
                    }}
                  >
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                      Progresso da Redação & Revisão
                    </Typography>
                    <Typography
                      variant="caption"
                      sx={{
                        fontWeight: 700,
                        fontFamily: '"JetBrains Mono", monospace',
                        color: 'primary.main',
                      }}
                    >
                      {activeArticle.progress || 0}%
                    </Typography>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={activeArticle.progress || 0}
                    sx={{ height: 6, borderRadius: 3, mb: 1.5 }}
                  />

                  <Box
                    sx={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      flexWrap: 'wrap',
                      gap: 1,
                    }}
                  >
                    <Typography variant="caption" color="text.secondary">
                      {activeArticle.tasks.length} tarefa(s) pendente(s) •{' '}
                      {activeArticle.members.length} coautor(es)
                    </Typography>
                    <Button
                      variant="contained"
                      size="small"
                      endIcon={<ArrowForwardIcon />}
                      onClick={() => navigate(`/articles/${activeArticle.id}`)}
                      sx={{ fontWeight: 700, px: 2 }}
                    >
                      Acessar Workspace
                    </Button>
                  </Box>
                </Box>
              </Card>
            </Grid>

            {/* Coluna Lateral: Resumo de Governança Científica */}
            <Grid size={{ xs: 12, md: 4 }}>
              <Stack spacing={1.5} sx={{ height: '100%' }}>
                <Card
                  variant="outlined"
                  sx={{
                    p: 2,
                    borderRadius: 2,
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                    <ArticleIcon color="primary" fontSize="small" />
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        letterSpacing: '0.04em',
                      }}
                    >
                      Papel de Autoria
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1.5 }}>
                    <Typography
                      variant="h4"
                      sx={{
                        fontWeight: 700,
                        fontFamily: '"JetBrains Mono", monospace',
                        color: 'primary.main',
                      }}
                    >
                      {authorCount}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      artigo(s) como autor ou coautor
                    </Typography>
                  </Box>
                </Card>

                <Card
                  variant="outlined"
                  sx={{
                    p: 2,
                    borderRadius: 2,
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                    <RateReviewIcon color="secondary" fontSize="small" />
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        letterSpacing: '0.04em',
                      }}
                    >
                      Revisão por Pares
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1.5 }}>
                    <Typography
                      variant="h4"
                      sx={{
                        fontWeight: 700,
                        fontFamily: '"JetBrains Mono", monospace',
                        color: 'secondary.main',
                      }}
                    >
                      {reviewerCount}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      manuscrito(s) sob sua avaliação
                    </Typography>
                  </Box>
                </Card>
              </Stack>
            </Grid>
          </Grid>
        </Box>
      )}

      {/* Container flexível para o AutoSizer medir a altura exata disponível */}
      <TableContainer sx={{ mt: 1 }}>
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

      {/* Modal de Criação de Novo Artigo Manual */}
      <CreateProjectModal
        open={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onArticleCreated={(articleId) => navigate(`/articles/${articleId}`)}
      />

      {/* Modal de Criação de Artigo Assistida por IA */}
      <CreateArticleAiModal
        open={isAiModalOpen}
        onClose={() => setIsAiModalOpen(false)}
        onArticleCreated={(articleId) => navigate(`/articles/${articleId}`)}
      />
    </PageContainer>
  );
};
