import AddIcon from "@mui/icons-material/Add";
import { Box, Button, LinearProgress, Typography } from "@mui/material";
import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Role } from "../../constants/roles";
import { useUserArticlesQuery } from "../../hooks/useArticleQueries";
import {
  useProjectDetails,
  useProjectsList,
} from "../../hooks/useProjectQueries";
import { useActivateTaskWorkspaceMutation } from "../../hooks/useTaskQueries";
import type { RootState } from "../../store";
import {
  clearSelectedArticle,
  selectArticle,
} from "../../store/slices/articleSlice";
import { showNotification } from "../../store/slices/notificationSlice";
import { ReviewsListPage } from "../reviewer/ReviewsListPage";
import { AddMemberModal } from "../workspace/AddMemberModal";
import { CreateProjectModal } from "../workspace/CreateProjectModal";
import { CreateTaskModal } from "../workspace/CreateTaskModal";
import { ReleaseCandidatesModal } from "../workspace/ReleaseCandidatesModal";
import { ManagerDashboardPage } from "../manager/ManagerDashboardPage";
import { AuthorDashboard } from "./components/AuthorDashboard";
import { ManagementDashboard } from "./components/ManagementDashboard";

export const DashboardPage = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const user = useSelector((state: RootState) => state.auth.user);
  const selectedArticleId = useSelector(
    (state: RootState) => state.article.selectedArticleId,
  );

  const [provisioningTaskId, setProvisioningTaskId] = useState<string | null>(
    null,
  );
  const activateWorkspaceMutation = useActivateTaskWorkspaceMutation(
    selectedArticleId || "",
  );

  const handleStartWorkspace = async (task: any) => {
    setProvisioningTaskId(task.id);
    try {
      await activateWorkspaceMutation.mutateAsync(task.id);
      navigate(`/workspace/${task.projectId}/task/${task.id}`);
    } catch (err: any) {
      dispatch(
        showNotification({
          message:
            err?.response?.data?.message ||
            "Erro ao inicializar workspace no Pod.",
          severity: "error",
        }),
      );
    } finally {
      setProvisioningTaskId(null);
    }
  };

  const [searchParams, setSearchParams] = useSearchParams();
  const urlArticleId = searchParams.get("articleId");
  const effectiveSelectedArticleId = urlArticleId || selectedArticleId;

  // Sincroniza o parâmetro HTTP (URL query ?articleId=...) com o Redux ao carregar/recarregar a página (F5) ou voltar histórico
  useEffect(() => {
    if (urlArticleId) {
      if (urlArticleId !== selectedArticleId) {
        dispatch(selectArticle(urlArticleId));
      }
    } else if (selectedArticleId) {
      dispatch(clearSelectedArticle());
    }
  }, [urlArticleId, selectedArticleId, dispatch]);

  const handleSelectArticle = (id: string) => {
    setSearchParams({ articleId: id }, { replace: true });
    dispatch(selectArticle(id));
  };

  const handleClearArticle = () => {
    dispatch(clearSelectedArticle());
    navigate("/", { replace: true });
  };

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isCreateTaskOpen, setIsCreateTaskOpen] = useState(false);
  const [isRCModalOpen, setIsRCModalOpen] = useState(false);
  const [isAddMemberOpen, setIsAddMemberOpen] = useState(false);

  const { data: projects, isLoading } = useProjectsList();
  const { data: articles = [] } = useUserArticlesQuery();

  const activeProjectId = effectiveSelectedArticleId || projects?.[0]?.id || "";

  const { data: currentProjectDetails } = useProjectDetails(activeProjectId);

  const selectedArticleFromList = articles.find(
    (a) => a.id === effectiveSelectedArticleId,
  );
  const selectedArticle =
    selectedArticleFromList ||
    (effectiveSelectedArticleId && currentProjectDetails
      ? {
          id: currentProjectDetails.id,
          projectId: currentProjectDetails.id,
          title: currentProjectDetails.name,
          conference:
            (currentProjectDetails as any).targetConferenceName ||
            "Conferência TeX",
          repo:
            currentProjectDetails.gitRepoPath ||
            `github.com/org/${currentProjectDetails.id.slice(0, 8)}`,
          role: (currentProjectDetails.members?.[0]?.role === Role.REVIEWER
            ? "Revisor de Par"
            : "Autor") as "Autor" | "Revisor de Par",
          status:
            (currentProjectDetails as any).submissionStatus ||
            "RC-1 em Andamento",
          progress: 0,
          tasks: [],
          members: (currentProjectDetails.members as any[]) || [],
        }
      : null);

  const currentMembers =
    currentProjectDetails?.members || selectedArticle?.members || [];

  return (
    <Box sx={{ p: 3 }}>
      {/* Header Geral de Boas-Vindas */}
      <Box
        sx={{
          mb: 3,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <Box>
          <Typography variant="h2" component="h1" sx={{ fontWeight: 700 }}>
            Olá, {user?.name || "Pesquisador"} 👋
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Seja bem-vindo à Plataforma de Escrita Científica.
          </Typography>
        </Box>

        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
          {(user?.role === Role.AUTHOR ||
            user?.role === Role.COORDINATOR ||
            user?.role === Role.ADMIN) && (
            <Button
              variant="contained"
              color="primary"
              size="small"
              startIcon={<AddIcon />}
              onClick={() => setIsCreateModalOpen(true)}
            >
              Novo Artigo Científico
            </Button>
          )}
        </Box>
      </Box>

      {/* Indicador de Carregamento de Projetos */}
      {isLoading && (
        <Box sx={{ width: "100%", mb: 3 }}>
          <LinearProgress color="primary" />
        </Box>
      )}

      {/* Visão Adaptativa para o AUTOR */}
      {user?.role === Role.AUTHOR && (
        <AuthorDashboard
          articles={articles}
          selectedArticle={selectedArticle}
          activeProjectId={activeProjectId}
          provisioningTaskId={provisioningTaskId}
          currentUserId={user?.id}
          onSelectArticle={handleSelectArticle}
          onClearArticle={handleClearArticle}
          onStartWorkspace={handleStartWorkspace}
          onOpenCreateTask={() => setIsCreateTaskOpen(true)}
          onOpenRCModal={() => setIsRCModalOpen(true)}
          onOpenAddMember={() => setIsAddMemberOpen(true)}
        />
      )}

      {/* Visão Adaptativa para REVISOR */}
      {user?.role === Role.REVIEWER && <ReviewsListPage />}

      {/* Visão Adaptativa para COORDENADOR */}
      {user?.role === Role.COORDINATOR && (
        <ManagementDashboard userRole={user?.role} />
      )}

      {/* Visão Adaptativa para GERENTE e ADMIN */}
      {(user?.role === Role.MANAGER || user?.role === Role.ADMIN) && (
        <ManagerDashboardPage />
      )}

      {/* Modais Globais de Gestão */}
      <CreateProjectModal
        open={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onArticleCreated={(articleId) => handleSelectArticle(articleId)}
      />

      <CreateTaskModal
        open={isCreateTaskOpen}
        onClose={() => setIsCreateTaskOpen(false)}
        projectId={activeProjectId}
        members={currentMembers}
      />

      <ReleaseCandidatesModal
        open={isRCModalOpen}
        onClose={() => setIsRCModalOpen(false)}
        projectId={activeProjectId}
      />

      <AddMemberModal
        open={isAddMemberOpen}
        onClose={() => setIsAddMemberOpen(false)}
        projectId={activeProjectId}
      />
    </Box>
  );
};
