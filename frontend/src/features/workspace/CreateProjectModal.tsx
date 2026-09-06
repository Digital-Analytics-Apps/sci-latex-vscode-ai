import { zodResolver } from "@hookform/resolvers/zod";
import AddCircleOutlinedIcon from "@mui/icons-material/AddCircleOutlined";
import DescriptionIcon from "@mui/icons-material/Description";
import {
  Box,
  Button,
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
import { useNavigate } from "react-router-dom";
import { useCreateProjectMutation } from "../../hooks/useProjectQueries";
import {
  createProjectSchema,
  type CreateProjectFormData,
} from "../../schemas/project.schema";
import { showNotification } from "../../store/slices/notificationSlice";

interface CreateProjectModalProps {
  open: boolean;
  onClose: () => void;
}

export const CreateProjectModal: React.FC<CreateProjectModalProps> = ({
  open,
  onClose,
}) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const createProjectMutation = useCreateProjectMutation();

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
    reset,
  } = useForm<CreateProjectFormData>({
    resolver: zodResolver(createProjectSchema),
    defaultValues: {
      name: "",
      targetConference: "IEEE International Symposium 2027",
      submissionDeadline: "2027-02-15",
      template: "IEEEtran",
    },
  });

  const selectedTemplate = watch("template");

  const onSubmit = async (data: CreateProjectFormData) => {
    try {
      const res = await createProjectMutation.mutateAsync(data);
      dispatch(
        showNotification({
          message: `Novo artigo científico "${data.name}" criado com sucesso! Repositório provisionado no GitHub.`,
          severity: "success",
        }),
      );
      reset();
      onClose();
      if (res?.project?.id) {
        navigate(`/workspace/${res.project.id}`);
      } else {
        navigate("/dashboard");
      }
    } catch (err: any) {
      const errorMessage =
        err?.response?.data?.message || err?.message || "Erro ao criar artigo científico.";
      dispatch(
        showNotification({
          message: errorMessage,
          severity: "error",
        }),
      );
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
        <AddCircleOutlinedIcon color="primary" />
        Criar Novo Artigo Científico (Projeto LaTeX)
      </DialogTitle>
      <Typography variant="body2" color="text.secondary" sx={{ px: 3, pb: 1 }}>
        Um novo repositório Git isolado e container TeX Live serão configurados
        para a escrita do artigo.
      </Typography>

      <DialogContent dividers>
        <Box
          component="form"
          id="create-project-form"
          onSubmit={handleSubmit(onSubmit)}
          sx={{ display: "flex", flexDirection: "column", gap: 2 }}
        >
          <TextField
            fullWidth
            size="small"
            label="Título do Artigo Científico"
            placeholder="Ex: Otimização de Compiladores TeX Isolados em Containers"
            {...register("name")}
            error={Boolean(errors.name)}
            helperText={errors.name?.message}
          />

          <TextField
            fullWidth
            size="small"
            label="Congresso / Periódico Alvo"
            placeholder="Ex: IEEE S&P 2027, ACM SIGCOMM, SBC WebMedia"
            {...register("targetConference")}
            error={Boolean(errors.targetConference)}
            helperText={errors.targetConference?.message}
          />

          <TextField
            fullWidth
            size="small"
            type="date"
            label="Data Limite para Submissão"
            slotProps={{ inputLabel: { shrink: true } }}
            {...register("submissionDeadline")}
            error={Boolean(errors.submissionDeadline)}
            helperText={errors.submissionDeadline?.message}
          />

          <FormControl fullWidth size="small" error={Boolean(errors.template)}>
            <InputLabel>Template LaTeX do Evento</InputLabel>
            <Select
              value={selectedTemplate || "IEEEtran"}
              label="Template LaTeX do Evento"
              onChange={(e) =>
                setValue(
                  "template",
                  e.target.value as CreateProjectFormData["template"],
                )
              }
            >
              <MenuItem value="IEEEtran">
                IEEEtran (IEEE Conference & Transactions)
              </MenuItem>
              <MenuItem value="ACM_sigconf">
                ACM sigconf (ACM Conference Format)
              </MenuItem>
              <MenuItem value="SBC">
                SBC (Sociedade Brasileira de Computação)
              </MenuItem>
              <MenuItem value="Springer_LNCS">
                Springer LNCS (Lecture Notes in Computer Science)
              </MenuItem>
            </Select>
            {errors.template && (
              <FormHelperText>{errors.template.message}</FormHelperText>
            )}
          </FormControl>
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose} color="inherit">
          Cancelar
        </Button>
        <Button
          type="submit"
          form="create-project-form"
          variant="contained"
          color="primary"
          startIcon={<DescriptionIcon />}
        >
          Criar Artigo e Abrir Workspace
        </Button>
      </DialogActions>
    </Dialog>
  );
};
