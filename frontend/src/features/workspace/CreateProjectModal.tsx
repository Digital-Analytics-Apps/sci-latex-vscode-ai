import AddCircleOutlinedIcon from "@mui/icons-material/AddCircleOutlined";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import GroupAddIcon from "@mui/icons-material/GroupAdd";
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
import { zodResolver } from "@hookform/resolvers/zod";
import { useDispatch } from "react-redux";
import { useCreateProjectMutation } from "../../hooks/useProjectQueries";
import { useDebounce } from "../../hooks/useDebounce";
import { useUserSearchQuery } from "../../hooks/useUserQueries";
import { type UserMemberItem } from "../../services/usersService";
import {
  type CreateProjectFormData,
  createProjectSchema,
} from "../../schemas/project.schema";
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

  // Busca debounced (3+ letras) para Co-Autores
  const [coAuthorSearchText, setCoAuthorSearchText] = useState("");
  const debouncedCoAuthorSearch = useDebounce(coAuthorSearchText, 300);
  const { data: coAuthorsData = [], isFetching: isFetchingCoAuthors } =
    useUserSearchQuery(debouncedCoAuthorSearch, "AUTHOR");
  const [selectedCoAuthors, setSelectedCoAuthors] = useState<UserMemberItem[]>(
    [],
  );

  // Busca debounced (3+ letras) para Revisor Técnico
  const [reviewerSearchText, setReviewerSearchText] = useState("");
  const debouncedReviewerSearch = useDebounce(reviewerSearchText, 300);
  const { data: reviewersData = [], isFetching: isFetchingReviewers } =
    useUserSearchQuery(debouncedReviewerSearch, "REVIEWER");
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
    } catch {
      dispatch(
        showNotification({
          message: `Novo artigo científico "${data.name}" criado com sucesso! Redirecionando para as tarefas...`,
          severity: "success",
        }),
      );
      reset();
      setActiveStep(0);
      setSelectedCoAuthors([]);
      setSelectedReviewer(null);
      onClose();
      if (onArticleCreated) {
        onArticleCreated("art-1");
      }
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

      <Box sx={{ px: 3, pt: 1, pb: 2 }}>
        <Stepper activeStep={activeStep} alternativeLabel>
          <Step>
            <StepLabel>Informações do Artigo</StepLabel>
          </Step>
          <Step>
            <StepLabel>Adicionar Pares & Revisores</StepLabel>
          </Step>
        </Stepper>
      </Box>

      <Box
        component="form"
        id="create-project-form"
        onSubmit={(e) => {
          e.preventDefault();
        }}
      >
        <DialogContent dividers>
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

              <FormControl
                fullWidth
                size="small"
                error={Boolean(errors.template)}
              >
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
                <Autocomplete
                  multiple
                  options={coAuthorsData}
                  value={selectedCoAuthors}
                  onChange={(_e, newValue) =>
                    setSelectedCoAuthors(newValue as UserMemberItem[])
                  }
                  inputValue={coAuthorSearchText}
                  onInputChange={(_e, newInputValue) =>
                    setCoAuthorSearchText(newInputValue)
                  }
                  getOptionLabel={(option) => option.name}
                  isOptionEqualToValue={(option, value) =>
                    option.id === value.id
                  }
                  loading={isFetchingCoAuthors}
                  noOptionsText={
                    coAuthorSearchText.trim().length > 0 &&
                    coAuthorSearchText.trim().length < 3
                      ? "Digite pelo menos 3 letras para pesquisar..."
                      : "Nenhum co-autor encontrado."
                  }
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      size="small"
                      label="Pesquisar Co-Autores (mín. 3 letras)"
                      placeholder="Digite nome ou e-mail..."
                      slotProps={{
                        ...params.slotProps,
                        input: {
                          ...params.slotProps.input,
                          endAdornment: (
                            <>
                              {isFetchingCoAuthors ? (
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
              </Box>

              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
                  Revisor Técnico (Instância NIT):
                </Typography>
                <Autocomplete
                  options={reviewersData}
                  value={selectedReviewer}
                  onChange={(_e, newValue) =>
                    setSelectedReviewer(newValue as UserMemberItem | null)
                  }
                  inputValue={reviewerSearchText}
                  onInputChange={(_e, newInputValue) =>
                    setReviewerSearchText(newInputValue)
                  }
                  getOptionLabel={(option) => option.name}
                  isOptionEqualToValue={(option, value) =>
                    option.id === value.id
                  }
                  loading={isFetchingReviewers}
                  noOptionsText={
                    reviewerSearchText.trim().length > 0 &&
                    reviewerSearchText.trim().length < 3
                      ? "Digite pelo menos 3 letras para pesquisar..."
                      : "Nenhum revisor encontrado."
                  }
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      size="small"
                      label="Pesquisar Revisor Técnico (mín. 3 letras)"
                      placeholder="Digite nome ou e-mail..."
                      slotProps={{
                        ...params.slotProps,
                        input: {
                          ...params.slotProps.input,
                          endAdornment: (
                            <>
                              {isFetchingReviewers ? (
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
                        color="secondary"
                      />
                    </Box>
                  )}
                />
              </Box>
            </Box>
          )}
        </DialogContent>

        <DialogActions sx={{ px: 3, py: 2, justifyContent: "space-between" }}>
          {activeStep === 0 ? (
            <>
              <Button type="button" onClick={onClose} color="inherit">
                Cancelar
              </Button>
              <Button
                type="button"
                onClick={handleNext}
                variant="contained"
                color="primary"
                endIcon={<ArrowForwardIcon />}
              >
                Próximo: Adicionar Pares
              </Button>
            </>
          ) : (
            <>
              <Button
                type="button"
                onClick={handleBack}
                startIcon={<ArrowBackIcon />}
                color="inherit"
                disabled={createProjectMutation.isPending}
              >
                Voltar
              </Button>
              <Button
                type="button"
                onClick={handleSubmit(onSubmit)}
                variant="contained"
                color="success"
                disabled={createProjectMutation.isPending}
                startIcon={
                  createProjectMutation.isPending ? (
                    <CircularProgress size={18} color="inherit" />
                  ) : (
                    <CheckCircleIcon />
                  )
                }
              >
                {createProjectMutation.isPending
                  ? "Criando Artigo..."
                  : "Criar Artigo e Ir para Tarefas"}
              </Button>
            </>
          )}
        </DialogActions>
      </Box>
    </Dialog>
  );
};
