import { zodResolver } from "@hookform/resolvers/zod";
import CancelIcon from "@mui/icons-material/Cancel";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import DownloadIcon from "@mui/icons-material/Download";
import HourglassTopIcon from "@mui/icons-material/HourglassTop";
import SendIcon from "@mui/icons-material/Send";
import {
  Alert,
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
  Tab,
  Tabs,
  TextField,
  Typography,
} from "@mui/material";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { useDispatch } from "react-redux";
import { NITStatus } from "../../constants/status";
import { useSubmitNITParecerMutation } from "../../hooks/useReviewQueries";
import {
  type NITParecerFormData,
  nitParecerSchema,
} from "../../schemas/nit.schema";
import { showNotification } from "../../store/slices/notificationSlice";

interface NITParecerModalProps {
  open: boolean;
  onClose: () => void;
  pullRequestId: string;
  pdfUrl?: string;
  currentNitStatus?: NITStatus;
  sentToNitAt?: string;
  sentToNitNotes?: string;
  nitNotes?: string;
}

export function NITParecerModal({
  open,
  onClose,
  pullRequestId,
  pdfUrl,
  currentNitStatus,
  sentToNitAt: initialSentToNitAt,
  sentToNitNotes: initialSentToNitNotes,
  nitNotes: initialNitNotes,
}: NITParecerModalProps) {
  const dispatch = useDispatch();
  const submitNITMutation = useSubmitNITParecerMutation(pullRequestId);

  const [activeTab, setActiveTab] = useState<number>(
    currentNitStatus === NITStatus.WAITING_NIT ? 1 : 0,
  );

  useEffect(() => {
    if (currentNitStatus === NITStatus.WAITING_NIT) {
      setActiveTab(1);
    } else {
      setActiveTab(0);
    }
  }, [currentNitStatus, open]);

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
      nitStatus:
        currentNitStatus === NITStatus.WAITING_NIT
          ? NITStatus.APPROVED_NIT
          : NITStatus.WAITING_NIT,
      sentToNitAt:
        initialSentToNitAt || new Date().toISOString().substring(0, 16),
      sentToNitNotes: initialSentToNitNotes || "",
      nitNotes: initialNitNotes || "",
    },
  });

  // eslint-disable-next-line react-hooks/incompatible-library
  const selectedStatus = watch("nitStatus");

  const handleTabChange = (_: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
    if (newValue === 0) {
      setValue("nitStatus", NITStatus.WAITING_NIT);
    } else {
      setValue("nitStatus", NITStatus.APPROVED_NIT);
    }
  };

  const onSubmit = async (data: NITParecerFormData) => {
    try {
      if (activeTab === 0) {
        // Registrar Envio ao NIT (Offline Dispatch)
        await submitNITMutation.mutateAsync({
          nitStatus: NITStatus.WAITING_NIT,
          sentToNitAt: data.sentToNitAt || new Date().toISOString(),
          sentToNitNotes: data.sentToNitNotes,
        });
        dispatch(
          showNotification({
            message:
              "Envio ao NIT registrado com sucesso! O status do PR agora é Aguardando Parecer do NIT.",
            severity: "info",
          }),
        );
      } else {
        // Registrar Devolutiva / Parecer Final do NIT
        const now = new Date().toISOString();
        await submitNITMutation.mutateAsync({
          nitStatus: data.nitStatus,
          nitNotes: data.nitNotes,
          nitApprovedAt:
            data.nitStatus === NITStatus.APPROVED_NIT ? now : undefined,
        });
        dispatch(
          showNotification({
            message:
              data.nitStatus === NITStatus.APPROVED_NIT
                ? "Parecer do NIT registrado com APROVAÇÃO! O evento SSE liberou o botão de Merge para o Autor."
                : "Parecer do NIT registrado com REJEIÇÃO / Ajustes Solicitados.",
            severity:
              data.nitStatus === NITStatus.APPROVED_NIT ? "success" : "warning",
          }),
        );
      }
      reset();
      onClose();
    } catch (err: any) {
      dispatch(
        showNotification({
          message:
            err.response?.data?.message ||
            "Erro ao registrar informações do NIT.",
          severity: "error",
        }),
      );
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontWeight: 700, pb: 1 }}>
        Núcleo de Inovação Tecnológica (NIT) - Propriedade Intelectual & Sigilo
      </DialogTitle>

      <Box sx={{ borderBottom: 1, borderColor: "divider", px: 3 }}>
        <Tabs value={activeTab} onChange={handleTabChange} variant="fullWidth">
          <Tab
            label="1. Registrar Envio ao NIT"
            icon={<SendIcon fontSize="small" />}
            iconPosition="start"
          />
          <Tab
            label="2. Registrar Parecer do NIT"
            icon={<HourglassTopIcon fontSize="small" />}
            iconPosition="start"
          />
        </Tabs>
      </Box>

      <form onSubmit={handleSubmit(onSubmit)}>
        <DialogContent
          dividers
          sx={{ display: "flex", flexDirection: "column", gap: 2.5 }}
        >
          {activeTab === 0 && (
            <>
              <Alert severity="info" variant="outlined">
                O departamento do NIT realiza a análise de patenteabilidade e
                sigilo de forma offline/externa. Registre aqui o envio da cópia
                do artigo em PDF para acompanhamento do processo.
              </Alert>

              {pdfUrl && (
                <Box
                  sx={{
                    p: 2,
                    borderRadius: 1,
                    bgcolor: "action.hover",
                    display: "flex",
                    alignItems: "center",
                    justify: "space-between",
                  }}
                >
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    Cópia do Artigo PDF para o NIT:
                  </Typography>
                  <Button
                    component="a"
                    href={pdfUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    variant="outlined"
                    size="small"
                    startIcon={<DownloadIcon />}
                  >
                    Baixar PDF
                  </Button>
                </Box>
              )}

              <Box>
                <Typography
                  variant="subtitle2"
                  sx={{ mb: 0.5, fontWeight: 600 }}
                >
                  Data e Hora do Envio *
                </Typography>
                <TextField
                  fullWidth
                  type="datetime-local"
                  {...register("sentToNitAt")}
                  error={Boolean(errors.sentToNitAt)}
                  helperText={errors.sentToNitAt?.message}
                  slotProps={{ inputLabel: { shrink: true } }}
                />
              </Box>

              <Box>
                <Typography
                  variant="subtitle2"
                  sx={{ mb: 0.5, fontWeight: 600 }}
                >
                  Observações de Envio / Protocolo (Opcional)
                </Typography>
                <TextField
                  fullWidth
                  multiline
                  rows={3}
                  placeholder="Ex: Enviado por e-mail para nit@instituicao.br com protocolo #2026-091..."
                  {...register("sentToNitNotes")}
                  error={Boolean(errors.sentToNitNotes)}
                  helperText={errors.sentToNitNotes?.message}
                />
              </Box>
            </>
          )}

          {activeTab === 1 && (
            <>
              {initialSentToNitAt && (
                <Alert severity="success" variant="outlined" sx={{ mb: 1 }}>
                  Envio registrado em:{" "}
                  <strong>
                    {new Date(initialSentToNitAt).toLocaleString("pt-BR")}
                  </strong>
                  {initialSentToNitNotes && (
                    <div>Nota: {initialSentToNitNotes}</div>
                  )}
                </Alert>
              )}

              <Typography variant="body2" color="text.secondary">
                Após a devolutiva offline do NIT, registre o resultado final do
                parecer para que o autor e revisor possam dar prosseguimento.
              </Typography>

              <FormControl error={Boolean(errors.nitStatus)}>
                <FormLabel sx={{ fontWeight: 600, mb: 1, fontSize: "0.85rem" }}>
                  Resultado da Devolutiva do NIT *
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
                    value={NITStatus.APPROVED_NIT}
                    control={<Radio color="success" />}
                    label={
                      <Box
                        sx={{ display: "flex", alignItems: "center", gap: 0.5 }}
                      >
                        <CheckCircleIcon color="success" fontSize="small" />
                        <Typography
                          variant="body2"
                          sx={{ fontWeight: 600, color: "success.main" }}
                        >
                          Aprovado pelo NIT (Liberar Merge)
                        </Typography>
                      </Box>
                    }
                  />
                  <FormControlLabel
                    value={NITStatus.REJECTED_NIT}
                    control={<Radio color="error" />}
                    label={
                      <Box
                        sx={{ display: "flex", alignItems: "center", gap: 0.5 }}
                      >
                        <CancelIcon color="error" fontSize="small" />
                        <Typography
                          variant="body2"
                          sx={{ fontWeight: 600, color: "error.main" }}
                        >
                          Rejeitado pelo NIT / Restrição de Sigilo
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
                <Typography
                  variant="subtitle2"
                  sx={{ mb: 0.5, fontWeight: 600 }}
                >
                  Parecer Técnico / Justificativa do NIT *
                </Typography>
                <TextField
                  fullWidth
                  multiline
                  rows={4}
                  placeholder="Descreva as orientações, parecer técnico ou restrições apontadas pelo NIT..."
                  {...register("nitNotes")}
                  error={Boolean(errors.nitNotes)}
                  helperText={errors.nitNotes?.message}
                />
              </Box>
            </>
          )}
        </DialogContent>

        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={onClose} color="inherit">
            Cancelar
          </Button>
          <Button
            type="submit"
            variant="contained"
            color={
              activeTab === 0
                ? "primary"
                : selectedStatus === NITStatus.APPROVED_NIT
                  ? "success"
                  : "error"
            }
            disabled={submitNITMutation.isPending}
            startIcon={
              submitNITMutation.isPending ? (
                <CircularProgress size={16} color="inherit" />
              ) : activeTab === 0 ? (
                <SendIcon />
              ) : selectedStatus === NITStatus.APPROVED_NIT ? (
                <CheckCircleIcon />
              ) : (
                <CancelIcon />
              )
            }
          >
            {activeTab === 0
              ? "Registrar Envio ao NIT"
              : "Registrar Parecer Final do NIT"}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
