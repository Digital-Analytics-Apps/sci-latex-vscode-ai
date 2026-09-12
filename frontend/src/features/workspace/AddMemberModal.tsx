import PersonAddIcon from "@mui/icons-material/PersonAdd";
import {
  Autocomplete,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  TextField,
  Typography,
} from "@mui/material";
import { useQueryClient } from "@tanstack/react-query";
import React, { useState } from "react";
import { useDispatch } from "react-redux";
import { useDebounce } from "../../hooks/useDebounce";
import { useUserSearchQuery } from "../../hooks/useUserQueries";
import { api } from "../../services/api";
import { type UserMemberItem } from "../../services/usersService";
import { showNotification } from "../../store/slices/notificationSlice";

interface AddMemberModalProps {
  open: boolean;
  onClose: () => void;
  projectId: string;
  onMemberAdded?: () => void;
}

export const AddMemberModal: React.FC<AddMemberModalProps> = ({
  open,
  onClose,
  projectId,
  onMemberAdded,
}) => {
  const dispatch = useDispatch();
  const queryClient = useQueryClient();

  const [role, setRole] = useState<"AUTHOR" | "REVIEWER">("AUTHOR");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Busca de Usuários com Debounce
  const [searchText, setSearchText] = useState("");
  const debouncedSearch = useDebounce(searchText, 300);
  const { data: usersList = [], isFetching } =
    useUserSearchQuery(debouncedSearch);
  const [selectedUser, setSelectedUser] = useState<UserMemberItem | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) {
      dispatch(
        showNotification({
          message: "Selecione um usuário para adicionar ao artigo.",
          severity: "warning",
        }),
      );
      return;
    }

    if (!projectId) {
      dispatch(
        showNotification({
          message: "Nenhum artigo selecionado.",
          severity: "error",
        }),
      );
      return;
    }

    setIsSubmitting(true);
    try {
      await api.post(`/projects/${projectId}/members`, {
        userId: selectedUser.id,
        role,
      });

      dispatch(
        showNotification({
          message: `${selectedUser.name} foi adicionado como ${
            role === "REVIEWER" ? "Revisor" : "Co-Autor"
          } com sucesso!`,
          severity: "success",
        }),
      );

      // Invalida as queries do React Query para atualizar o card do artigo e a lista de membros
      queryClient.invalidateQueries({ queryKey: ["project", projectId] });
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      queryClient.invalidateQueries({ queryKey: ["user-articles"] });

      setSelectedUser(null);
      setSearchText("");
      if (onMemberAdded) onMemberAdded();
      onClose();
    } catch (err: any) {
      const errorMsg =
        err.response?.data?.message ||
        err.message ||
        "Erro ao adicionar membro ao artigo.";
      dispatch(showNotification({ message: errorMsg, severity: "error" }));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle
        sx={{
          fontWeight: 700,
          pb: 1,
          display: "flex",
          alignItems: "center",
          gap: 1,
        }}
      >
        <PersonAddIcon color="primary" />
        Adicionar Novo Membro ao Artigo
      </DialogTitle>
      <Typography variant="body2" color="text.secondary" sx={{ px: 3, pb: 1 }}>
        Pesquise pesquisadores cadastrados na plataforma para associá-los a este
        artigo como Co-Autores ou Revisores de Par.
      </Typography>

      <DialogContent dividers>
        <Box
          component="form"
          id="add-member-form"
          onSubmit={handleSubmit}
          sx={{ display: "flex", flexDirection: "column", gap: 2.5 }}
        >
          {/* Autocomplete de Usuários com Debounce */}
          <Autocomplete
            options={usersList}
            value={selectedUser}
            onChange={(_e, newValue) =>
              setSelectedUser(newValue as UserMemberItem | null)
            }
            inputValue={searchText}
            onInputChange={(_e, newInputValue) => setSearchText(newInputValue)}
            getOptionLabel={(option) => option.name}
            isOptionEqualToValue={(option, value) => option.id === value.id}
            loading={isFetching}
            noOptionsText={
              searchText.trim().length > 0 && searchText.trim().length < 3
                ? "Digite pelo menos 3 letras para pesquisar..."
                : "Nenhum usuário encontrado."
            }
            renderInput={(params) => (
              <TextField
                {...params}
                size="small"
                label="Buscar Pesquisador (nome ou e-mail)"
                placeholder="Digite para pesquisar..."
                required
                slotProps={{
                  ...params.slotProps,
                  input: {
                    ...params.slotProps.input,
                    endAdornment: (
                      <>
                        {isFetching ? (
                          <CircularProgress color="inherit" size={18} />
                        ) : null}
                        {params.slotProps.input.endAdornment}
                      </>
                    ),
                  },
                }}
              />
            )}
            renderOption={(props, option) => (
              <Box
                component="li"
                {...props}
                key={option.id}
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  width: "100%",
                  py: 1,
                }}
              >
                <Box>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {option.name}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {option.email}
                  </Typography>
                </Box>
                <Chip
                  label={option.role}
                  size="small"
                  variant="outlined"
                  color="primary"
                />
              </Box>
            )}
          />

          {/* Seleção do Papel no Artigo */}
          <FormControl fullWidth size="small">
            <InputLabel>Papel no Artigo</InputLabel>
            <Select
              value={role}
              label="Papel no Artigo"
              onChange={(e) => setRole(e.target.value as "AUTHOR" | "REVIEWER")}
            >
              <MenuItem value="AUTHOR">Co-Autor (AUTHOR)</MenuItem>
              <MenuItem value="REVIEWER">Revisor de Par (REVIEWER)</MenuItem>
            </Select>
          </FormControl>
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose} color="inherit">
          Cancelar
        </Button>
        <Button
          type="submit"
          form="add-member-form"
          variant="contained"
          color="primary"
          disabled={isSubmitting || !selectedUser}
        >
          Adicionar Membro
        </Button>
      </DialogActions>
    </Dialog>
  );
};
