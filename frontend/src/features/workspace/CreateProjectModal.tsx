import { zodResolver } from "@hookform/resolvers/zod";
import AddIcon from "@mui/icons-material/Add";
import AddCircleOutlinedIcon from "@mui/icons-material/AddCircleOutlined";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import DeleteIcon from "@mui/icons-material/Delete";
import GroupAddIcon from "@mui/icons-material/GroupAdd";
import LockIcon from "@mui/icons-material/Lock";
import TimelineIcon from "@mui/icons-material/Timeline";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  FormControl,
  FormHelperText,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Step,
  StepLabel,
  Stepper,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { useDispatch } from "react-redux";
import { StandardModal } from "../../components/common/StandardModal";
import { UserSearchAutocomplete } from "../../components/common/UserSearchAutocomplete";
import { useCreateProjectMutation } from "../../hooks/useProjectQueries";
import {
  type CreateProjectFormData,
  createProjectSchema,
} from "../../schemas/project.schema";
import { type UserMemberItem } from "../../services/usersService";
import { showNotification } from "../../store/slices/notificationSlice";

interface CreateProjectModalProps {
  open: boolean;
  onClose: () => void;
  onArticleCreated?: (articleId: string) => void;
}

interface StageFormItem {
  id: string;
  title: string;
  description?: string;
  plannedCompletionDate?: string;
}

const DEFAULT_INITIAL_STAGES: StageFormItem[] = [
  {
    id: "stage-default-1",
    title: "Planejamento e Pesquisa",
    description:
      "Mapeamento inicial de bibliografia, hipóteses e estruturação TeX",
    plannedCompletionDate: "",
  },
  {
    id: "stage-default-2",
    title: "Desenvolvimento e Experimentos",
    description:
      "Execução dos experimentos, análise de dados e geração de gráficos",
    plannedCompletionDate: "",
  },
  {
    id: "stage-default-3",
    title: "Escrita da Versão Rascunho",
    description:
      "Redação completa das seções de introdução, método e resultados",
    plannedCompletionDate: "",
  },
];

export const CreateProjectModal: React.FC<CreateProjectModalProps> = ({
  open,
  onClose,
  onArticleCreated,
}) => {
  const dispatch = useDispatch();
  const createProjectMutation = useCreateProjectMutation();

  const [activeStep, setActiveStep] = useState(0);

  // Etapas de Escrita Customizadas
  const [stages, setStages] = useState<StageFormItem[]>(DEFAULT_INITIAL_STAGES);

  // Co-Autores
  const [selectedCoAuthors, setSelectedCoAuthors] = useState<UserMemberItem[]>(
    [],
  );

  // Revisor Técnico
  const [reviewerSearchText, setReviewerSearchText] = useState("");
  const [selectedReviewer, setSelectedReviewer] =
    useState<UserMemberItem | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    trigger,
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

  // eslint-disable-next-line react-hooks/incompatible-library
  const selectedTemplate = watch("template");

  const submissionDeadline = watch("submissionDeadline");

  const handleNextStep0 = async () => {
    const isValidStep0 = await trigger([
      "name",
      "targetConference",
      "submissionDeadline",
      "template",
    ]);
    if (isValidStep0) {
      setActiveStep(1);
    }
  };

  const handleNextStep1 = () => {
    const hasEmptyTitle = stages.some((s) => !s.title.trim());
    if (hasEmptyTitle) {
      dispatch(
        showNotification({
          message: "Todas as etapas de escrita devem possuir um título válido.",
          severity: "warning",
        }),
      );
      return;
    }
    if (stages.length < 3) {
      dispatch(
        showNotification({
          message:
            "É obrigatório manter no mínimo 3 etapas de escrita antes dos gatekeepers.",
          severity: "warning",
        }),
      );
      return;
    }
    setActiveStep(2);
  };

  const handleBack = () => {
    setActiveStep((prev) => Math.max(0, prev - 1));
  };

  const handleAddStage = () => {
    const nextNum = stages.length + 1;
    setStages((prev) => [
      ...prev,
      {
        id: `stage-custom-${Date.now()}`,
        title: `Etapa ${nextNum < 10 ? `0${nextNum}` : nextNum}: Nova Etapa`,
        description: "",
        plannedCompletionDate: "",
      },
    ]);
  };

  const handleRemoveStage = (id: string) => {
    if (stages.length <= 3) {
      dispatch(
        showNotification({
          message:
            "Não é possível remover. É obrigatório manter no mínimo 3 etapas de escrita.",
          severity: "warning",
        }),
      );
      return;
    }
    setStages((prev) => prev.filter((s) => s.id !== id));
  };

  const handleUpdateStage = (
    id: string,
    field: keyof StageFormItem,
    value: string,
  ) => {
    setStages((prev) =>
      prev.map((s) => (s.id === id ? { ...s, [field]: value } : s)),
    );
  };

  const onSubmit = async (data: CreateProjectFormData) => {
    if (activeStep !== 2) {
      return;
    }

    try {
      const res = await createProjectMutation.mutateAsync({
        name: data.name,
        targetConference: data.targetConference,
        submissionDeadline: data.submissionDeadline,
        template: data.template,
        coAuthorIds: selectedCoAuthors.map((auth) => auth.id),
        reviewerId: selectedReviewer ? selectedReviewer.id : undefined,
        stages: stages.map((s) => ({
          title: s.title,
          description: s.description,
          plannedCompletionDate: s.plannedCompletionDate || undefined,
        })),
      });

      dispatch(
        showNotification({
          message: `Novo artigo científico "${data.name}" criado com sucesso com ${stages.length} etapas de escrita!`,
          severity: "success",
        }),
      );

      const newId = res?.project?.id || "art-1";
      reset();
      setActiveStep(0);
      setStages(DEFAULT_INITIAL_STAGES);
      setSelectedCoAuthors([]);
      setSelectedReviewer(null);
      onClose();

      if (onArticleCreated) {
        onArticleCreated(newId);
      }
    } catch (err: any) {
      dispatch(
        showNotification({
          message:
            err?.response?.data?.message ||
            err?.message ||
            "Erro ao criar artigo científico. Tente novamente.",
          severity: "error",
        }),
      );
    }
  };

  return (
    <StandardModal
      open={open}
      onClose={onClose}
      size="lg"
      icon={<AddCircleOutlinedIcon color="primary" />}
      title="Criar Novo Artigo Científico (Projeto LaTeX)"
      subheader={
        <Box sx={{ py: 1.5 }}>
          <Stepper activeStep={activeStep} alternativeLabel>
            <Step>
              <StepLabel>Informações do Artigo</StepLabel>
            </Step>
            <Step>
              <StepLabel>Etapas & Cronograma</StepLabel>
            </Step>
            <Step>
              <StepLabel>Pares & Revisores</StepLabel>
            </Step>
          </Stepper>
        </Box>
      }
      showCancel={activeStep === 0}
      extraFooterActions={
        activeStep > 0 ? (
          <Button
            type="button"
            onClick={handleBack}
            startIcon={<ArrowBackIcon />}
            color="inherit"
            disabled={createProjectMutation.isPending}
          >
            Voltar
          </Button>
        ) : null
      }
      onConfirm={
        activeStep === 0
          ? handleNextStep0
          : activeStep === 1
            ? handleNextStep1
            : handleSubmit(onSubmit)
      }
      confirmText={
        activeStep === 0
          ? "Próximo: Etapas & Prazos"
          : activeStep === 1
            ? "Próximo: Adicionar Pares"
            : "Criar Artigo e Ir para Tarefas"
      }
      confirmColor={activeStep === 2 ? "success" : "primary"}
      isSubmitting={createProjectMutation.isPending}
    >
      {/* PASSO 0: INFORMAÇÕES BÁSICAS */}
      {activeStep === 0 && (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <Typography variant="body2" color="text.secondary">
            Informe os metadados do artigo, a conferência-alvo e o template
            LaTeX oficial do evento.
          </Typography>

          <TextField
            fullWidth
            size="small"
            label="Título do Artigo Científico"
            placeholder="Ex: Otimização de Compiladores TeX Isolados em Containers"
            {...register("name")}
            error={Boolean(errors.name)}
            helperText={errors.name?.message}
            required
          />

          <TextField
            fullWidth
            size="small"
            label="Congresso / Periódico Alvo"
            placeholder="Ex: IEEE S&P 2027, ACM SIGCOMM, SBC WebMedia"
            {...register("targetConference")}
            error={Boolean(errors.targetConference)}
            helperText={errors.targetConference?.message}
            required
          />

          <TextField
            fullWidth
            size="small"
            type="date"
            label="Data Limite para Submissão ao Congresso"
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
      )}

      {/* PASSO 1: ETAPAS DE ESCRITA E CRONOGRAMA */}
      {activeStep === 1 && (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <Alert severity="info" sx={{ py: 0.5, fontSize: 13 }}>
            Configure as etapas de escrita do seu artigo e defina as datas
            previstas. É obrigatório manter no mínimo 3 etapas de escrita antes
            das 2 etapas obrigatórias de gatekeeper.
          </Alert>

          <Typography
            variant="subtitle2"
            sx={{
              fontWeight: 700,
              display: "flex",
              alignItems: "center",
              gap: 1,
            }}
          >
            <TimelineIcon color="primary" fontSize="small" />
            Etapas de Escrita do Artigo ({stages.length}):
          </Typography>

          <Stack
            spacing={1.5}
            sx={{ maxHeight: 320, overflowY: "auto", pr: 0.5 }}
          >
            {stages.map((stage, index) => (
              <Card
                key={stage.id}
                variant="outlined"
                sx={{
                  borderRadius: 1.5,
                  borderColor: "divider",
                  bgcolor: "background.paper",
                }}
              >
                <CardContent sx={{ p: 1.5, "&:last-child": { pb: 1.5 } }}>
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 1.5,
                    }}
                  >
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        gap: 1,
                        flex: 1,
                      }}
                    >
                      <Chip
                        label={`Etapa ${index + 1}`}
                        size="small"
                        color="primary"
                        variant="outlined"
                        sx={{ fontWeight: 700, minWidth: 65 }}
                      />
                      <TextField
                        size="small"
                        fullWidth
                        label="Título da Etapa"
                        value={stage.title}
                        onChange={(e) =>
                          handleUpdateStage(stage.id, "title", e.target.value)
                        }
                      />
                    </Box>

                    <TextField
                      size="small"
                      type="date"
                      label="Data Prevista"
                      slotProps={{ inputLabel: { shrink: true } }}
                      value={stage.plannedCompletionDate || ""}
                      onChange={(e) =>
                        handleUpdateStage(
                          stage.id,
                          "plannedCompletionDate",
                          e.target.value,
                        )
                      }
                      sx={{ width: 170 }}
                    />

                    <Tooltip
                      title={
                        stages.length <= 3
                          ? "Mínimo de 3 etapas de escrita obrigatórias"
                          : "Remover Etapa"
                      }
                    >
                      <span>
                        <IconButton
                          size="small"
                          color="error"
                          disabled={stages.length <= 3}
                          onClick={() => handleRemoveStage(stage.id)}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </span>
                    </Tooltip>
                  </Box>
                </CardContent>
              </Card>
            ))}
          </Stack>

          <Button
            variant="outlined"
            startIcon={<AddIcon />}
            onClick={handleAddStage}
            size="small"
            sx={{
              alignSelf: "flex-start",
              textTransform: "none",
              fontWeight: 700,
            }}
          >
            + Adicionar Etapa de Escrita
          </Button>

          {/* FIXAS: ETAPAS DE GATEKEEPER */}
          <Typography
            variant="subtitle2"
            sx={{ fontWeight: 700, mt: 1, color: "text.secondary" }}
          >
            Etapas Obrigatórias de Trava (Gatekeepers):
          </Typography>

          <Stack spacing={1}>
            <Card
              variant="outlined"
              sx={{ bgcolor: "action.hover", opacity: 0.85 }}
            >
              <CardContent sx={{ p: 1.5, "&:last-child": { pb: 1.5 } }}>
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <LockIcon color="action" fontSize="small" />
                    <Typography variant="body2" sx={{ fontWeight: 700 }}>
                      Parecer do NIT (Gatekeeper 1)
                    </Typography>
                  </Box>
                  <Chip
                    label="🔒 Fixo / Automático"
                    size="small"
                    variant="filled"
                  />
                </Box>
              </CardContent>
            </Card>

            <Card
              variant="outlined"
              sx={{ bgcolor: "action.hover", opacity: 0.85 }}
            >
              <CardContent sx={{ p: 1.5, "&:last-child": { pb: 1.5 } }}>
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <LockIcon color="action" fontSize="small" />
                    <Typography variant="body2" sx={{ fontWeight: 700 }}>
                      Submissão ao Congresso Alvo (Gatekeeper 2)
                    </Typography>
                  </Box>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ fontWeight: 700 }}
                  >
                    Data limite: {submissionDeadline || "Não configurada"}
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Stack>
        </Box>
      )}

      {/* PASSO 2: CO-AUTORES E REVISORES */}
      {activeStep === 2 && (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2.5 }}>
          <Typography variant="body2" color="text.secondary">
            Associe os co-autores e o revisor técnico digitando na pesquisa
            (mínimo de 3 caracteres para buscar na API).
          </Typography>

          <Box>
            <Typography
              variant="subtitle2"
              sx={{
                fontWeight: 700,
                mb: 1,
                display: "flex",
                alignItems: "center",
                gap: 1,
              }}
            >
              <GroupAddIcon color="primary" fontSize="small" />
              Co-Autores Integrantes do Artigo:
            </Typography>
            <UserSearchAutocomplete
              multiple
              value={selectedCoAuthors}
              onChange={(_emails, users) => setSelectedCoAuthors(users)}
              allowedRoles={["AUTHOR"]}
              size="small"
              label="Pesquisar Co-Autores (mín. 3 letras)"
              placeholder="Digite nome ou e-mail..."
            />
          </Box>

          <Box>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
              Revisor Técnico / Revisor de Par:
            </Typography>
            <UserSearchAutocomplete
              value={reviewerSearchText}
              onChange={(email, user) => {
                setReviewerSearchText(email);
                setSelectedReviewer(user || null);
              }}
              size="small"
              label="Pesquisar Revisor Técnico"
              placeholder="Digite nome ou e-mail..."
            />
          </Box>
        </Box>
      )}
    </StandardModal>
  );
};
