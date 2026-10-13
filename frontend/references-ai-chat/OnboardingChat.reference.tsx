import { Send, AutoAwesome, ArrowBack } from '@mui/icons-material';
import {
  Box,
  Button,
  IconButton,
  List,
  ListItem,
  Paper,
  Stack,
  TextField,
  Typography,
  Select,
  MenuItem,
  Fade,
} from '@mui/material';
import { TuneRounded } from '@mui/icons-material';
import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { v4 as uuidv4 } from 'uuid';
import { sendMessage, resumeMessage, type InterruptActionRequest, onboardingApi } from '../onboardingApi';


export default function OnboardingChat() {
  const navigate = useNavigate();
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { conversationId: urlConversationId } = useParams();

  // If there's no URL param, we generate one UUID on mount.
  // We use a ref so it doesn't change on re-renders before navigation completes.
  const newChatIdRef = useRef(uuidv4());

  const conversationId = urlConversationId || newChatIdRef.current;

  const [localMessages, setLocalMessages] = useState<any[]>([]);
  const [pendingInterruptsList, setPendingInterruptsList] = useState<any[]>([]);
  const [searchSource, setSearchSource] = useState('semantic_scholar');
  const [isLoading, setIsLoading] = useState(false);
  const [isInitializingRoute, setIsInitializingRoute] = useState(true);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    // 1. Initial URL tracking logic: Redirect to a new ID if none is provided in the URL
    if (!urlConversationId) {
      navigate(`/onboarding/c/${conversationId}`, { replace: true });
    }
  }, [urlConversationId, conversationId, navigate]);

  useEffect(() => {
    // 2. Fetch History Logic
    const fetchHistory = async () => {
      if (!urlConversationId) return;
      setIsLoading(true);
      try {
        const data = await onboardingApi.getSessionHistory(urlConversationId);
        if (data && data.messages) {
          setLocalMessages(data.messages);
        }
        if (data && data.active_interrupt) {
          setPendingInterruptsList([{
            id: data.active_interrupt.id,
            value: data.active_interrupt.interrupts
          }]);
        }
      } catch (err) {
        console.error("Failed to fetch chat history", err);
      } finally {
        setIsLoading(false);
        setIsInitializingRoute(false);
      }
    };

    // Only fetch if history is totally empty to avoid overriding local optimistic updates immediately
    if (localMessages.length === 0) {
      fetchHistory();
    } else {
      setIsInitializingRoute(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlConversationId]);

  useEffect(() => {
    scrollToBottom();
  }, [localMessages, pendingInterruptsList, isLoading]);

  const processStream = async (response: Response) => {
    if (!response.body) return;
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    let activeAiMessageId: number | null = null;
    let currentAgentName = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          const data = JSON.parse(line);

          switch (data.type) {
            case 'token':
              const incomingAgent = data.agent_name || 'Supervisor';
              
              if (!activeAiMessageId || incomingAgent !== currentAgentName) {
                // Agent switched or it's the first message: Create new block
                activeAiMessageId = Date.now() + Math.random();
                currentAgentName = incomingAgent;
                setLocalMessages((prev) => [
                  ...prev,
                  {
                    id: activeAiMessageId,
                    type: 'ai',
                    agent_name: currentAgentName,
                    content: data.content || '',
                    structured_data: null,
                  },
                ]);
              } else {
                // Append to existing block
                setLocalMessages((prev) =>
                  prev.map((msg) =>
                    msg.id === activeAiMessageId
                      ? { ...msg, content: msg.content + (data.content || '') }
                      : msg
                  )
                );
              }
              break;

            case 'state':
              if (activeAiMessageId) {
                setLocalMessages((prev) =>
                  prev.map((msg) =>
                    msg.id === activeAiMessageId
                      ? { ...msg, structured_data: { ...msg.structured_data, ...data.data } }
                      : msg
                  )
                );
              }
              break;

            case 'interrupt':
              setPendingInterruptsList([{ id: data.id, value: data.data }]); // data.data is the payload now
              if (data.data && activeAiMessageId) {
                setLocalMessages((prev) =>
                  prev.map((msg) =>
                    msg.id === activeAiMessageId
                      ? { ...msg, structured_data: { ...msg.structured_data, ...data.data } }
                      : msg
                  )
                );
              }
              break;

            case 'error':
              console.error('Stream error:', data.message);
              break;
            
            case 'agent':
              // If the agent switch event comes, we respect it and might start a new block
              if (data.name !== currentAgentName) {
                activeAiMessageId = Date.now() + Math.random();
                currentAgentName = data.name;
                setLocalMessages((prev) => [
                  ...prev,
                  {
                    id: activeAiMessageId,
                    type: 'ai',
                    agent_name: currentAgentName,
                    content: '',
                    structured_data: null,
                  },
                ]);
              }
              break;

            case 'end':
              // Optional clean up
              break;

            default:
              console.warn('Unknown event type from stream', data);
          }
        } catch (e) {
          // ignore
        }
      }
    }
  };
  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userText = input;
    // Mostra o texto do usuário instantaneamente
    setLocalMessages((prev) => [...prev, { id: Date.now(), type: 'human', content: userText }]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await sendMessage(conversationId, userText, searchSource);
      await processStream(response);
    } catch (error) {
      console.error(error);
      setLocalMessages((prev) => [
        ...prev,
        {
          id: Date.now(),
          type: 'ai',
          agent_name: 'system',
          content: 'Erro ao conectar ao servidor.',
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const hitlRequest = pendingInterruptsList[0]?.value as any | undefined;
  const hitlInterruptId = pendingInterruptsList[0]?.id as string | undefined;

  // As in the docs, actionRequests is an array
  const pendingActions = hitlRequest?.action_requests || hitlRequest?.actionRequests || [];
  const isPendingInterrupt = pendingActions.length > 0;

  const handleApproveInterrupt = async () => {
    if (!hitlRequest || !hitlInterruptId) return;

    console.log('[handleApprove] Submitting resume. ID:', hitlInterruptId);

    setPendingInterruptsList([]);
    setIsLoading(true);

    try {
      const response = await resumeMessage(
        conversationId,
        hitlInterruptId,
        { action: 'approve' },
        searchSource,
      );
      await processStream(response);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRejectInterrupt = async (reason: string) => {
    if (!hitlRequest || !hitlInterruptId) return;

    console.log('[handleReject] Submitting resume. ID:', hitlInterruptId);

    setPendingInterruptsList([]);
    setIsLoading(true);

    try {
      const response = await resumeMessage(
        conversationId,
        hitlInterruptId,
        { action: 'reject', message: reason },
        searchSource,
      );
      await processStream(response);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Box
      sx={{
        height: '100vh',
        width: '100%',
        bgcolor: 'background.default',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
      }}
    >
      <Box
        sx={{
          width: '100%',
          maxWidth: '900px',
          flexGrow: 1,
          display: 'flex',
          flexDirection: 'column',
          overflowY: 'auto',
          px: { xs: 2, md: 4 },
          pt: 4,
          pb: 2,
          '&::-webkit-scrollbar': { width: '8px' },
          '&::-webkit-scrollbar-thumb': { backgroundColor: 'divider', borderRadius: '4px' },
        }}
      >
        <Box sx={{ width: '100%', display: 'flex', justifyContent: 'flex-start', mb: 2 }}>
          <Button
            startIcon={<ArrowBack />}
            onClick={() => navigate('/dashboard')}
            sx={{
              color: 'primary.main',
              textTransform: 'none',
              borderRadius: '20px',
              '&:hover': { bgcolor: 'action.hover' },
            }}
          >
            Voltar ao Dashboard
          </Button>
        </Box>
        {localMessages.length === 0 && !isInitializingRoute && (
          <Fade in={true} timeout={1000}>
            <Box
              sx={{
                mt: '10vh',
                px: 2,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                textAlign: 'center',
              }}
            >
              <Typography
                variant='h3'
                sx={{
                  fontWeight: 500,
                  background: (theme: any) => theme.palette.aiGradient,
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  mb: 1,
                }}
              >
                Olá!
              </Typography>
              <Typography variant='h3' sx={{ fontWeight: 500, color: 'text.secondary' }}>
                Como Posso Ajudar?
              </Typography>
            </Box>
          </Fade>
        )}

        <List sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
          {localMessages.map((msg: any, idx: number) => {
            const isHuman = msg.type === 'human';
            return (
              <ListItem
                key={msg.id || idx}
                sx={{
                  justifyContent: isHuman ? 'flex-end' : 'flex-start',
                  alignItems: 'flex-start',
                  px: 0,
                  py: 1,
                }}
              >
                {isHuman ? (
                  <Box
                    sx={{
                      bgcolor: 'background.paper',
                      color: 'text.primary',
                      px: 3,
                      py: 1.5,
                      borderRadius: '24px',
                      borderBottomRightRadius: '4px',
                      maxWidth: '85%',
                    }}
                  >
                    <Typography variant='body1' sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
                      {msg.content}
                    </Typography>
                  </Box>
                ) : (
                  <Stack direction='row' spacing={2} sx={{ maxWidth: '100%' }}>
                    <AutoAwesome sx={{ color: 'primary.main', mt: 0.5, fontSize: '1.5rem' }} />
                    <Box sx={{ width: '100%', color: 'text.primary' }}>
                      {msg.agent_name && msg.agent_name !== 'system' && (
                        <Typography
                          variant='caption'
                          sx={{ display: 'block', mb: 0.5, color: 'primary.main', fontWeight: 500 }}
                        >
                          {msg.agent_name}
                        </Typography>
                      )}
                      <Typography variant='body1' sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
                        {msg.content}
                      </Typography>
                      {msg.structured_data && (
                        <Box
                          sx={{
                            mt: 2,
                            p: 2,
                            bgcolor: 'background.paper',
                            borderRadius: 3,
                            border: '1px solid',
                            borderColor: 'divider',
                            width: '100%',
                            overflowX: 'auto',
                          }}
                        >
                          <Typography variant="subtitle2" sx={{ color: 'text.secondary', mb: 1, fontWeight: 600 }}>
                            Anexos Estruturados:
                          </Typography>
                          <pre style={{ margin: 0, fontSize: '0.85rem', color: '#555', whiteSpace: 'pre-wrap' }}>
                            {JSON.stringify(msg.structured_data, null, 2)}
                          </pre>
                        </Box>
                      )}
                    </Box>
                  </Stack>
                )}
              </ListItem>
            );
          })}
          {isLoading && (
            <ListItem sx={{ justifyContent: 'flex-start', px: 0, py: 1 }}>
              <Stack direction='row' spacing={2} alignItems='center'>
                <AutoAwesome
                  sx={{
                    color: 'primary.main',
                    animation: 'spin 2s linear infinite',
                    fontSize: '1.5rem',
                  }}
                />
                <style>
                  {`
                    @keyframes spin {
                      0% { transform: rotate(0deg); }
                      100% { transform: rotate(360deg); }
                    }
                    @keyframes pulse {
                      0% { opacity: 0.5; }
                      50% { opacity: 1; }
                      100% { opacity: 0.5; }
                    }
                  `}
                </style>
                <Typography
                  variant='body1'
                  sx={{ color: 'primary.main', animation: 'pulse 1.5s ease-in-out infinite' }}
                >
                  Pensando...
                </Typography>
              </Stack>
            </ListItem>
          )}

          {isPendingInterrupt && !isLoading && (
            <ListItem sx={{ justifyContent: 'center', px: 0, mt: 2 }}>
              <Box
                sx={{
                  width: '100%',
                  p: 3,
                  border: (theme) => `1px solid ${theme.palette.divider}`,
                  borderRadius: '16px',
                  backgroundColor: 'background.default',
                }}
              >
                <Typography
                  variant='subtitle1'
                  color='primary.main'
                  sx={{ fontWeight: 600, mb: 1 }}
                >
                  Ação Requer Aprovação
                </Typography>
                {pendingActions.map((action: InterruptActionRequest, i: number) => (
                  <Box key={i} sx={{ mb: 2 }}>
                    <Typography variant='body2' sx={{ color: 'text.primary', mb: 1 }}>
                      Permitir ação: <strong>{action.name || 'Ferramenta'}</strong>?
                    </Typography>
                    {action.description && (
                      <Typography
                        variant='body2'
                        sx={{ color: 'text.secondary', mb: 2, whiteSpace: 'pre-wrap' }}
                      >
                        {action.description}
                      </Typography>
                    )}
                    <Stack direction='row' spacing={2}>
                      <Button
                        variant='contained'
                        sx={{
                          bgcolor: 'primary.main',
                          color: 'primary.contrastText',
                          '&:hover': { bgcolor: 'primary.dark' },
                          borderRadius: '20px',
                          textTransform: 'none',
                          px: 3,
                        }}
                        onClick={() => {
                          console.log('Approve button clicked');
                          handleApproveInterrupt();
                        }}
                      >
                        Aprovar
                      </Button>
                      <Button
                        variant='outlined'
                        sx={{
                          color: 'text.primary',
                          borderColor: 'text.secondary',
                          '&:hover': { borderColor: 'text.primary', bgcolor: 'action.hover' },
                          borderRadius: '20px',
                          textTransform: 'none',
                          px: 3,
                        }}
                        onClick={() => handleRejectInterrupt('Usuário rejeitou.')}
                      >
                        Rejeitar
                      </Button>
                    </Stack>
                  </Box>
                ))}
              </Box>
            </ListItem>
          )}

          <div ref={messagesEndRef} />
        </List>
      </Box>

      {/* Input Section */}
      <Box
        sx={{
          width: '100%',
          maxWidth: '900px',
          p: 2,
          pb: 4,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <Paper
          elevation={0}
          sx={{
            width: '100%',
            maxWidth: '800px',
            minHeight: '60px',
            bgcolor: 'background.paper',
            borderRadius: '32px',
            display: 'flex',
            alignItems: 'flex-end',
            px: 2,
            py: 1.5,
            border: 'none',
            '&:focus-within': {
              bgcolor: 'action.hover',
            },
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5, mr: 1, height: '100%' }}>
            <Select
              value={searchSource}
              onChange={(e) => setSearchSource(e.target.value as string)}
              disabled={isLoading}
              variant='standard'
              disableUnderline
              displayEmpty
              IconComponent={() => null} // Remove o ícone padrão da setinha
              renderValue={(value) => (
                <Stack direction='row' spacing={1} alignItems='center'>
                  <TuneRounded sx={{ fontSize: '1.2rem', color: 'text.primary' }} />
                  <Typography variant='body2' sx={{ color: 'text.primary', fontWeight: 500 }}>
                    {value === 'semantic_scholar' ? 'Ferramentas' : 'Ferramentas'}
                  </Typography>
                </Stack>
              )}
              sx={{
                bgcolor: 'action.hover',
                borderRadius: '24px',
                px: 2,
                py: 0.75,
                '& .MuiSelect-select': {
                  display: 'flex',
                  alignItems: 'center',
                  paddingRight: '0 !important',
                },
                '&:hover': {
                  bgcolor: 'action.selected',
                },
              }}
              MenuProps={{
                PaperProps: {
                  sx: {
                    bgcolor: 'background.paper',
                    color: 'text.primary',
                    borderRadius: '16px',
                    mt: 1,
                    '& .MuiMenuItem-root': {
                      py: 1.5,
                      px: 2,
                      '&:hover': {
                        bgcolor: 'action.hover',
                      },
                      '&.Mui-selected': {
                        bgcolor: 'action.selected',
                        '&:hover': {
                          bgcolor: 'action.focus',
                        },
                      },
                    },
                  },
                },
              }}
            >
              <MenuItem value='semantic_scholar'>Semantic Scholar</MenuItem>
              <MenuItem value='openalex'>OpenAlex Database</MenuItem>
            </Select>
          </Box>
          <TextField
            multiline
            maxRows={8}
            fullWidth
            variant='standard'
            placeholder='Pergunte ao Agente...'
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            disabled={isLoading}
            slotProps={{
              input: {
                disableUnderline: true,
                sx: { color: 'text.primary', py: 0.5, fontSize: '1rem', lineHeight: 1.5 },
              },
            }}
          />
          <IconButton
            onClick={handleSend}
            disabled={isLoading || !input.trim()}
            sx={{
              mb: 0.5,
              ml: 1,
              bgcolor: input.trim() ? 'text.primary' : 'transparent',
              color: input.trim() ? 'background.default' : 'text.secondary',
              '&:hover': { bgcolor: input.trim() ? 'primary.contrastText' : 'transparent' },
              transition: 'all 0.2s',
              '&.Mui-disabled': {
                color: 'text.secondary',
                bgcolor: 'transparent',
              },
            }}
          >
            <Send sx={{ fontSize: '1.2rem' }} />
          </IconButton>
        </Paper>
      </Box>
    </Box>
  );
}
