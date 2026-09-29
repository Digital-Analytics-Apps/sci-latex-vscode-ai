import { zodResolver } from "@hookform/resolvers/zod";
import AddCircleOutlinedIcon from "@mui/icons-material/AddCircleOutlined";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import GroupAddIcon from "@mui/icons-material/GroupAdd";
import {
  Box,
  Button,
  FormControl,
  FormHelperText,
  InputLabel,
  MenuItem,
  Select,
  Step,
  StepLabel,
  Stepper,
  TextField,
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

export const CreateProjectModal: React.FC<CreateProjectModalProps> = ({
  open,
  onClose,
  onArticleCreated,
}) => {
  const dispatch = useDispatch();
  const createProjectMutation = useCreateProjectMutation();

  const [activeStep, setActiveStep] = useState(0);

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

  const handleNext = async () => {
    const isValidStep1 = await trigger([
      "name",
      "targetConference",
      "submissionDeadline",
      "template",
    ]);
    if (isValidStep1) {
      setActiveStep(1);
    }
  };

  const handleBack = () => {
    setActiveStep(0);
  };

  const onSubmit = async (data: CreateProjectFormData) => {
    // Trava de segurança: Garante que a criação do artigo NUNCA ocorra no Passo 0
    if (activeStep !== 1) {
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
      });
      dispatch(
        showNotification({
          message: `Novo artigo científico "${data.name}" criado com sucesso com ${selectedCoAuthors.length} co-autor(es)!`,
          severity: "success",
        }),
      );
      const newId = res?.project?.id || "art-1";
      reset();
      setActiveStep(0);
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
              <StepLabel>Adicionar Pares & Revisores</StepLabel>
            </Step>
          </Stepper>
        </Box>
      }
      showCancel={activeStep === 0}
      extraFooterActions={
        activeStep === 1 ? (
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
      onConfirm={activeStep === 0 ? handleNext : handleSubmit(onSubmit)}
      confirmText={
        activeStep === 0
          ? "Próximo: Adicionar Pares"
          : "Criar Artigo e Ir para Tarefas"
      }
      confirmColor={activeStep === 0 ? "primary" : "success"}
      isSubmitting={createProjectMutation.isPending}
    >
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
      )}

      {activeStep === 1 && (
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
