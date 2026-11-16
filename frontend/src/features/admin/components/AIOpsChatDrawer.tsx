import {
  Box,
  Button,
  Chip,
  CircularProgress,
  Drawer,
  IconButton,
  Paper,
  Skeleton,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import { Bot, PlusCircle, RefreshCw, Send, X } from 'lucide-react';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ChatMarkdownRenderer } from '../../../components/chat/ChatMarkdownRenderer';
import {
  useAiopsChatHistory,
  useAiopsChatMutation,
  useAiopsDiagnosisMutation,
  useAiopsIncidentDetails,
} from '../hooks/useAIOps';
import { AiopsRcaSuggestedAction, RcaClassification } from '../types/aiops.types';
import { AIOpsActionCard } from './AIOpsActionCard';

export interface AIOpsChatDrawerProps {
  open: boolean;
  onClose: () => void;
  targetIncidentId?: string | null;
  targetServiceContext?: string | null;
}

interface ChatMessageItem {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  suggestedActions?: AiopsRcaSuggestedAction[];
}

interface ChatInputBarProps {
  onSendMessage: (text: string) => void;
  disabled?: boolean;
}

const ChatInputBar = React.memo(({ onSendMessage, disabled }: ChatInputBarProps) => {
  const [inputText, setInputText] = useState('');

  const handleSend = () => {
    const trimmed = inputText.trim();
    if (!trimmed || disabled) return;
    setInputText('');
    onSendMessage(trimmed);
  };

  const handleQuickAction = (text: string) => {
    if (disabled) return;
    onSendMessage(text);
  };

  return (
    <Box
      sx={{
        p: 2,
        borderTop: 1,
        borderColor: 'divider',
        bgcolor: 'background.paper',
      }}
    >
      {/* Chips de Ação Rápida (Especialistas & Ferramentas) */}
      <Box sx={{ mb: 1.5, display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
        <Chip
          size="small"
          label="☸️ Nós & Pods"
          onClick={() => handleQuickAction('Quantos nós e pods temos ativos hoje?')}
          variant="outlined"
          clickable
          disabled={disabled}
          sx={{ fontWeight: 500 }}
        />
        <Chip
          size="small"
          label="📜 Erros no Loki"
          onClick={() =>
            handleQuickAction('Quais são os erros mais frequentes registrados nos logs?')
          }
          variant="outlined"
          clickable
          disabled={disabled}
          sx={{ fontWeight: 500 }}
        />
        <Chip
          size="small"
          label="📈 Pool Postgres"
          onClick={() =>
            handleQuickAction('Como está o pool de conexões do postgres e uso de memória?')
          }
          variant="outlined"
          clickable
          disabled={disabled}
          sx={{ fontWeight: 500 }}
        />
        <Chip
          size="small"
          label="🐛 Exceções GlitchTip"
          onClick={() => handleQuickAction('Mostre as exceções recentes capturadas no GlitchTip')}
          variant="outlined"
          clickable
          disabled={disabled}
          sx={{ fontWeight: 500 }}
        />
        <Chip
          size="small"
          label="🧠 Traces do Opik"
          onClick={() => handleQuickAction('Como estão os traces de LLMOps e execuções no Opik?')}
          variant="outlined"
          clickable
          disabled={disabled}
          sx={{ fontWeight: 500 }}
        />
        <Chip
          size="small"
          label="🌐 Panorama Geral"
          onClick={() => handleQuickAction('Como está a saúde geral de todo o sistema?')}
          variant="outlined"
          clickable
          disabled={disabled}
          sx={{ fontWeight: 500 }}
        />
      </Box>

      <Stack direction="row" spacing={1}>
        <TextField
          fullWidth
          size="small"
          placeholder="Pergunte ao AIOps (ex: 'Verifique se há OOMKilled no cluster')..."
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
          disabled={disabled}
        />
        <Button
          variant="contained"
          color="primary"
          onClick={handleSend}
          disabled={!inputText.trim() || disabled}
          sx={{ minWidth: 48, px: 2 }}
        >
          <Send size={18} />
        </Button>
      </Stack>
    </Box>
  );
});

export const AIOpsChatDrawer = ({
  open,
  onClose,
  targetIncidentId,
  targetServiceContext,
}: AIOpsChatDrawerProps) => {
  const [messages, setMessages] = useState<ChatMessageItem[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { data: incidentDetail, isLoading: isLoadingIncident } = useAiopsIncidentDetails(
    targetIncidentId ?? undefined
  );

  const { data: chatHistory, isLoading: isLoadingHistory } = useAiopsChatHistory(
    { incidentId: targetIncidentId ?? undefined },
    open
  );

  const diagnosisMutation = useAiopsDiagnosisMutation();
  const chatMutation = useAiopsChatMutation();

  const handleNewConversation = useCallback(() => {
    setMessages([
      {
        id: `welcome-${Date.now()}`,
        role: 'assistant',
        content:
          'Olá! Sou o **AIOps Copilot**. Iniciei uma nova sessão limpa de atendimento.\n\nSelecione um dos **atalhos rápidos abaixo** ou pergunte diretamente sobre a infraestrutura e aplicações:',
      },
    ]);
  }, []);

  useEffect(() => {
    if (open) {
      if (chatHistory && chatHistory.length > 0) {
        setMessages(
          chatHistory.map((m) => ({
            id: m.id,
            role: m.role,
            content: m.content,
            suggestedActions: (m.toolCalls as { actions?: AiopsRcaSuggestedAction[] } | null)
              ?.actions,
          }))
        );
      } else if (incidentDetail?.rcaReports?.[0]) {
        const latestRca = incidentDetail.rcaReports[0];
        setMessages([
          {
            id: 'init-rca',
            role: 'assistant',
            content: latestRca.fullMarkdownReport,
            suggestedActions: latestRca.suggestedActions,
          },
        ]);
      } else if (targetServiceContext) {
        setMessages([
          {
            id: 'init-context',
            role: 'assistant',
            content: `Olá! Estou monitorando o componente **\`${targetServiceContext}\`**. Posso consultar métricas no Prometheus, logs de erro no Loki, pods no Kubernetes e traces no Opik. O que deseja investigar?`,
          },
        ]);
      } else {
        setMessages([
          {
            id: 'init-general',
            role: 'assistant',
            content:
              'Olá! Sou o **AIOps Copilot**. Estou conectado aos servidores MCP do cluster (Kubernetes, Prometheus, Loki, GlitchTip e Opik).\n\nSelecione um dos **atalhos rápidos abaixo** ou pergunte diretamente sobre a infraestrutura e aplicações:',
          },
        ]);
      }
    }
  }, [open, chatHistory, incidentDetail, targetServiceContext]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendChatMessage = async (text: string) => {
    if (!text.trim() || chatMutation.isPending) return;

    const userMsg: ChatMessageItem = {
      id: `usr-${Date.now()}`,
      role: 'user',
      content: text,
    };

    setMessages((prev) => [...prev, userMsg]);

    try {
      const response = await chatMutation.mutateAsync({
        incidentId: targetIncidentId ?? undefined,
        serviceContext: targetServiceContext ?? undefined,
        content: text,
      });

      const assistantMsg: ChatMessageItem = {
        id: `asst-${Date.now()}`,
        role: 'assistant',
        content: response.message,
        suggestedActions: response.suggestedActions,
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err: unknown) {
      const errorMsg: ChatMessageItem = {
        id: `err-${Date.now()}`,
        role: 'system',
        content: `❌ Erro ao consultar o AIOps: ${err instanceof Error ? err.message : 'Falha interna'}`,
      };
      setMessages((prev) => [...prev, errorMsg]);
    }
  };

  const handleTriggerDiagnosis = async () => {
    if (!targetIncidentId || diagnosisMutation.isPending) return;

    try {
      const report = await diagnosisMutation.mutateAsync(targetIncidentId);
      setMessages((prev) => [
        ...prev,
        {
          id: `rca-${Date.now()}`,
          role: 'assistant',
          content: report.fullMarkdownReport,
          suggestedActions: report.suggestedActions,
        },
      ]);
    } catch (err: unknown) {
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          role: 'system',
          content: `❌ Erro ao executar diagnóstico: ${err instanceof Error ? err.message : 'Falha de comunicação'}`,
        },
      ]);
    }
  };

  const renderClassificationBadge = (classification: RcaClassification) => {
    switch (classification) {
      case 'INFRASTRUCTURE':
        return <Chip label="🔴 Falha de Infraestrutura" color="error" size="small" />;
      case 'APPLICATION':
        return <Chip label="🔵 Falha de Aplicação" color="primary" size="small" />;
      case 'HYBRID':
        return <Chip label="🟡 Falha Mista (Cascata)" color="warning" size="small" />;
    }
  };

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      slotProps={{
        paper: {
          sx: {
            width: { xs: '100%', sm: 620, md: 700 },
            display: 'flex',
            flexDirection: 'column',
            bgcolor: 'background.default',
          },
        },
      }}
    >
      {/* Header do Drawer */}
      <Box
        sx={{
          p: 2,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: 1,
          borderColor: 'divider',
          bgcolor: 'background.paper',
        }}
      >
        <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
          <Box
            sx={{
              p: 1,
              borderRadius: 1.5,
              bgcolor: 'primary.main',
              color: 'primary.contrastText',
              display: 'flex',
            }}
          >
            <Bot size={20} />
          </Box>
          <Box>
            <Typography variant="subtitle1" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
              AIOps Copilot & RCA
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Conectado a K8s, Prometheus, Loki e Opik via MCP
            </Typography>
          </Box>
        </Stack>

        <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
          <Tooltip title="Iniciar nova conversa">
            <IconButton onClick={handleNewConversation} size="small" aria-label="Nova conversa">
              <PlusCircle size={18} />
            </IconButton>
          </Tooltip>
          <IconButton onClick={onClose} size="small" aria-label="Fechar">
            <X size={20} />
          </IconButton>
        </Stack>
      </Box>

      {/* Barra de Contexto do Incidente */}
      {targetIncidentId && (
        <Box
          sx={{
            px: 2,
            py: 1.5,
            bgcolor: 'action.hover',
            borderBottom: 1,
            borderColor: 'divider',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <Box>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              Incidente: #{targetIncidentId.slice(0, 8)}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Serviço: {incidentDetail?.serviceName ?? 'Buscando...'}
            </Typography>
          </Box>

          <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
            {incidentDetail?.rcaReports?.[0] &&
              renderClassificationBadge(incidentDetail.rcaReports[0].classification)}
            <Button
              size="small"
              variant="outlined"
              onClick={handleTriggerDiagnosis}
              disabled={diagnosisMutation.isPending}
              startIcon={
                diagnosisMutation.isPending ? (
                  <CircularProgress size={14} />
                ) : (
                  <RefreshCw size={14} />
                )
              }
              sx={{ textTransform: 'none', fontSize: '0.75rem' }}
            >
              Reanalisar
            </Button>
          </Stack>
        </Box>
      )}

      {/* Lista de Mensagens */}
      <Box sx={{ flex: 1, overflowY: 'auto', p: 2 }}>
        <Stack spacing={2}>
          {(isLoadingIncident || isLoadingHistory) && (
            <Box sx={{ p: 1 }}>
              <Skeleton variant="text" width="50%" height={24} sx={{ mb: 1 }} />
              <Skeleton variant="rounded" width="90%" height={75} sx={{ mb: 2 }} />
              <Skeleton variant="rounded" width="70%" height={50} sx={{ mb: 2, ml: 'auto' }} />
              <Skeleton variant="rounded" width="85%" height={85} sx={{ mb: 1 }} />
            </Box>
          )}

          {messages.map((msg) => (
            <Box
              key={msg.id}
              sx={{
                alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
                maxWidth: msg.role === 'user' ? '85%' : '98%',
                width: msg.role === 'assistant' ? '100%' : 'auto',
              }}
            >
              <Paper
                elevation={msg.role === 'user' ? 2 : 1}
                sx={{
                  p: 2,
                  borderRadius: 2,
                  bgcolor: msg.role === 'user' ? 'primary.main' : 'background.paper',
                  color: msg.role === 'user' ? 'primary.contrastText' : 'text.primary',
                  border: msg.role === 'user' ? 'none' : '1px solid',
                  borderColor: 'divider',
                  overflow: 'hidden',
                }}
              >
                <ChatMarkdownRenderer content={msg.content} isUser={msg.role === 'user'} />

                {/* Propostas de Ações Human-in-the-Loop */}
                {msg.role === 'assistant' &&
                  msg.suggestedActions &&
                  msg.suggestedActions.length > 0 && (
                    <Box sx={{ mt: 2.5, pt: 2, borderTop: '1px dashed', borderColor: 'divider' }}>
                      <Typography
                        variant="caption"
                        sx={{
                          fontWeight: 700,
                          color: 'text.secondary',
                          letterSpacing: 0.5,
                          display: 'block',
                          mb: 1.5,
                        }}
                      >
                        ⚡ AÇÕES RECOMENDADAS PELO AIOPS (HUMAN-IN-THE-LOOP):
                      </Typography>
                      {msg.suggestedActions.map((action) => (
                        <AIOpsActionCard
                          key={action.actionId}
                          action={action}
                          incidentId={targetIncidentId ?? undefined}
                        />
                      ))}
                    </Box>
                  )}
              </Paper>
            </Box>
          ))}

          {chatMutation.isPending && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, p: 1 }}>
              <CircularProgress size={16} />
              <Typography variant="caption" color="text.secondary">
                AIOps Copilot investigando servidores MCP...
              </Typography>
            </Box>
          )}

          <div ref={messagesEndRef} />
        </Stack>
      </Box>

      {/* Input e Ações Isolados com Zero Re-render no Histórico */}
      <ChatInputBar onSendMessage={sendChatMessage} disabled={chatMutation.isPending} />
    </Drawer>
  );
};
