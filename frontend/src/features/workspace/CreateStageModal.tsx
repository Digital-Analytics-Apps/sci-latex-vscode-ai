import AddTaskIcon from "@mui/icons-material/AddTask";
import { Box, Chip, TextField, Typography } from "@mui/material";
import React, { useState } from "react";
import { useDispatch } from "react-redux";
import { StandardModal } from "../../components/common/StandardModal";
import { useCreateStageMutation } from "../../hooks/useProjectQueries";
import { showNotification } from "../../store/slices/notificationSlice";

interface CreateStageModalProps {
  open: boolean;
  onClose: () => void;
  projectId: string;
  nextOrder?: number;
}

export const CreateStageModal = ({
  open,
  onClose,
  projectId,
  nextOrder = 1,
}: CreateStageModalProps) => {
  const dispatch = useDispatch();
  const createStageMutation = useCreateStageMutation(projectId);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  const slug = title
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");

  const branchPreview = slug ? `feature/${slug}` : "feature/<slug-da-etapa>";

  const handleSubmit = async (e: React.SyntheticEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      dispatch(
        showNotification({
          message: "Informe o título da etapa de escrita.",
          severity: "warning",
        }),
      );
      return;
    }

    try {
      await createStageMutation.mutateAsync({
        title: title.trim(),
        description: description.trim() || undefined,
        order: nextOrder,
      });

      dispatch(
        showNotification({
          message: `Nova Etapa "${title}" adicionada com sucesso! Branch configurada: ${branchPreview}`,
          severity: "success",
        }),
      );

      setTitle("");
      setDescription("");
      onClose();
    } catch (err: any) {
      const msg =
        err.response?.data?.message ||
        err.message ||
        "Erro ao criar etapa de escrita.";
      dispatch(showNotification({ message: msg, severity: "error" }));
    }
  };

  return (
    <StandardModal
      open={open}
      onClose={onClose}
      size="sm"
      icon={<AddTaskIcon color="primary" />}
      title="Adicionar Nova Etapa de Escrita"
      subtitle="Crie uma nova etapa/seção para a escrita do artigo. Cada etapa representa uma Feature Branch no Git."
      onSubmit={handleSubmit}
      confirmText="Adicionar Etapa"
      confirmColor="primary"
      isSubmitting={createStageMutation.isPending}
    >
      <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
        <TextField
          fullWidth
          size="small"
          label="Título da Etapa de Escrita"
          placeholder="Ex: Metodologia e Modelagem Matemática"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />

        <Box
          sx={{
            p: 1.5,
            borderRadius: 1,
            bgcolor: "action.hover",
            border: "1px dashed",
            borderColor: "divider",
          }}
        >
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ display: "block", mb: 0.5 }}
          >
            🌿 Branch Git de Feature Associada à Etapa:
          </Typography>
          <Chip
            label={branchPreview}
            size="small"
            color="primary"
            variant="outlined"
            sx={{ fontFamily: "monospace", fontWeight: 700 }}
          />
        </Box>

        <TextField
          fullWidth
          size="small"
          multiline
          rows={2}
          label="Descrição / Objetivo da Etapa (Opcional)"
          placeholder="Ex: Escrita detalhada das equações diferenciais e prova de convergência..."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </Box>
    </StandardModal>
  );
};
