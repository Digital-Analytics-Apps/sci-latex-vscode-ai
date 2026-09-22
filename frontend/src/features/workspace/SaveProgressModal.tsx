import SaveIcon from "@mui/icons-material/Save";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Paper,
  TextField,
  Typography,
} from "@mui/material";
import { useState } from "react";
import { useDispatch } from "react-redux";
import { ActiveTaskCard } from "../../components/common/ActiveTaskCard";
import {
  useSaveProgressMutation,
  useTaskDiffSummary,
} from "../../hooks/useProjectQueries";
import { showNotification } from "../../store/slices/notificationSlice";

interface SaveProgressModalProps {
  open: boolean;
  onClose: () => void;
  projectId: string;
  activeTask?: { id: string; title: string; branchName?: string };
}

const SaveProgressModalContent = ({
  open,
  onClose,
  projectId,
  activeTask,
}: SaveProgressModalProps) => {
  const dispatch = useDispatch();
  const saveProgressMutation = useSaveProgressMutation(projectId);
  const { data: diffSummary, isLoading: isLoadingDiff } = useTaskDiffSummary(
    projectId,
    activeTask?.id,
    open,
  );

  const [description, setDescription] = useState<string>("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalDescription = description.trim();

    try {
      await saveProgressMutation.mutateAsync({
        taskId: activeTask?.id || "default-task",
        commitMessage: finalDescription,
      });

      dispatch(
        showNotification({
          message:
            "Progresso salvo com sucesso! Rascunho e histórico atualizados.",
          severity: "success",
        }),
      );
      onClose();
    } catch (err: any) {
      const serverMsg = err.response?.data?.message || err.message;
      dispatch(
        showNotification({
          message: serverMsg || "Erro ao salvar progresso do artigo.",
          severity: "error",
        }),
      );
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "section":
        return "📄";
      case "bibliography":
        return "📚";
      case "figure":
        return "🖼️";
      default:
        return "📁";
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontWeight: 700, pb: 1 }}>
        Salvar Progresso no Rascunho
      </DialogTitle>

      <form onSubmit={handleSubmit}>
        <DialogContent
          dividers
          sx={{ display: "flex", flexDirection: "column", gap: 2 }}
        >
          <ActiveTaskCard
            title={activeTask?.title || "Tarefa Atual do Artigo"}
          />

          {/* Cabeçalho Temporal: Desde o último salvamento */}
          {diffSummary?.lastSavedAt && (
            <Typography variant="caption" color="text.secondary">
              ⏱️ Desde o último salvamento:{" "}
              <strong>
                {new Date(diffSummary.lastSavedAt).toLocaleString("pt-BR")}
              </strong>{" "}
              {diffSummary.lastSavedAuthor
                ? `por ${diffSummary.lastSavedAuthor}`
                : ""}
            </Typography>
          )}

          {/* Resumo Acadêmico de Alterações */}
          <Box>
            <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
              O que mudou desde o último salvamento?
            </Typography>

            {isLoadingDiff ? (
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 1.5,
                  py: 2,
                  px: 1,
                }}
              >
                <CircularProgress size={20} />
                <Typography variant="body2" color="text.secondary">
                  Analisando alterações no rascunho...
                </Typography>
              </Box>
            ) : diffSummary?.files && diffSummary.files.length > 0 ? (
              <Paper
                variant="outlined"
                sx={{
                  p: 1.5,
                  bgcolor: "background.default",
                  display: "flex",
                  flexDirection: "column",
                  gap: 1.2,
                }}
              >
                {diffSummary.files.map((file: any) => (
                  <Box
                    key={file.path}
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}
                  >
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <Typography variant="body2">
                        {getCategoryIcon(file.category)}
                      </Typography>
                      <Box>
                        <Typography
                          variant="body2"
                          sx={{ fontWeight: 600, fontSize: "0.875rem" }}
                        >
                          {file.label}
                        </Typography>
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          sx={{ fontFamily: "monospace" }}
                        >
                          {file.path}
                        </Typography>
                      </Box>
                    </Box>

                    <Box
                      sx={{ display: "flex", alignItems: "center", gap: 0.8 }}
                    >
                      {file.additions > 0 && (
                        <Chip
                          label={`+${file.additions}`}
                          size="small"
                          color="success"
                          variant="outlined"
                          sx={{ height: 20, fontSize: "0.75rem" }}
                        />
                      )}
                      {file.deletions > 0 && (
                        <Chip
                          label={`-${file.deletions}`}
                          size="small"
                          color="error"
                          variant="outlined"
                          sx={{ height: 20, fontSize: "0.75rem" }}
                        />
                      )}
                      {file.status === "added" && (
                        <Chip
                          label="Novo"
                          size="small"
                          color="primary"
                          sx={{ height: 20, fontSize: "0.75rem" }}
                        />
                      )}
                    </Box>
                  </Box>
                ))}
              </Paper>
            ) : (
              <Paper
                variant="outlined"
                sx={{ p: 1.5, bgcolor: "background.default" }}
              >
                <Typography variant="body2" color="text.secondary">
                  Nenhuma alteração detectada desde o último salvamento.
                </Typography>
              </Paper>
            )}
          </Box>

          {/* Aviso Factual de Alterações em Outros Arquivos */}
          {diffSummary?.hasChangesInOtherFiles && (
            <Alert
              severity="warning"
              icon={<WarningAmberIcon fontSize="small" />}
              sx={{ py: 0.5, px: 1.5, fontSize: "0.85rem" }}
            >
              <strong>Aviso de contexto:</strong> Também foram detectadas
              alterações em outros arquivos do projeto. Elas serão salvas no seu
              rascunho normalmente.
            </Alert>
          )}

          <Divider />

          {/* Descrição Opcional do Progresso */}
          <Box>
            <Typography variant="subtitle2" sx={{ mb: 0.5, fontWeight: 600 }}>
              Descrição desta atualização (opcional)
            </Typography>
            <TextField
              fullWidth
              multiline
              rows={2.5}
              placeholder={
                diffSummary?.generatedProgressDescription ||
                "Descreva brevemente o que foi alterado nesta versão..."
              }
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              helperText="Caso deixe em branco, a descrição sugerida acima será gravada automaticamente."
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
            disabled={saveProgressMutation.isPending}
            startIcon={
              saveProgressMutation.isPending ? (
                <CircularProgress size={16} color="inherit" />
              ) : (
                <SaveIcon />
              )
            }
          >
            Salvar Progresso
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export const SaveProgressModal = (props: SaveProgressModalProps) => {
  if (!props.open) return null;
  return (
    <SaveProgressModalContent
      key={props.activeTask?.id || "save-progress-modal"}
      {...props}
    />
  );
};
