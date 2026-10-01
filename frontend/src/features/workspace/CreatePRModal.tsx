import { zodResolver } from "@hookform/resolvers/zod";
import SendIcon from "@mui/icons-material/Send";
import { Box, TextField, Typography } from "@mui/material";
import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { useDispatch } from "react-redux";
import { ActiveTaskCard } from "../../components/common/ActiveTaskCard";
import { StandardModal } from "../../components/common/StandardModal";
import {
  type ReviewType,
  ReviewTypeSelector,
} from "../../components/common/ReviewTypeSelector";
import {
  ReviewerSelector,
  type UserOption,
} from "../../components/common/ReviewerSelector";
import { useCreatePRMutation } from "../../hooks/useProjectQueries";
import { type CreatePRFormData, createPRSchema } from "../../schemas/pr.schema";
import { showNotification } from "../../store/slices/notificationSlice";

const DEFAULT_PR_TEMPLATE = `## 📝 Resumo das Alterações
- Edição e refinamento da seção TeX nesta tarefa.

## 🎯 Seções Acadêmicas Impactadas
- [x] Seção Ativa da Tarefa
- [ ] Referências Bibliográficas

## 🔍 Checklist de Qualidade TeX
- [x] Documento compila sem erros no TeX Live
- [x] Formatação LaTeX validada

## 💬 Observações para o Revisor
`;

interface CreatePRModalProps {
  open: boolean;
  onClose: () => void;
  projectId: string;
  activeTask?: { id: string; title: string; branchName?: string };
  allMembers?: UserOption[];
  coAuthors?: UserOption[];
  reviewers?: UserOption[];
}

export const CreatePRModal = ({
  open,
  onClose,
  projectId,
  activeTask,
  allMembers = [],
  coAuthors = [],
  reviewers = [],
}: CreatePRModalProps) => {
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
      description: DEFAULT_PR_TEMPLATE,
      taskId: activeTask?.id || "",
      reviewerId: "",
      reviewerIds: [],
      reviewType: "TECHNICAL_REVIEW",
    },
  });

  // eslint-disable-next-line react-hooks/incompatible-library
  const reviewType = (watch("reviewType") as ReviewType) || "TECHNICAL_REVIEW";

  // Revisor oficial único para revisão técnica
  const officialReviewer = useMemo<UserOption>(() => {
    return (
      reviewers[0] ||
      allMembers[0] || {
        id: "default-reviewer",
        name: "Revisor Oficial do Projeto",
      }
    );
  }, [reviewers, allMembers]);

  // Co-autores disponíveis para revisão entre pares (fallback para allMembers se necessário)
  const peerOptions = useMemo<UserOption[]>(() => {
    return coAuthors.length > 0 ? coAuthors : allMembers;
  }, [coAuthors, allMembers]);

  // Estado local para o Autocomplete de múltiplos co-autores
  const [selectedPeers, setSelectedPeers] = useState<UserOption[]>([]);

  useEffect(() => {
    if (open) {
      const initialTaskId = activeTask?.id || "";
      const initialTitle = activeTask ? `Revisão: ${activeTask.title}` : "";

      setValue("taskId", initialTaskId);
      setValue("title", initialTitle);
      setValue("description", DEFAULT_PR_TEMPLATE);

      if (reviewType === "TECHNICAL_REVIEW") {
        setValue("reviewerId", officialReviewer.id);
        setValue("reviewerIds", [officialReviewer.id]);
      } else {
        // Na revisão entre pares, pré-seleciona TODOS os co-autores por padrão
        setSelectedPeers(peerOptions);
        setValue(
          "reviewerIds",
          peerOptions.map((p) => p.id),
        );
        setValue("reviewerId", peerOptions[0]?.id || "");
      }
    }
  }, [
    open,
    activeTask,
    reviewType,
    officialReviewer.id,
    peerOptions,
    setValue,
  ]);

  const handleReviewTypeChange = (val: ReviewType) => {
    setValue("reviewType", val);
    if (val === "TECHNICAL_REVIEW") {
      setValue("reviewerId", officialReviewer.id);
      setValue("reviewerIds", [officialReviewer.id]);
    } else {
      setSelectedPeers(peerOptions);
      setValue(
        "reviewerIds",
        peerOptions.map((p) => p.id),
      );
      setValue("reviewerId", peerOptions[0]?.id || "");
    }
  };

  const handlePeersChange = (newPeers: UserOption[]) => {
    setSelectedPeers(newPeers);
    setValue(
      "reviewerIds",
      newPeers.map((p) => p.id),
    );
    setValue("reviewerId", newPeers[0]?.id || "");
  };

  const onSubmit = async (data: CreatePRFormData) => {
    try {
      await createPRMutation.mutateAsync({
        ...data,
        taskId: activeTask?.id || data.taskId,
      });
      dispatch(
        showNotification({
          message:
            "Pull Request aberto com sucesso! Notificação enviada para revisão.",
          severity: "success",
        }),
      );
      reset();
      onClose();
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message;
      const userMessage =
        msg === "UNCOMMITTED_CHANGES_BEFORE_REVIEW"
          ? "Você possui alterações não salvas! Clique em 'Salvar Progresso' antes de enviar para revisão."
          : msg || "Erro ao abrir Pull Request. Tente novamente.";
      dispatch(
        showNotification({
          message: userMessage,
          severity: "error",
        }),
      );
    }
  };

  return (
    <StandardModal
      open={open}
      onClose={onClose}
      size="md"
      icon={<SendIcon color="primary" />}
      title="Enviar para Revisão Acadêmica"
      onSubmit={handleSubmit(onSubmit)}
      confirmText="Enviar p/ Revisão"
      confirmColor="primary"
      isSubmitting={createPRMutation.isPending}
    >
      <Box sx={{ display: "flex", flexDirection: "column", gap: 2.5 }}>
        {/* Card Fixo de Tarefa Vinculada à Workspace (Componente Reutilizável) */}
        <ActiveTaskCard title={activeTask?.title || "Tarefa Atual do Artigo"} />

        {/* Seleção de Nível/Tipo de Revisão (Componente Reutilizável) */}
        <ReviewTypeSelector
          value={reviewType}
          onChange={handleReviewTypeChange}
        />

        {/* Título do PR */}
        <Box>
          <Typography variant="subtitle2" sx={{ mb: 0.5, fontWeight: 600 }}>
            Título do Pull Request *
          </Typography>
          <TextField
            fullWidth
            size="small"
            placeholder="ex: Revisão da Tarefa - Introdução e Referências"
            {...register("title")}
            error={Boolean(errors.title)}
            helperText={errors.title?.message}
          />
        </Box>

        {/* Seletor Dinâmico do Revisor/Pares (Componente Reutilizável) */}
        <ReviewerSelector
          reviewType={reviewType}
          officialReviewer={officialReviewer}
          peerOptions={peerOptions}
          selectedPeers={selectedPeers}
          onPeersChange={handlePeersChange}
        />

        {/* Descrição com Template de PR */}
        <Box>
          <Typography variant="subtitle2" sx={{ mb: 0.5, fontWeight: 600 }}>
            Descrição e Checklist do PR (Template TeX)
          </Typography>
          <TextField
            fullWidth
            multiline
            rows={6}
            placeholder="Preencha o template do Pull Request..."
            {...register("description")}
            sx={{ fontFamily: "monospace", fontSize: "0.85rem" }}
          />
        </Box>
      </Box>
    </StandardModal>
  );
};
