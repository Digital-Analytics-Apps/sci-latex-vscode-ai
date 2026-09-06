import { zodResolver } from "@hookform/resolvers/zod";
import SendIcon from "@mui/icons-material/Send";
import {
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  FormHelperText,
  InputLabel,
  MenuItem,
  Select,
  TextField,
  Typography,
} from "@mui/material";
import React from "react";
import { useForm } from "react-hook-form";
import { useDispatch } from "react-redux";
import {
  useCreatePRMutation,
  type Section,
} from "../../hooks/useProjectQueries";
import { createPRSchema, type CreatePRFormData } from "../../schemas/pr.schema";
import { showNotification } from "../../store/slices/notificationSlice";

interface CreatePRModalProps {
  open: boolean;
  onClose: () => void;
  projectId: string;
  sections: Section[];
  reviewers?: Array<{ id: string; name: string }>;
}

export const CreatePRModal: React.FC<CreatePRModalProps> = ({
  open,
  onClose,
  projectId,
  sections,
  reviewers = [],
}) => {
  const dispatch = useDispatch();
  const createPRMutation = useCreatePRMutation(projectId);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<CreatePRFormData>({
    resolver: zodResolver(createPRSchema),
    defaultValues: {
      title: "",
      description: "",
      sectionId: sections[0]?.id || "",
      reviewerId: reviewers[0]?.id || "",
    },
  });

  const selectedSectionId = watch("sectionId");

  const onSubmit = async (data: CreatePRFormData) => {
    try {
      await createPRMutation.mutateAsync(data);
      dispatch(
        showNotification({
          message:
            "Pull Request aberto com sucesso! A compilação do TeX foi iniciada no servidor.",
          severity: "success",
        }),
      );
      reset();
      onClose();
    } catch (err: any) {
      dispatch(
        showNotification({
          message:
            err.response?.data?.message ||
            "Erro ao abrir Pull Request. Tente novamente.",
          severity: "error",
        }),
      );
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontWeight: 700 }}>
        Enviar Seção para Revisão Acadêmica
      </DialogTitle>

      <form onSubmit={handleSubmit(onSubmit)}>
        <DialogContent
          dividers
          sx={{ display: "flex", flexDirection: "column", gap: 2 }}
        >
          <Typography variant="body2" color="text.secondary">
            Ao solicitar revisão, um job de compilação TeX isolado é enviado
            para a fila do backend para gerar o PDF oficial e notificar o
            Revisor.
          </Typography>

          <Box>
            <Typography variant="subtitle2" sx={{ mb: 0.5, fontWeight: 600 }}>
              Título do Pull Request *
            </Typography>
            <TextField
              fullWidth
              placeholder="ex: Revisão da Seção 2 - Metodologia e Gráficos"
              {...register("title")}
              error={Boolean(errors.title)}
              helperText={errors.title?.message}
            />
          </Box>

          <FormControl fullWidth size="small" error={Boolean(errors.sectionId)}>
            <InputLabel>Seção do Artigo *</InputLabel>
            <Select
              value={selectedSectionId || ""}
              label="Seção do Artigo *"
              onChange={(e) => setValue("sectionId", e.target.value as string)}
            >
              {sections.map((sec) => (
                <MenuItem key={sec.id} value={sec.id}>
                  {sec.title} ({sec.filePath})
                </MenuItem>
              ))}
            </Select>
            {errors.sectionId && (
              <FormHelperText>{errors.sectionId.message}</FormHelperText>
            )}
          </FormControl>

          {reviewers.length > 0 && (
            <FormControl fullWidth size="small">
              <InputLabel>Atribuir Revisor (Opcional)</InputLabel>
              <Select
                value={watch("reviewerId") || ""}
                label="Atribuir Revisor (Opcional)"
                onChange={(e) =>
                  setValue("reviewerId", e.target.value as string)
                }
              >
                <MenuItem value="">
                  Nenhum (Qualquer Revisor da Equipe)
                </MenuItem>
                {reviewers.map((rev) => (
                  <MenuItem key={rev.id} value={rev.id}>
                    {rev.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}

          <Box>
            <Typography variant="subtitle2" sx={{ mb: 0.5, fontWeight: 600 }}>
              Notas para o Revisor (Opcional)
            </Typography>
            <TextField
              fullWidth
              multiline
              rows={3}
              placeholder="Destaque as principais mudanças efetuadas..."
              {...register("description")}
            />
          </Box>
        </DialogContent>

        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={onClose} color="inherit">
            Cancelar
          </Button>
          <Button
            type="submit"
            variant="contained"
            color="primary"
            disabled={createPRMutation.isPending}
            startIcon={
              createPRMutation.isPending ? (
                <CircularProgress size={16} color="inherit" />
              ) : (
                <SendIcon />
              )
            }
          >
            Enviar p/ Revisão
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};
