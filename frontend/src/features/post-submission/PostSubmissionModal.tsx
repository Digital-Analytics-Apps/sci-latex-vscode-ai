import { zodResolver } from "@hookform/resolvers/zod";
import CheckCircleOutlinedIcon from "@mui/icons-material/CheckCircleOutlined";
import HighlightOffIcon from "@mui/icons-material/HighlightOff";
import SendIcon from "@mui/icons-material/Send";
import {
  Box,
  Button,
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
import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { useDispatch } from "react-redux";
import {
  doiSchema,
  rejectionDecisionSchema,
  type DOIFormData,
  type RejectionDecisionFormData,
} from "../../schemas/post-submission.schema";
import { showNotification } from "../../store/slices/notificationSlice";

interface PostSubmissionModalProps {
  open: boolean;
  onClose: () => void;
  projectId?: string;
  projectTitle?: string;
  initialStatus?: "ACCEPTED" | "REJECTED";
}

export const PostSubmissionModal: React.FC<PostSubmissionModalProps> = ({
  open,
  onClose,
  projectTitle = "Artigo Científico",
  initialStatus = "ACCEPTED",
}) => {
  const dispatch = useDispatch();
  const [activeTab, setActiveTab] = useState<"ACCEPTED" | "REJECTED">(
    initialStatus,
  );

  // Form para Artigo Aceito (DOI / Publicação)
  const {
    register: registerDoi,
    handleSubmit: handleSubmitDoi,
    formState: { errors: doiErrors },
    reset: resetDoi,
  } = useForm<DOIFormData>({
    resolver: zodResolver(doiSchema),
    defaultValues: {
      doi: "10.1109/SCI.2026.98765",
      publicationUrl: "https://ieeexplore.ieee.org/document/example",
      datasetUrl: "https://zenodo.org/record/example",
    },
  });

  // Form para Artigo Rejeitado (Estratégia v2)
  const {
    register: registerRejection,
    handleSubmit: handleSubmitRejection,
    watch: watchRejection,
    setValue: setRejectionValue,
    formState: { errors: rejectionErrors },
    reset: resetRejection,
  } = useForm<RejectionDecisionFormData>({
    resolver: zodResolver(rejectionDecisionSchema),
    defaultValues: {
      decisionStrategy: "SUBMIT_BACKUP",
      newConferenceName: "",
      newConferenceDate: "",
    },
  });

  const selectedStrategy = watchRejection("decisionStrategy");

  const onSubmitDoi = (data: DOIFormData) => {
    dispatch(
      showNotification({
        message: `Artigo "${projectTitle}" registrado com DOI ${data.doi} e marca de Publicado com Sucesso!`,
        severity: "success",
      }),
    );
    resetDoi();
    onClose();
  };

  const onSubmitRejection = (data: RejectionDecisionFormData) => {
    const strategyLabel =
      data.decisionStrategy === "SUBMIT_BACKUP"
        ? "Submissão ao Congresso Backup Pré-Definido"
        : `Redirecionamento para ${data.newConferenceName || "Novo Congresso Target"}`;

    dispatch(
      showNotification({
        message: `Estratégia v2 gravada com sucesso: ${strategyLabel}!`,
        severity: "info",
      }),
    );
    resetRejection();
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontWeight: 700, pb: 1 }}>
        Registro de Pós-Submissão & Resultado Final
      </DialogTitle>
      <Typography variant="body2" color="text.secondary" sx={{ px: 3, pb: 1 }}>
        Projeto: <strong>{projectTitle}</strong>
      </Typography>

      <Box sx={{ borderBottom: 1, borderColor: "divider", px: 3 }}>
        <Tabs
          value={activeTab}
          onChange={(_e, newValue) => setActiveTab(newValue)}
          textColor="primary"
          indicatorColor="primary"
        >
          <Tab
            value="ACCEPTED"
            label="Artigo Aceito (DOI & Câmera-Ready)"
            icon={<CheckCircleOutlinedIcon fontSize="small" />}
            iconPosition="start"
            sx={{ fontWeight: 600 }}
          />
          <Tab
            value="REJECTED"
            label="Plano v2 (Pós-Rejeição)"
            icon={<HighlightOffIcon fontSize="small" />}
            iconPosition="start"
            sx={{ fontWeight: 600 }}
          />
        </Tabs>
      </Box>

      <DialogContent dividers>
        {activeTab === "ACCEPTED" ? (
          <Box
            component="form"
            id="doi-form"
            onSubmit={handleSubmitDoi(onSubmitDoi)}
            sx={{ display: "flex", flexDirection: "column", gap: 2 }}
          >
            <Typography variant="body2" color="text.secondary">
              Parabéns! O artigo foi aceito pela banca do evento/periódico.
              Preencha os identificadores persistentes para catalogação no
              sistema.
            </Typography>

            <TextField
              fullWidth
              size="small"
              label="DOI do Artigo"
              placeholder="10.1109/SCI.2026.XXXXX"
              {...registerDoi("doi")}
              error={Boolean(doiErrors.doi)}
              helperText={doiErrors.doi?.message}
            />

            <TextField
              fullWidth
              size="small"
              label="URL da Publicação (IEEE / Springer / ACM / Evento)"
              placeholder="https://doi.org/..."
              {...registerDoi("publicationUrl")}
              error={Boolean(doiErrors.publicationUrl)}
              helperText={doiErrors.publicationUrl?.message}
            />

            <TextField
              fullWidth
              size="small"
              label="URL do Repository / Dataset (Zenodo, Figshare, GitHub)"
              placeholder="https://zenodo.org/..."
              {...registerDoi("datasetUrl")}
              error={Boolean(doiErrors.datasetUrl)}
              helperText={doiErrors.datasetUrl?.message}
            />
          </Box>
        ) : (
          <Box
            component="form"
            id="rejection-form"
            onSubmit={handleSubmitRejection(onSubmitRejection)}
            sx={{ display: "flex", flexDirection: "column", gap: 2 }}
          >
            <Typography variant="body2" color="text.secondary">
              Em caso de rejeição no congresso primário, selecione o fluxo de
              contingência v2 definido pela equipe.
            </Typography>

            <FormControl error={Boolean(rejectionErrors.decisionStrategy)}>
              <FormLabel sx={{ fontWeight: 600, fontSize: "0.875rem" }}>
                Estratégia de Redirecionamento
              </FormLabel>
              <RadioGroup
                value={selectedStrategy}
                onChange={(e) =>
                  setRejectionValue(
                    "decisionStrategy",
                    e.target.value as "SUBMIT_BACKUP" | "SUBMIT_NEW_TARGET",
                  )
                }
              >
                <FormControlLabel
                  value="SUBMIT_BACKUP"
                  control={<Radio size="small" color="primary" />}
                  label="1. Submeter imediatamente ao Congresso Backup pré-cadastrado no projeto"
                />
                <FormControlLabel
                  value="SUBMIT_NEW_TARGET"
                  control={<Radio size="small" color="primary" />}
                  label="2. Escolher um Novo Congresso Target e readequar a versão v2"
                />
              </RadioGroup>
              {rejectionErrors.decisionStrategy && (
                <FormHelperText>
                  {rejectionErrors.decisionStrategy.message}
                </FormHelperText>
              )}
            </FormControl>

            {selectedStrategy === "SUBMIT_NEW_TARGET" && (
              <Box
                sx={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 2,
                  pl: 3,
                  pt: 1,
                  borderLeft: "2px solid",
                  borderColor: "primary.main",
                }}
              >
                <TextField
                  fullWidth
                  size="small"
                  label="Nome do Novo Congresso / Periódico Target"
                  placeholder="Ex: ACM SIGCOMM 2027"
                  {...registerRejection("newConferenceName")}
                />
                <TextField
                  fullWidth
                  size="small"
                  type="date"
                  label="Nova Data Limite de Submissão"
                  slotProps={{ inputLabel: { shrink: true } }}
                  {...registerRejection("newConferenceDate")}
                />
              </Box>
            )}
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose} color="inherit">
          Cancelar
        </Button>
        {activeTab === "ACCEPTED" ? (
          <Button
            type="submit"
            form="doi-form"
            variant="contained"
            color="success"
            startIcon={<CheckCircleOutlinedIcon />}
          >
            Registrar DOI & Finalizar Artigo
          </Button>
        ) : (
          <Button
            type="submit"
            form="rejection-form"
            variant="contained"
            color="warning"
            startIcon={<SendIcon />}
          >
            Confirmar Estratégia v2
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};
