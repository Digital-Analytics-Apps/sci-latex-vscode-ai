import { zodResolver } from "@hookform/resolvers/zod";
import AddCircleOutlinedIcon from "@mui/icons-material/AddCircleOutlined";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import GroupAddIcon from "@mui/icons-material/GroupAdd";
import TimelineIcon from "@mui/icons-material/Timeline";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  FormControl,
  FormHelperText,

  InputLabel,
  MenuItem,
  Select,
  Stack,
  Step,
  StepLabel,
  Stepper,
  TextField,

  Typography,
} from "@mui/material";
import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { useDispatch } from "react-redux";
import { StandardModal } from "../../../components/common/StandardModal";
import { UserSearchAutocomplete } from "../../../components/common/UserSearchAutocomplete";
import { useCreateProjectMutation } from "../../../hooks/useProjectQueries";
import {
  useTemplatesQuery,
  useUploadTemplateMutation,
} from "../../../hooks/useTemplateQueries";
import {
  type CreateProjectFormData,
  createProjectSchema,
} from "../../../schemas/project.schema";
import { type UserMemberItem } from "../../../services/usersService";
import { showNotification } from "../../../store/slices/notificationSlice";

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
    title: "Planejamento e Pesquisa TeX",
    description:
      "Mapeamento inicial de bibliografia, hipóteses e estruturação TeX",
    plannedCompletionDate: "",
  },
  {
    id: "stage-default-2",
    title: "Desenvolvimento e Experimentos",
    description:
      "Execução dos experimentos, análise de dados e geração de benchmarks",
    plannedCompletionDate: "",
  },
  {
    id: "stage-default-3",
    title: "Escrita do Artigo",
    description:
      "Redação paralela das seções em tarefas com bate e volta",
    plannedCompletionDate: "",
  },
  {
    id: "stage-default-4",
    title: "Revisão Técnica e Científica",
    description:
      "Revisão geral do manuscrito consolidado pelo Revisor Oficial",
    plannedCompletionDate: "",
  },
  {
    id: "stage-default-5",
    title: "Parecer do NIT (Gatekeeper 1)",
    description:
      "Auditoria formal de propriedade intelectual e patentes",
    plannedCompletionDate: "",
  },
  {
    id: "stage-default-6",
    title: "Submissão Final ao Congresso Alvo (Gatekeeper 2)",
    description:
      "Envio oficial do manuscrito compilado para a conferência",
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

  // Gerente Institucional
  const [managerSearchText, setManagerSearchText] = useState("");
  const [selectedManager, setSelectedManager] =
    useState<UserMemberItem | null>(null);

  // Coordenador Técnico
  const [coordinatorSearchText, setCoordinatorSearchText] = useState("");
  const [selectedCoordinator, setSelectedCoordinator] =
    useState<UserMemberItem | null>(null);

  // Autores Adicionais (Criador já é autor automático)
  const [selectedAuthors, setSelectedAuthors] = useState<UserMemberItem[]>([]);

  // Revisor do Artigo (Opcional - qualquer membro)
  const [reviewerSearchText, setReviewerSearchText] = useState("");
  const [selectedReviewer, setSelectedReviewer] =
    useState<UserMemberItem | null>(null);
  const { data: templates = [], isLoading: isLoadingTemplates } =
    useTemplatesQuery();
  const uploadTemplateMutation = useUploadTemplateMutation();
  const [showUploadCustom, setShowUploadCustom] = useState(false);
  const [customFile, setCustomFile] = useState<File | null>(null);
  const [customName, setCustomName] = useState("");
  const [customConf, setCustomConf] = useState("");

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
      templateId: "tpl-system-ieeetran",
    },
  });

  // eslint-disable-next-line react-hooks/incompatible-library
  const selectedTemplateId = watch("templateId");

  React.useEffect(() => {
    if (templates.length > 0 && !selectedTemplateId) {
      setValue("templateId", templates[0].id);
    }
  }, [templates, selectedTemplateId, setValue]);

  const selectedTemplateItem = templates.find(
    (t) => t.id === selectedTemplateId,
  );


  const handleNextStep0 = async () => {
    const isValidStep0 = await trigger([
      "name",
      "targetConference",
      "submissionDeadline",
      "templateId",
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
    if (stages.length !== 6) {
      dispatch(
        showNotification({
          message: "As 6 etapas padronizadas são obrigatórias.",
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


  const handleUpdateStage = (
    id: string,
    field: keyof StageFormItem,
    value: string,
  ) => {
    setStages((prev) =>
      prev.map((s) => (s.id === id ? { ...s, [field]: value } : s)),
    );
  };
  const handleUploadCustomTemplate = async () => {
    if (!customFile) {
      dispatch(
        showNotification({
          message:
            "Por favor, selecione um arquivo .zip contendo os arquivos TeX.",
          severity: "warning",
        }),
      );
      return;
    }

    try {
      const uploaded = await uploadTemplateMutation.mutateAsync({
        file: customFile,
        name: customName.trim() || undefined,
        targetConference: customConf.trim() || undefined,
      });

      setValue("templateId", uploaded.id);
      dispatch(
        showNotification({
          message: `Template "${uploaded.name}" enviado com sucesso para o MinIO!`,
          severity: "success",
        }),
      );
      setShowUploadCustom(false);
      setCustomFile(null);
      setCustomName("");
      setCustomConf("");
    } catch (err: any) {
      dispatch(
        showNotification({
          message:
            err?.response?.data?.message ||
            err?.message ||
            "Erro ao fazer upload do template. Certifique-se de que é um .zip válido.",
          severity: "error",
        }),
      );
    }
  };


  const onSubmit = async (data: CreateProjectFormData) => {
    if (activeStep !== 2) {
      return;
    }

    if (!selectedManager) {
      dispatch(
        showNotification({
          message: "Por favor, selecione o Gerente Institucional responsável.",
          severity: "warning",
        }),
      );
      return;
    }

    if (!selectedCoordinator) {
      dispatch(
        showNotification({
          message: "Por favor, selecione o Coordenador responsável.",
          severity: "warning",
        }),
      );
      return;
    }

    try {
      const res = await createProjectMutation.mutateAsync({
        name: data.name,
        targetConference: data.targetConference,
        submissionDeadline: data.submissionDeadline,
        templateId: data.templateId,
        coordinatorId: selectedCoordinator.id,
        managerId: selectedManager.id,
        additionalAuthorIds: selectedAuthors.map((auth) => auth.id),
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
      setSelectedManager(null);
      setSelectedCoordinator(null);
      setSelectedAuthors([]);
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
              <StepLabel>Governança & Autores</StepLabel>
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
            ? "Próximo: Participantes"
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

          <FormControl
            fullWidth
            size="small"
            error={Boolean(errors.templateId)}
          >
            <InputLabel id="template-select-label">
              Template LaTeX do Evento
            </InputLabel>
            <Select
              labelId="template-select-label"
              value={selectedTemplateId || ""}
              label="Template LaTeX do Evento"
              disabled={isLoadingTemplates}
              onChange={(e) => {
                setValue("templateId", e.target.value as string);
              }}
            >
              {templates.map((tpl) => (
                <MenuItem key={tpl.id} value={tpl.id}>
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      width: "100%",
                      gap: 1,
                    }}
                  >
                    <Typography
                      variant="body2"
                      sx={{ fontWeight: tpl.isSystem ? 600 : 400 }}
                    >
                      {tpl.name}
                    </Typography>
                    <Chip
                      size="small"
                      label={tpl.isSystem ? "Oficial" : "Customizado"}
                      color={tpl.isSystem ? "primary" : "secondary"}
                      variant="outlined"
                      sx={{ height: 20, fontSize: "0.68rem" }}
                    />
                  </Box>
                </MenuItem>
              ))}
            </Select>
            {errors.templateId && (
              <FormHelperText>{errors.templateId.message}</FormHelperText>
            )}
          </FormControl>

          {/* Card explicativo do template selecionado */}
          {selectedTemplateItem && (
            <Box
              sx={{
                p: 1.5,
                borderRadius: 1,
                bgcolor: "action.hover",
                border: "1px dashed",
                borderColor: "divider",
                display: "flex",
                flexDirection: "column",
                gap: 0.5,
              }}
            >
              <Typography variant="caption" color="text.secondary">
                Armazenado no MinIO: <code>{selectedTemplateItem.storageKey}</code>
              </Typography>
              {selectedTemplateItem.description && (
                <Typography variant="caption" color="text.secondary">
                  {selectedTemplateItem.description}
                </Typography>
              )}
            </Box>
          )}

          {/* Botão de Toggle para Subir Template Customizado */}
          <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
            <Button
              size="small"
              variant="text"
              startIcon={<CloudUploadIcon />}
              onClick={() => setShowUploadCustom((prev) => !prev)}
            >
              {showUploadCustom
                ? "Cancelar Envio de Template"
                : "Ou subir meu próprio template (.zip)"}
            </Button>
          </Box>

          {/* Painel de Upload de Template Customizado */}
          {showUploadCustom && (
            <Card
              variant="outlined"
              sx={{
                p: 2,
                bgcolor: "background.paper",
                borderRadius: 1.5,
                borderColor: "primary.light",
                display: "flex",
                flexDirection: "column",
                gap: 1.5,
              }}
            >
              <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                Upload de Template LaTeX (.zip para o MinIO)
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Envie um pacote comprimido contendo o arquivo principal (
                <code>main.tex</code>), classes (<code>.cls</code>), estilos (
                <code>.sty</code>) ou bibliografia (<code>.bib</code>).
              </Typography>

              <TextField
                fullWidth
                size="small"
                label="Nome do Template (Opcional)"
                placeholder="Ex: SBC WebMedia 2027 Template"
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
              />

              <TextField
                fullWidth
                size="small"
                label="Conferência / Periódico Alvo (Opcional)"
                placeholder="Ex: WebMedia"
                value={customConf}
                onChange={(e) => setCustomConf(e.target.value)}
              />

              <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                <Button
                  variant="outlined"
                  component="label"
                  size="small"
                  startIcon={<CloudUploadIcon />}
                >
                  {customFile ? customFile.name : "Selecionar Arquivo .ZIP"}
                  <input
                    type="file"
                    accept=".zip,application/zip,application/x-zip-compressed"
                    hidden
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        setCustomFile(e.target.files[0]);
                      }
                    }}
                  />
                </Button>

                <Button
                  variant="contained"
                  size="small"
                  color="primary"
                  disabled={!customFile || uploadTemplateMutation.isPending}
                  onClick={handleUploadCustomTemplate}
                >
                  {uploadTemplateMutation.isPending
                    ? "Enviando..."
                    : "Salvar no MinIO"}
                </Button>
              </Box>
            </Card>
          )}
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
            6 Etapas Padronizadas do Artigo (Ordem Fixa - ADR-008):
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

                  </Box>
                </CardContent>
              </Card>
            ))}
          </Stack>

        </Box>
      )}

      {/* PASSO 2: GOVERNANÇA E AUTORES */}
      {activeStep === 2 && (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2.5 }}>
          <Typography variant="body2" color="text.secondary">
            Defina a governança institucional e a composição de autores deste
            artigo científico.
          </Typography>

          <Box>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
              Gerente Institucional (Obrigatório):
            </Typography>
            <UserSearchAutocomplete
              value={managerSearchText}
              onChange={(email, user) => {
                setManagerSearchText(email);
                setSelectedManager(user || null);
              }}
              allowedRoles={["MANAGER", "ADMIN"]}
              size="small"
              label="Pesquisar Gerente Institucional"
              placeholder="Digite nome ou e-mail do gerente..."
              required
            />
          </Box>

          <Box>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
              Coordenador do Artigo (Obrigatório):
            </Typography>
            <UserSearchAutocomplete
              value={coordinatorSearchText}
              onChange={(email, user) => {
                setCoordinatorSearchText(email);
                setSelectedCoordinator(user || null);
              }}
              allowedRoles={["COORDINATOR"]}
              size="small"
              label="Pesquisar Coordenador"
              placeholder="Digite nome ou e-mail do coordenador..."
              required
            />
          </Box>

          <Box>
            <Typography
              variant="subtitle2"
              sx={{
                fontWeight: 700,
                mb: 0.5,
                display: "flex",
                alignItems: "center",
                gap: 1,
              }}
            >
              <GroupAddIcon color="primary" fontSize="small" />
              Demais Autores do Artigo (Opcional):
            </Typography>
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ display: "block", mb: 1 }}
            >
              Você já está incluído automaticamente como autor. Adicione outros
              autores agora ou posteriormente.
            </Typography>
            <UserSearchAutocomplete
              multiple
              value={selectedAuthors}
              onChange={(_emails, users) => setSelectedAuthors(users)}
              allowedRoles={["AUTHOR"]}
              size="small"
              label="Pesquisar Autores (mín. 3 letras)"
              placeholder="Digite nome ou e-mail..."
            />
          </Box>

          <Box>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.5 }}>
              Revisor do Artigo (Opcional):
            </Typography>
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ display: "block", mb: 1 }}
            >
              Qualquer membro cadastrado pode ser convidado para revisar este
              artigo.
            </Typography>
            <UserSearchAutocomplete
              value={reviewerSearchText}
              onChange={(email, user) => {
                setReviewerSearchText(email);
                setSelectedReviewer(user || null);
              }}
              size="small"
              label="Pesquisar Revisor (qualquer membro)"
              placeholder="Digite nome ou e-mail..."
            />
          </Box>
        </Box>
      )}
    </StandardModal>
  );
};
