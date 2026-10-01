import { useState } from "react";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import ArticleIcon from "@mui/icons-material/Article";
import SettingsIcon from "@mui/icons-material/Settings";
import {
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Grid,
  IconButton,
  LinearProgress,
  Stack,
  Tooltip,
  Typography,
} from "@mui/material";
import { useQuery } from "@tanstack/react-query";
import { Role } from "../../../constants/roles";
import type { ArticleItem } from "../../../services/articlesService";
import { StageStatus } from "../../../constants/status";
import {
  projectsService,
  type ProjectStage,
} from "../../../services/projectsService";

const DEFAULT_FALLBACK_STAGES: ProjectStage[] = [
  {
    id: "stage-default-1",
    projectId: "demo",
    order: 1,
    title: "Planejamento e Pesquisa",
    description:
      "Mapeamento inicial de bibliografia, hipóteses e estruturação TeX",
    status: StageStatus.IN_PROGRESS,
    isGatekeeper: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    plannedStartAt: new Date().toISOString(),
    plannedCompletionDate: new Date(
      Date.now() + 30 * 24 * 60 * 60 * 1000,
    ).toISOString(),
    plannedEndAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    tasks: [],
  },
  {
    id: "stage-default-2",
    projectId: "demo",
    order: 2,
    title: "Desenvolvimento e Experimentos",
    description:
      "Execução de testes, geração de gráficos e tabelas de resultados",
    status: StageStatus.NOT_STARTED,
    isGatekeeper: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    plannedCompletionDate: new Date(
      Date.now() + 60 * 24 * 60 * 60 * 1000,
    ).toISOString(),
    tasks: [],
  },
  {
    id: "stage-default-3",
    projectId: "demo",
    order: 3,
    title: "Escrita da Versão Rascunho",
    description: "Redação de Seções, Introdução, Metodologia e Conclusão",
    status: StageStatus.NOT_STARTED,
    isGatekeeper: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    plannedCompletionDate: new Date(
      Date.now() + 90 * 24 * 60 * 60 * 1000,
    ).toISOString(),
    tasks: [],
  },
  {
    id: "stage-default-4",
    projectId: "demo",
    order: 4,
    title: "Parecer do NIT (Gatekeeper 1)",
    description: "Validação institucional, propriedade intelectual e submissão",
    status: StageStatus.NOT_STARTED,
    isGatekeeper: true,
    gatekeeperType: "NIT",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    plannedCompletionDate: new Date(
      Date.now() + 105 * 24 * 60 * 60 * 1000,
    ).toISOString(),
    tasks: [],
  },
  {
    id: "stage-default-5",
    projectId: "demo",
    order: 5,
    title: "Submissão ao Congresso Alvo (Gatekeeper 2)",
    description: "Envio final à conferência científica",
    status: StageStatus.NOT_STARTED,
    isGatekeeper: true,
    gatekeeperType: "TARGET_CONFERENCE",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    plannedCompletionDate: new Date(
      Date.now() + 120 * 24 * 60 * 60 * 1000,
    ).toISOString(),
    tasks: [],
  },
];
import { ArticleTimelineHeader } from "../../../components/common/ArticleTimelineHeader";
import { AuthorTasksTable } from "../../workspace/components/AuthorTasksTable";
import { CreateStageModal } from "../../workspace/CreateStageModal";
import { ProjectSettingsModal } from "../../workspace/ProjectSettingsModal";
import type { TaskItem } from "../../../types/task.types";

interface AuthorDashboardProps {
  articles: ArticleItem[];
  selectedArticle: ArticleItem | null;
  activeProjectId: string;
  provisioningTaskId: string | null;
  currentUserId?: string;
  onSelectArticle: (id: string) => void;
  onClearArticle: () => void;
  onStartWorkspace: (task: TaskItem) => void;
  onOpenCreateTask: () => void;
  onOpenAddMember: () => void;
}

export const AuthorDashboard = ({
  articles,
  selectedArticle,
  activeProjectId,
  provisioningTaskId,
  currentUserId,
  onSelectArticle,
  onClearArticle,
  onStartWorkspace,
  onOpenCreateTask,
  onOpenAddMember,
}: AuthorDashboardProps) => {
  const currentMembers = selectedArticle?.members || [];
  const [isCreateStageOpen, setIsCreateStageOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [selectedStageFilterId, setSelectedStageFilterId] = useState<
    string | null
  >(null);

  const { data: stages = [], refetch: refetchStages } = useQuery({
    queryKey: ["project-stages", activeProjectId],
    queryFn: () => projectsService.getProjectStages(activeProjectId),
    enabled: Boolean(activeProjectId && !activeProjectId.startsWith("demo-")),
  });

  const effectiveStages =
    stages && stages.length > 0 ? stages : DEFAULT_FALLBACK_STAGES;

  return (
    <Box>
      {!selectedArticle ? (
        /* NIVEL 1: LISTA LIMPA DOS ARTIGOS DO AUTOR */
        <Box>
          <Box sx={{ mb: 3 }}>
            <Typography variant="h4" sx={{ fontWeight: 700, mb: 0.5 }}>
              Meus Artigos Científicos ({articles.length})
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Selecione um artigo para gerenciar suas tarefas e acessar o
              workspace de desenvolvimento.
            </Typography>
          </Box>

          <Grid container spacing={3}>
            {articles.map((article) => (
              <Grid key={article.id} size={{ xs: 12, md: 6, lg: 4 }}>
                <Card
                  variant="outlined"
                  sx={{
                    height: "100%",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    boxShadow: 1,
                    borderRadius: 2,
                    transition: "transform 0.2s, box-shadow 0.2s",
                    "&:hover": {
                      transform: "translateY(-4px)",
                      boxShadow: 4,
                    },
                  }}
                >
                  <CardContent sx={{ p: 2.5 }}>
                    <Box
                      sx={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "flex-start",
                        mb: 1.5,
                      }}
                    >
                      <Chip
                        label={article.role}
                        color="primary"
                        size="small"
                        sx={{ fontWeight: 700 }}
                      />
                      <Chip
                        label={article.status}
                        variant="outlined"
                        color={
                          article.status.includes("Aprovado") ||
                          article.status.includes("Publicado")
                            ? "success"
                            : "info"
                        }
                        size="small"
                        sx={{ fontWeight: 600 }}
                      />
                    </Box>

                    <Typography
                      variant="h6"
                      sx={{
                        fontWeight: 700,
                        mb: 1,
                        color: "text.primary",
                        lineHeight: 1.3,
                      }}
                    >
                      {article.title}
                    </Typography>

                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{ mb: 2 }}
                    >
                      {article.conference}
                    </Typography>

                    <Box sx={{ mb: 2 }}>
                      <Box
                        sx={{
                          display: "flex",
                          justifyContent: "space-between",
                          mb: 0.5,
                        }}
                      >
                        <Typography variant="caption" color="text.secondary">
                          Progresso da Escrita
                        </Typography>
                        <Typography variant="caption" sx={{ fontWeight: 700 }}>
                          {article.progress}%
                        </Typography>
                      </Box>
                      <LinearProgress
                        variant="determinate"
                        value={article.progress}
                        color={
                          article.role === "Autor" ? "primary" : "secondary"
                        }
                        sx={{ height: 6, borderRadius: 1 }}
                      />
                    </Box>

                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{ display: "block" }}
                    >
                      📋{" "}
                      <strong>{article.tasks.length} Tarefa(s) Ativa(s)</strong>
                    </Typography>
                  </CardContent>

                  <Box sx={{ p: 2, pt: 0 }}>
                    <Button
                      variant="contained"
                      color="primary"
                      fullWidth
                      size="small"
                      endIcon={<ArrowForwardIcon />}
                      onClick={() => onSelectArticle(article.id)}
                    >
                      Ver Tarefas do Artigo
                    </Button>
                  </Box>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Box>
      ) : (
        /* NIVEL 2: TELA INTERNA DO ARTIGO SELECIONADO & SUAS TAREFAS */
        <Box>
          {/* CABEÇALHO DENSO E COMPACTO DO ARTIGO */}
          <Card
            variant="outlined"
            sx={{
              mb: 2,
              boxShadow: 1,
              borderRadius: 2,
              bgcolor: "background.paper",
            }}
          >
            <CardContent sx={{ p: 1.8, pb: "14px !important" }}>
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  flexWrap: "wrap",
                  gap: 1.5,
                }}
              >
                {/* LADO ESQUERDO: NAVEGAÇÃO E METADADOS DO ARTIGO */}
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 1.5,
                    flexWrap: "wrap",
                    flex: 1,
                  }}
                >
                  <Button
                    variant="text"
                    color="primary"
                    size="small"
                    startIcon={<ArrowBackIcon sx={{ fontSize: 16 }} />}
                    onClick={onClearArticle}
                    sx={{
                      fontWeight: 700,
                      px: 1,
                      py: 0.2,
                      minWidth: "auto",
                      fontSize: "0.8rem",
                    }}
                  >
                    Voltar
                  </Button>

                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <ArticleIcon color="primary" sx={{ fontSize: 22 }} />
                    <Typography
                      variant="h6"
                      sx={{
                        fontWeight: 800,
                        fontSize: "1.1rem",
                        lineHeight: 1.2,
                      }}
                    >
                      {selectedArticle?.title || "Artigo Selecionado"}
                    </Typography>
                    <Chip
                      label={selectedArticle?.role || "Autor"}
                      size="small"
                      color="primary"
                      sx={{ fontWeight: 700, height: 20, fontSize: "0.7rem" }}
                    />
                  </Box>

                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ fontWeight: 500, fontSize: "0.75rem" }}
                  >
                    • Conferência:{" "}
                    <strong>
                      {selectedArticle?.conference || "IEEE Transactions"}
                    </strong>
                  </Typography>
                </Box>

                {/* LADO DIREITO: BARRA UNIFICADA DE AÇÕES E MEMBROS */}
                <Stack
                  direction="row"
                  spacing={1}
                  sx={{ alignItems: "center" }}
                >
                  {/* AVATARES COMPACTOS DOS MEMBROS */}
                  {currentMembers.length > 0 && (
                    <Stack direction="row" spacing={-0.8} sx={{ mr: 0.5 }}>
                      {currentMembers.map((m: any) => {
                        const u = m.user || { name: "Membro", email: "" };
                        const roleLabel =
                          m.role === Role.REVIEWER ? "Revisor" : "Autor";
                        return (
                          <Tooltip
                            key={m.id || m.userId}
                            title={`${u.name} (${roleLabel})`}
                          >
                            <Avatar
                              sx={{
                                width: 26,
                                height: 26,
                                fontSize: 11,
                                fontWeight: 700,
                                border: "2px solid #1e1e2d",
                                bgcolor:
                                  m.role === Role.REVIEWER
                                    ? "secondary.main"
                                    : "primary.main",
                              }}
                            >
                              {u.name?.[0] || "U"}
                            </Avatar>
                          </Tooltip>
                        );
                      })}
                    </Stack>
                  )}

                  <Tooltip title="Configurações & Governança do Projeto">
                    <IconButton
                      color="primary"
                      size="small"
                      onClick={() => setIsSettingsOpen(true)}
                      sx={{
                        border: "1px solid",
                        borderColor: "primary.main",
                        borderRadius: 1.5,
                        px: 1,
                        height: 28,
                      }}
                    >
                      <SettingsIcon sx={{ fontSize: 16 }} />
                    </IconButton>
                  </Tooltip>
                </Stack>
              </Box>
            </CardContent>
          </Card>

          {/* RÉGUA DE TIMELINE E GATEKEEPERS DA ETAPA DE ESCRITA */}
          <ArticleTimelineHeader
            stages={effectiveStages}
            selectedStageId={selectedStageFilterId}
            onSelectStage={(stageId) => setSelectedStageFilterId(stageId)}
          />

          {/* LISTA DE TAREFAS EM DATAGRID DO ARTIGO SELECIONADO */}
          <AuthorTasksTable
            projectId={activeProjectId}
            provisioningTaskId={provisioningTaskId}
            currentUserId={currentUserId}
            onStartWorkspace={onStartWorkspace}
            onOpenCreateTask={onOpenCreateTask}
          />

          {/* MODAL PARA ADICIONAR NOVA ETAPA DE ESCRITA (FEATURE BRANCH) */}
          <CreateStageModal
            open={isCreateStageOpen}
            onClose={() => setIsCreateStageOpen(false)}
            projectId={activeProjectId}
            nextOrder={stages.length + 1}
          />

          {/* MODAL DE CONFIGURAÇÕES DO PROJETO (CRUD DE ETAPAS, MEMBROS, D&D E METADADOS) */}
          <ProjectSettingsModal
            open={isSettingsOpen}
            onClose={() => setIsSettingsOpen(false)}
            projectId={activeProjectId}
            projectDetails={selectedArticle}
            stages={stages}
            onRefetchStages={refetchStages}
            onOpenCreateStage={() => setIsCreateStageOpen(true)}
            onOpenAddMember={onOpenAddMember}
          />
        </Box>
      )}
    </Box>
  );
};
