import { Box, TextField, Typography } from "@mui/material";
import type { SyntheticEvent } from "react";
import { UserSearchAutocomplete } from "../../../../components/common/UserSearchAutocomplete";

interface TeamGeneralTabProps {
  isEditMode: boolean;
  teamForm: {
    name: string;
    coordinatorId: string;
    coordinatorEmail: string;
  };
  setTeamForm: React.Dispatch<
    React.SetStateAction<{
      name: string;
      coordinatorId: string;
      coordinatorEmail: string;
    }>
  >;
  onSubmit: (e: SyntheticEvent) => void;
}

export const TeamGeneralTab = ({
  isEditMode,
  teamForm,
  setTeamForm,
  onSubmit,
}: TeamGeneralTabProps) => {
  return (
    <Box
      component="form"
      id="save-team-form"
      onSubmit={onSubmit}
      sx={{ display: "flex", flexDirection: "column", gap: 2.5 }}
    >
      <Typography variant="body2" color="text.secondary">
        {isEditMode
          ? "Atualize o nome do laboratório/equipe e o Coordenador responsável."
          : "Cadastre uma nova equipe de pesquisa e atribua o Coordenador responsável."}
      </Typography>

      <TextField
        required
        fullWidth
        label="Nome da Equipe / Laboratório"
        placeholder="Ex: Laboratório de Robótica & IA"
        value={teamForm.name}
        onChange={(e) =>
          setTeamForm((prev) => ({ ...prev, name: e.target.value }))
        }
      />

      <UserSearchAutocomplete
        value={teamForm.coordinatorEmail}
        onChange={(email, user) => {
          setTeamForm((prev) => ({
            ...prev,
            coordinatorEmail: email,
            coordinatorId: user?.id || "",
          }));
        }}
        allowedRoles={["COORDINATOR", "MANAGER", "ADMIN"]}
        label="Coordenador Responsável"
        placeholder="Buscar por nome ou e-mail..."
        helperText="Selecione um pesquisador cadastrado na lista de sugestões"
      />

      {!isEditMode && (
        <Typography
          variant="caption"
          color="warning.main"
          sx={{ fontWeight: 600, mt: -1 }}
        >
          💡 Dica: Após cadastrar os dados iniciais, o modal liberará
          automaticamente as abas de Integrantes e Cotas.
        </Typography>
      )}
    </Box>
  );
};
