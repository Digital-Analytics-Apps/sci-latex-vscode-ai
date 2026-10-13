import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import FlagIcon from "@mui/icons-material/Flag";
import GroupIcon from "@mui/icons-material/Group";
import PersonAddIcon from "@mui/icons-material/PersonAdd";
import { Button, Tab, Tabs } from "@mui/material";
import type { SyntheticEvent } from "react";
import { useState } from "react";
import { useDispatch } from "react-redux";
import { StandardModal } from "../../../components/common/StandardModal";
import { Role } from "../../../constants/roles";
import {
  useAcademicPeriods,
  useSetTeamGoalMutation,
} from "../../../hooks/useManagementQueries";
import {
  useAddTeamMemberMutation,
  useCreateTeamMutation,
  useDeleteTeamMutation,
  useRemoveTeamMemberMutation,
  useTeamDetailsQuery,
  useUpdateTeamMutation,
} from "../../../hooks/useTeamQueries";
import { useUserSearchQuery } from "../../../hooks/useUserQueries";
import { showNotification } from "../../../store/slices/notificationSlice";
import type { TeamItem } from "../../../types/team.types";
import type { UserMemberItem } from "../../../types/user.types";
import { TeamGeneralTab } from "./manage-team-tabs/TeamGeneralTab";
import { TeamGoalsTab } from "./manage-team-tabs/TeamGoalsTab";
import { TeamMembersTab } from "./manage-team-tabs/TeamMembersTab";

interface ManageTeamModalProps {
  open: boolean;
  onClose: () => void;
  team: TeamItem | null;
}

export const ManageTeamModal = ({
  open,
  onClose,
  team,
}: ManageTeamModalProps) => {
  const dispatch = useDispatch();

  // Estado para equipe recém-criada (modo criação que transiciona para edição)
  const [createdTeam, setCreatedTeam] = useState<TeamItem | null>(null);
  const activeTeam = team || createdTeam;
  const activeTeamId = activeTeam?.id || "";
  const isEditMode = Boolean(activeTeam?.id);

  // React Query Hooks
  const { data: teamDetails, isLoading: isLoadingDetails } =
    useTeamDetailsQuery(activeTeamId);
  const { data: periods } = useAcademicPeriods();
  const createTeamMutation = useCreateTeamMutation();
  const updateTeamMutation = useUpdateTeamMutation();
  const deleteTeamMutation = useDeleteTeamMutation();
  const addMemberMutation = useAddTeamMemberMutation(activeTeamId);
  const removeMemberMutation = useRemoveTeamMemberMutation(activeTeamId);
  const setTeamGoalMutation = useSetTeamGoalMutation();

  // Tab State
  const [tabIndex, setTabIndex] = useState(0);

  // Form State para Aba 0: Dados da Equipe
  const [prevTeamId, setPrevTeamId] = useState<string | null>(null);
  const [teamForm, setTeamForm] = useState({
    name: "",
    coordinatorId: "",
    coordinatorEmail: "",
  });

  // Estado para Aba 1: Busca e Adição de Membros
  const [search, setSearch] = useState("");
  const { data: searchResults } = useUserSearchQuery(search);

  // Estado para Aba 2: Cotas da Equipe
  const [selectedPeriodId, setSelectedPeriodId] = useState("");
  const [targetArticles, setTargetArticles] = useState<number>(5);

  // Sincronização de estado derivada do time prop
  if (team && team.id !== prevTeamId) {
    setPrevTeamId(team.id);
    setCreatedTeam(null);
    setTeamForm({
      name: team.name || "",
      coordinatorId: team.coordinator?.id || "",
      coordinatorEmail: team.coordinator?.email || "",
    });
  } else if (!team && prevTeamId !== null) {
    setPrevTeamId(null);
    setCreatedTeam(null);
    setTeamForm({
      name: "",
      coordinatorId: "",
      coordinatorEmail: "",
    });
    setTabIndex(0);
  }

  const currentTeam = teamDetails || activeTeam;
  const currentMembers = currentTeam?.members || [];

  // Reset local state ao fechar o modal
  const handleCloseModal = () => {
    setCreatedTeam(null);
    setPrevTeamId(null);
    setTeamForm({
      name: "",
      coordinatorId: "",
      coordinatorEmail: "",
    });
    setTabIndex(0);
    onClose();
  };

  // Handler de Criação / Atualização da Equipe (Aba 0)
  const handleSaveTeam = async (e: SyntheticEvent) => {
    e.preventDefault();
    if (!teamForm.name.trim()) return;

    if (isEditMode && activeTeam) {
      try {
        await updateTeamMutation.mutateAsync({
          id: activeTeam.id,
          data: {
            name: teamForm.name.trim(),
            coordinatorId: teamForm.coordinatorId || undefined,
            coordinatorEmail: teamForm.coordinatorEmail.trim() || undefined,
          },
        });
        dispatch(
          showNotification({
            message: `Dados da equipe "${teamForm.name}" salvos com sucesso!`,
            severity: "success",
          }),
        );
      } catch {
        dispatch(
          showNotification({
            message: "Erro ao atualizar dados da equipe.",
            severity: "error",
          }),
        );
      }
    } else {
      try {
        const newTeam = await createTeamMutation.mutateAsync({
          name: teamForm.name.trim(),
          coordinatorId: teamForm.coordinatorId || undefined,
          coordinatorEmail: teamForm.coordinatorEmail.trim() || undefined,
        });
        setCreatedTeam(newTeam);
        dispatch(
          showNotification({
            message: `Nova Equipe "${teamForm.name}" cadastrada com sucesso! Você já pode adicionar integrantes e definir cotas.`,
            severity: "success",
          }),
        );
        setTabIndex(1);
      } catch {
        dispatch(
          showNotification({
            message: "Erro ao cadastrar equipe de pesquisa.",
            severity: "error",
          }),
        );
      }
    }
  };

  // Handler de Exclusão da Equipe (Aba 0)
  const handleDeleteTeam = async () => {
    if (!activeTeam) return;
    if (
      !window.confirm(
        `Tem certeza que deseja excluir a equipe "${activeTeam.name}"?`,
      )
    ) {
      return;
    }

    try {
      await deleteTeamMutation.mutateAsync(activeTeam.id);
      dispatch(
        showNotification({
          message: `Equipe "${activeTeam.name}" excluída com sucesso.`,
          severity: "success",
        }),
      );
      handleCloseModal();
    } catch {
      dispatch(
        showNotification({
          message: "Erro ao excluir equipe.",
          severity: "error",
        }),
      );
    }
  };

  // Handler para Adicionar Pesquisador à Equipe (Aba 1)
  const handleAddMember = async (user: UserMemberItem) => {
    if (!activeTeamId) return;
    try {
      await addMemberMutation.mutateAsync({
        userId: user.id,
        role: Role.AUTHOR,
      });

      dispatch(
        showNotification({
          message: `${user.name} adicionado(a) como Pesquisador(a) à equipe!`,
          severity: "success",
        }),
      );
      setSearch("");
    } catch {
      dispatch(
        showNotification({
          message: "Erro ao vincular integrante à equipe.",
          severity: "error",
        }),
      );
    }
  };

  // Handler para Remover Membro (Aba 1)
  const handleRemoveMember = async (userId: string, userName: string) => {
    if (!activeTeamId) return;
    try {
      await removeMemberMutation.mutateAsync(userId);
      dispatch(
        showNotification({
          message: `${userName} foi removido(a) da equipe.`,
          severity: "info",
        }),
      );
    } catch {
      dispatch(
        showNotification({
          message: "Erro ao remover integrante da equipe.",
          severity: "error",
        }),
      );
    }
  };

  // Handler para Promover Membro a Coordenador (Aba 1)
  const handlePromoteCoordinator = async (
    userEmail: string,
    userName: string,
  ) => {
    if (!activeTeamId) return;
    try {
      await updateTeamMutation.mutateAsync({
        id: activeTeamId,
        data: { coordinatorEmail: userEmail },
      });
      dispatch(
        showNotification({
          message: `${userName} agora é o(a) Coordenador(a) responsável!`,
          severity: "success",
        }),
      );
    } catch {
      dispatch(
        showNotification({
          message: "Erro ao promover integrante a coordenador.",
          severity: "error",
        }),
      );
    }
  };

  // Handler para Definir Cota da Equipe (Aba 2)
  const handleSetTeamGoal = async (e: SyntheticEvent) => {
    e.preventDefault();
    if (!activeTeamId) return;
    const activePeriodId = selectedPeriodId || periods?.[0]?.id;
    if (!activePeriodId) return;

    try {
      await setTeamGoalMutation.mutateAsync({
        academicPeriodId: activePeriodId,
        teamId: activeTeamId,
        targetArticles: Number(targetArticles),
      });
      dispatch(
        showNotification({
          message: `Cota de ${targetArticles} artigos atribuída à equipe!`,
          severity: "success",
        }),
      );
    } catch {
      dispatch(
        showNotification({
          message: "Erro ao atribuir cota da equipe.",
          severity: "error",
        }),
      );
    }
  };

  let modalFormId: string | undefined;
  if (tabIndex === 0) {
    modalFormId = "save-team-form";
  } else if (tabIndex === 2) {
    modalFormId = "team-goal-form";
  }

  let modalConfirmText = "Atribuir Cota à Equipe";
  if (tabIndex === 0) {
    if (isEditMode) {
      modalConfirmText = "Salvar Alterações";
    } else {
      modalConfirmText = "Cadastrar Equipe";
    }
  }

  return (
    <StandardModal
      open={open}
      onClose={handleCloseModal}
      size="md"
      icon={<GroupIcon color="warning" />}
      title={
        isEditMode
          ? `Gerenciar: ${currentTeam?.name || teamForm.name}`
          : "Nova Equipe de Pesquisa"
      }
      subheader={
        isEditMode ? (
          <Tabs
            value={tabIndex}
            onChange={(_, newValue) => setTabIndex(newValue)}
            aria-label="Abas de Gestão de Equipes"
          >
            <Tab
              icon={<EditIcon fontSize="small" />}
              iconPosition="start"
              label="Dados Gerais"
            />
            <Tab
              icon={<PersonAddIcon fontSize="small" />}
              iconPosition="start"
              label={`Integrantes (${currentMembers.length})`}
            />
            <Tab
              icon={<FlagIcon fontSize="small" />}
              iconPosition="start"
              label="Cota da Equipe"
            />
          </Tabs>
        ) : undefined
      }
      formId={modalFormId}
      showConfirm={tabIndex !== 1}
      confirmText={modalConfirmText}
      confirmColor="warning"
      isSubmitting={
        updateTeamMutation.isPending ||
        createTeamMutation.isPending ||
        setTeamGoalMutation.isPending
      }
      cancelText={tabIndex === 1 ? "Concluir" : "Cancelar"}
      extraFooterActions={
        tabIndex === 0 && isEditMode ? (
          <Button
            color="error"
            variant="outlined"
            size="small"
            startIcon={<DeleteIcon fontSize="small" />}
            onClick={handleDeleteTeam}
            disabled={deleteTeamMutation.isPending}
          >
            Excluir Equipe
          </Button>
        ) : null
      }
    >
      {tabIndex === 0 && (
        <TeamGeneralTab
          isEditMode={isEditMode}
          teamForm={teamForm}
          setTeamForm={setTeamForm}
          onSubmit={handleSaveTeam}
        />
      )}

      {tabIndex === 1 && (
        <TeamMembersTab
          currentTeam={currentTeam}
          currentMembers={currentMembers}
          isLoadingDetails={isLoadingDetails}
          search={search}
          setSearch={setSearch}
          searchResults={searchResults}
          onAddMember={handleAddMember}
          onRemoveMember={handleRemoveMember}
          onPromoteCoordinator={handlePromoteCoordinator}
          isAddPending={addMemberMutation.isPending}
        />
      )}

      {tabIndex === 2 && (
        <TeamGoalsTab
          periods={periods}
          selectedPeriodId={selectedPeriodId}
          setSelectedPeriodId={setSelectedPeriodId}
          targetArticles={targetArticles}
          setTargetArticles={setTargetArticles}
          onSubmit={handleSetTeamGoal}
        />
      )}
    </StandardModal>
  );
};
