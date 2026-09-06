import { zodResolver } from "@hookform/resolvers/zod";
import CancelIcon from "@mui/icons-material/Cancel";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import {
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  FormControlLabel,
  FormHelperText,
  FormLabel,
  Radio,
  RadioGroup,
  TextField,
  Typography,
} from "@mui/material";
import React from "react";
import { useForm } from "react-hook-form";
import { useDispatch } from "react-redux";
import { useSubmitNITParecerMutation } from "../../hooks/useReviewQueries";
import {
  nitParecerSchema,
  type NITParecerFormData,
} from "../../schemas/nit.schema";
import { showNotification } from "../../store/slices/notificationSlice";

interface NITParecerModalProps {
  open: boolean;
  onClose: () => void;
  pullRequestId: string;
}

export const NITParecerModal: React.FC<NITParecerModalProps> = ({
  open,
  onClose,
  pullRequestId,
}) => {
  const dispatch = useDispatch();
  const submitNITMutation = useSubmitNITParecerMutation(pullRequestId);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<NITParecerFormData>({
    resolver: zodResolver(nitParecerSchema),
    defaultValues: {
      nitStatus: "APPROVED_NIT",
      nitNotes: "",
    },
  });

  const selectedStatus = watch("nitStatus");

  const onSubmit = async (data: NITParecerFormData) => {
    try {
      await submitNITMutation.mutateAsync(data);
      dispatch(
        showNotification({
          message:
            data.nitStatus === "APPROVED_NIT"
              ? "Parecer do NIT registrado com APROVAÇÃO! O evento SSE liberou o botão de Merge para o Autor."
              : "Parecer do NIT registrado com REJEIÇÃO / Ajustes Solicitados.",
          severity: data.nitStatus === "APPROVED_NIT" ? "success" : "warning",
        }),
      );
      reset();
      onClose();
    } catch (err: any) {
      dispatch(
        showNotification({
          message:
            err.response?.data?.message || "Erro ao registrar parecer do NIT.",
          severity: "error",
        }),
      );
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontWeight: 700 }}>
        Registro de Parecer do NIT (Propriedade Intelectual & Sigilo)
      </DialogTitle>

      <form onSubmit={handleSubmit(onSubmit)}>
        <DialogContent
          dividers
          sx={{ display: "flex", flexDirection: "column", gap: 2 }}
        >
          <Typography variant="body2" color="text.secondary">
            O parecer do Núcleo de Inovação Tecnológica (NIT) certifica se a
            seção contém dados sensíveis, patentes ou segredo industrial antes
            do merge e submissão.
          </Typography>

          <FormControl error={Boolean(errors.nitStatus)}>
            <FormLabel sx={{ fontWeight: 600, mb: 1, fontSize: "0.85rem" }}>
              Decisão do Parecer *
            </FormLabel>
            <RadioGroup
              row
              value={selectedStatus}
              onChange={(e) =>
                setValue(
                  "nitStatus",
                  e.target.value as "APPROVED_NIT" | "REJECTED_NIT",
                )
              }
            >
              <FormControlLabel
                value="APPROVED_NIT"
                control={<Radio color="success" />}
                label={
                  <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                    <CheckCircleIcon color="success" fontSize="small" />
                    <Typography
                      variant="body2"
                      sx={{ fontWeight: 600, color: "success.main" }}
                    >
                      Aprovado sem Restrições (Liberar Merge)
                    </Typography>
                  </Box>
                }
              />
              <FormControlLabel
                value="REJECTED_NIT"
                control={<Radio color="error" />}
                label={
                  <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                    <CancelIcon color="error" fontSize="small" />
                    <Typography
                      variant="body2"
                      sx={{ fontWeight: 600, color: "error.main" }}
                    >
                      Rejeitado / Ajustes Solicitados
                    </Typography>
                  </Box>
                }
              />
            </RadioGroup>
            {errors.nitStatus && (
              <FormHelperText>{errors.nitStatus.message}</FormHelperText>
            )}
          </FormControl>

          <Box>
            <Typography variant="subtitle2" sx={{ mb: 0.5, fontWeight: 600 }}>
              Justificativa / Parecer Técnico do NIT *
            </Typography>
            <TextField
              fullWidth
              multiline
              rows={4}
              placeholder="Descreva a avaliação de propriedade intelectual, patentes ou requisitos..."
              {...register("nitNotes")}
              error={Boolean(errors.nitNotes)}
              helperText={errors.nitNotes?.message}
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
            color={selectedStatus === "APPROVED_NIT" ? "success" : "error"}
            disabled={submitNITMutation.isPending}
            startIcon={
              submitNITMutation.isPending ? (
                <CircularProgress size={16} color="inherit" />
              ) : selectedStatus === "APPROVED_NIT" ? (
                <CheckCircleIcon />
              ) : (
                <CancelIcon />
              )
            }
          >
            Registrar Parecer do NIT
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};
