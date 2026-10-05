import AddTaskIcon from "@mui/icons-material/AddTask";
import CommentIcon from "@mui/icons-material/Comment";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Avatar,
  Box,
  Button,
  Chip,
  Divider,
  Paper,
  Stack,
  Tooltip,
  Typography,
} from "@mui/material";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import type { ProjectStage } from "../../../services/projectsService";
import { projectsService } from "../../../services/projectsService";
import { colors } from "../../../theme/tokens";
import { formatDate } from "../../../utils/dateUtils";

export interface ReviewCommentItem {
  id: string;
  filePath?: string;
  prTitle?: string;
  taskTitle?: string;
  lineNumber?: number | null;
  lineNumer?: number | null;
  comment: string;
  authorName?: string;
  userName?: string;
  createdAt: string;
  reviewRoundNumber?: number;
}

export interface ReviewFeedbackPanelProps {
  projectId?: string;
  stages?: ProjectStage[];
  comments?: ReviewCommentItem[];
  onOpenCreateCorrectionTask: (initialTitle: string, stageId?: string) => void;
}

export const ReviewFeedbackPanel = ({
  projectId,
  stages: propStages,
  comments: propComments,
  onOpenCreateCorrectionTask,
}: ReviewFeedbackPanelProps) => {
  const { data: fetchedComments } = useQuery({
    queryKey: ["review-comments-by-stage", projectId],
    queryFn: async () => {
      if (!projectId) return [];
      const res = await projectsService.getReviewCommentsByStage?.(projectId);
      return res || [];
    },
    enabled: Boolean(projectId),
  });

  // Agrupa os comentários por Etapa de forma defensiva
  const commentsByStage = useMemo(() => {
    // Caso 1: Backend retornou comentários já agrupados por etapa
    if (
      fetchedComments &&
      Array.isArray(fetchedComments) &&
      fetchedComments.length > 0
    ) {
      return fetchedComments.map((item: any, idx: number) => ({
        stage: {
          id: item.stageId || `stage-${idx}`,
          title: item.stageTitle || `Etapa ${idx + 1}`,
          order: idx + 1,
        },
        comments: (item.comments || []).map((c: any) => ({
          ...c,
          filePath: c.filePath || c.prTitle || c.taskTitle || "Seção do Artigo",
          authorName: c.userName || c.authorName || "Revisor Técnico",
          lineNumber: c.lineNumber ?? c.lineNumer ?? null,
        })),
      }));
    }

    // Caso 2: Utilizando props de stages e comments
    const stagesList = propStages || [];
    const commentsList = propComments || [];

    return stagesList.map((stage) => {
      const stageSlug = (stage.title || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .trim();

      const matchedComments = commentsList.filter((c) => {
        const fileLower = (
          c.filePath ||
          c.prTitle ||
          c.taskTitle ||
          c.comment ||
          ""
        ).toLowerCase();

        if (
          stageSlug.includes("introducao") ||
          stageSlug.includes("planejamento")
        ) {
          return fileLower.includes("intro") || fileLower.includes("01");
        }
        if (
          stageSlug.includes("desenvolvimento") ||
          stageSlug.includes("experimento")
        ) {
          return (
            fileLower.includes("method") ||
            fileLower.includes("exp") ||
            fileLower.includes("02")
          );
        }
        if (stageSlug.includes("rascunho") || stageSlug.includes("escrita")) {
          return fileLower.includes("draft") || fileLower.includes("03");
        }
        return true;
      });

      return {
        stage,
        comments: matchedComments,
      };
    });
  }, [fetchedComments, propStages, propComments]);

  const totalComments = commentsByStage.reduce(
    (acc, curr) => acc + (curr.comments?.length || 0),
    0,
  );

  if (totalComments === 0) {
    return (
      <Paper
        variant="outlined"
        sx={{
          p: 3,
          textAlign: "center",
          bgcolor: "background.paper",
          borderRadius: 2,
        }}
      >
        <Typography variant="body2" color="text.secondary">
          Nenhum apontamento pendente de revisão encontrado para este artigo.
        </Typography>
      </Paper>
    );
  }

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5, mb: 3 }}>
      <Paper
        variant="outlined"
        sx={{
          p: 2,
          bgcolor: "rgba(239, 68, 68, 0.05)",
          borderColor: "error.main",
          borderRadius: 2,
        }}
      >
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <CommentIcon color="error" />
            <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
              Apontamentos do Revisor — Correções Solicitadas
            </Typography>
            <Chip
              label={`${totalComments} comentários`}
              size="small"
              color="error"
              sx={{ fontWeight: 700 }}
            />
          </Box>
          <Typography variant="caption" color="text.secondary">
            Clique no botão lateral ao lado de cada comentário para gerar a
            sub-tarefa na etapa correspondente.
          </Typography>
        </Box>
      </Paper>

      {commentsByStage.map(({ stage, comments: stageComments }) => {
        if (!stageComments || stageComments.length === 0) return null;

        return (
          <Accordion
            key={stage.id}
            defaultExpanded
            sx={{
              border: "1px solid",
              borderColor: "divider",
              borderRadius: "8px !important",
              overflow: "hidden",
              "&:before": { display: "none" },
            }}
          >
            <AccordionSummary
              expandIcon={<ExpandMoreIcon />}
              sx={{ bgcolor: "action.hover", px: 2, py: 0.5 }}
            >
              <Box
                sx={{
                  display: "flex",
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 1.5,
                }}
              >
                <Chip
                  label={`Etapa ${stage.order || 1}`}
                  size="small"
                  color="primary"
                  variant="outlined"
                  sx={{ fontWeight: 700 }}
                />
                <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                  {stage.title}
                </Typography>
                <Chip
                  label={`${stageComments.length} apontamentos`}
                  size="small"
                  sx={{
                    bgcolor: "rgba(239, 68, 68, 0.12)",
                    color: colors.rose[600],
                    fontWeight: 700,
                    fontSize: "0.7rem",
                  }}
                />
              </Box>
            </AccordionSummary>

            <AccordionDetails sx={{ p: 2 }}>
              <Stack spacing={1.5}>
                {stageComments.map((c: ReviewCommentItem, idx: number) => {
                  const author =
                    c.userName || c.authorName || "Revisor Técnico";
                  const labelPath =
                    c.filePath || c.prTitle || c.taskTitle || "Seção do Artigo";
                  const line = c.lineNumber ?? c.lineNumer ?? null;

                  return (
                    <Paper
                      key={c.id || idx}
                      variant="outlined"
                      sx={{
                        p: 1.5,
                        borderColor: "divider",
                        bgcolor: "background.paper",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        gap: 2,
                      }}
                    >
                      <Box sx={{ flex: 1 }}>
                        <Box
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            gap: 1,
                            mb: 0.5,
                          }}
                        >
                          <Avatar
                            sx={{
                              width: 22,
                              height: 22,
                              fontSize: "0.75rem",
                              bgcolor: colors.purple[600],
                            }}
                          >
                            {author.charAt(0).toUpperCase()}
                          </Avatar>
                          <Typography
                            variant="caption"
                            sx={{ fontWeight: 700, color: "text.primary" }}
                          >
                            {author}
                          </Typography>
                          <Chip
                            label={labelPath}
                            size="small"
                            variant="outlined"
                            sx={{
                              height: 18,
                              fontSize: "0.65rem",
                              fontFamily: "monospace",
                            }}
                          />
                          {line !== null && line !== undefined && (
                            <Chip
                              label={`Linha ${line}`}
                              size="small"
                              sx={{
                                height: 18,
                                fontSize: "0.65rem",
                                bgcolor: "action.hover",
                              }}
                            />
                          )}
                          <Typography
                            variant="caption"
                            color="text.secondary"
                            sx={{ ml: "auto" }}
                          >
                            {formatDate(c.createdAt)}
                          </Typography>
                        </Box>
                        <Typography
                          variant="body2"
                          sx={{ color: "text.primary", pl: 3.5 }}
                        >
                          {c.comment}
                        </Typography>
                      </Box>

                      <Divider orientation="vertical" flexItem />

                      <Tooltip title="Criar sub-tarefa de correção na fila desta etapa">
                        <Button
                          variant="contained"
                          color="error"
                          size="small"
                          startIcon={<AddTaskIcon fontSize="small" />}
                          onClick={() =>
                            onOpenCreateCorrectionTask(
                              `[Correção R${c.reviewRoundNumber || 1}] ${(
                                c.comment || ""
                              ).slice(0, 45)}...`,
                              stage.id,
                            )
                          }
                          sx={{
                            whiteSpace: "nowrap",
                            fontWeight: 700,
                            fontSize: "0.75rem",
                            px: 1.5,
                            height: 32,
                          }}
                        >
                          ➕ Criar Sub-tarefa
                        </Button>
                      </Tooltip>
                    </Paper>
                  );
                })}
              </Stack>
            </AccordionDetails>
          </Accordion>
        );
      })}
    </Box>
  );
};
