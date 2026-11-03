import React, { useState } from 'react';
import {
  Box,
  Button,
  Chip,
  Dialog,
  DialogContent,
  Paper,
  Typography,
} from '@mui/material';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import LightbulbOutlinedIcon from '@mui/icons-material/LightbulbOutlined';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import {
  ChatContainer,
  ChatMessageList,
  ChatInputBar,
} from '../../../components/chat';
import {
  useAiChatStream,
  InterruptActionResolver,
  type ArticleProposalData,
} from '../../ai-chat';
import { useCreateProjectMutation } from '../../../hooks/useProjectQueries';
import { useTemplatesQuery } from '../../../hooks/useTemplateQueries';
import { showNotification } from '../../../store/slices/notificationSlice';
import type { RootState } from '../../../store';

interface CreateArticleAiModalProps {
  open: boolean;
  onClose: () => void;
  onArticleCreated?: (articleId: string) => void;
}

const QUICK_SUGGESTIONS = [
  'Detecção de anomalias em séries temporais para redes sociais',
  'Algoritmos de consenso bizantino em sistemas distribuídos',
  'Modelos de linguagem para geração e verificação de código',
  'Segurança e privacidade em aprendizado federado',
];

export const CreateArticleAiModal: React.FC<CreateArticleAiModalProps> = ({
  open,
  onClose,
  onArticleCreated,
}) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const currentUser = useSelector((state: RootState) => state.auth.user);
  const createProjectMutation = useCreateProjectMutation();
  const { data: templates = [] } = useTemplatesQuery();

  const [conversationId, setConversationId] = useState<string>(() => crypto.randomUUID());

  const {
    messages,
    streamingContent,
    currentAgent,
    statusMessage,
    isStreaming,
    activeInterrupt,
    sendMessage,
    submitDecision,
    abortStream,
    resetChat,
  } = useAiChatStream({
    conversationId,
  });

  // Reseta para uma sessão limpa toda vez que o modal é aberto ou fechado
  React.useEffect(() => {
    if (open) {
      setConversationId(crypto.randomUUID());
    } else {
      resetChat();
    }
  }, [open, resetChat]);

  const handleClose = () => {
    resetChat();
    onClose();
  };

  const handleApproveAndCreateProject = async (proposal: ArticleProposalData) => {
    if (!currentUser) {
      dispatch(
        showNotification({
          message: 'Você precisa estar autenticado para criar um artigo.',
          severity: 'error',
        })
      );
      return;
    }

    const rawTpl = (proposal.template_id || '').toLowerCase().trim();
    const resolvedTemplate =
      templates.find(
        (t) =>
          t.id.toLowerCase() === rawTpl ||
          (t.targetConference && t.targetConference.toLowerCase() === rawTpl) ||
          t.name.toLowerCase().includes(rawTpl) ||
          (t.targetConference && rawTpl.includes(t.targetConference.toLowerCase()))
      ) || templates[0];

    const targetTemplateId = resolvedTemplate?.id || 'tpl-system-sbc';

    const now = new Date();
    const stagesPayload = proposal.stages.map((stg) => ({
      title: stg.title,
      description: stg.description,
      plannedCompletionDate: new Date(now.getTime() + stg.cumulative_day * 86400000)
        .toISOString()
        .split('T')[0],
    }));

    try {
      const res = await createProjectMutation.mutateAsync({
        name: proposal.title,
        description: proposal.abstract,
        targetConference: proposal.conference || 'Conferência Científica',
        submissionDeadline:
          proposal.submission_deadline && proposal.submission_deadline.includes('-')
            ? proposal.submission_deadline
            : new Date(now.getTime() + 70 * 86400000).toISOString().split('T')[0],
        templateId: targetTemplateId,
        coordinatorId: proposal.coordinator_id || undefined,
        managerId: proposal.manager_id || undefined,
        reviewerId: proposal.reviewer_id || undefined,
        stages: stagesPayload,
      });

      const projectId = res?.project?.id || res?.id;

      dispatch(
        showNotification({
          message: `Artigo científico "${proposal.title}" criado com sucesso! Associe seu orientador e coautores nas Configurações do Projeto a qualquer momento.`,
          severity: 'success',
        })
      );

      onClose();

      if (onArticleCreated && projectId) {
        onArticleCreated(projectId);
      } else if (projectId) {
        navigate(`/articles/${projectId}`);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Falha ao criar o projeto';
      dispatch(
        showNotification({
          message: `Erro ao criar o artigo: ${msg}`,
          severity: 'error',
        })
      );
    }
  };

  const emptyState = (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        my: 'auto',
        py: 4,
        px: 2,
        textAlign: 'center',
      }}
    >
      <Paper
        elevation={0}
        sx={{
          width: 56,
          height: 56,
          borderRadius: '50%',
          bgcolor: 'primary.light',
          color: 'primary.main',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          mb: 2,
        }}
      >
        <AutoAwesomeIcon sx={{ fontSize: 32 }} />
      </Paper>

      <Typography variant="h6" gutterBottom sx={{ fontWeight: 700 }}>
        Belisa — Assistente Inteligente
      </Typography>

      <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 520, mb: 3 }}>
        Olá! Sou a <strong>Belisa</strong>, sua assistente inteligente do SCIA. Me conte sobre a sua ideia de pesquisa
        ou o tema que você deseja investigar, e vou te ajudar a delimitar o problema, buscar os artigos mais relevantes no{' '}
        <strong>arXiv</strong> e estruturar o seu projeto com o template oficial.
      </Typography>

      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, mb: 1.5 }}>
        OU SELECIONE UMA SUGESTÃO INICIAL:
      </Typography>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 1, maxWidth: 640 }}>
        {QUICK_SUGGESTIONS.map((sug, idx) => (
          <Chip
            key={idx}
            icon={<LightbulbOutlinedIcon sx={{ fontSize: 16 }} />}
            label={sug}
            onClick={() => sendMessage(sug)}
            variant="outlined"
            clickable
            sx={{
              py: 2,
              px: 1,
              borderRadius: 3,
              fontSize: '0.825rem',
              '&:hover': {
                bgcolor: 'action.hover',
                borderColor: 'primary.main',
              },
            }}
          />
        ))}
      </Box>
    </Box>
  );

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="md"
      fullWidth
      slotProps={{
        paper: {
          sx: {
            height: '85vh',
            maxHeight: 850,
            borderRadius: 3,
            overflow: 'hidden',
          },
        },
      }}
    >
      <DialogContent sx={{ p: 0, height: '100%', overflow: 'hidden' }}>
        <ChatContainer
          variant="modal"
          title="Belisa — Assistente Inteligente"
          subtitle="Ideação, busca no arXiv e planejamento do cronograma"
          onClose={handleClose}
          headerActions={
            <Button
              size="small"
              color="inherit"
              onClick={() => setConversationId(crypto.randomUUID())}
              sx={{ textTransform: 'none', fontSize: '0.75rem' }}
            >
              Nova Sessão
            </Button>
          }
          inputBar={
            <ChatInputBar
              onSendMessage={sendMessage}
              onAbortStream={abortStream}
              isStreaming={isStreaming}
              disabled={Boolean(activeInterrupt)}
              placeholder="Digite sua resposta ou instrução para os especialistas..."
            />
          }
        >
          <ChatMessageList
            messages={messages}
            streamingContent={streamingContent}
            currentAgent={currentAgent}
            isStreaming={isStreaming}
            statusMessage={statusMessage}
            emptyState={emptyState}
            renderMessageExtra={(msg) => {
              if (!msg.interrupt) return null;
              return (
                <InterruptActionResolver
                  interrupt={msg.interrupt}
                  onSubmitDecision={(decision) => {
                    if (
                      msg.interrupt?.name === 'approve_article_proposal' &&
                      decision.type === 'approve' &&
                      decision.proposal
                    ) {
                      handleApproveAndCreateProject(decision.proposal as ArticleProposalData);
                    } else {
                      submitDecision(decision);
                    }
                  }}
                  disabled={isStreaming}
                />
              );
            }}
          />
        </ChatContainer>
      </DialogContent>
    </Dialog>
  );
};
