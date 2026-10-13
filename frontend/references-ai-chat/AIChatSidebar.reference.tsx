import CloseIcon from '@mui/icons-material/Close';
import PersonIcon from '@mui/icons-material/Person';
import SendIcon from '@mui/icons-material/Send';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import {
  Box,
  CircularProgress,
  IconButton,
  List,
  ListItem,
  Paper,
  TextField,
  Typography,
  useTheme,
} from '@mui/material';
import { useEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface AIChatSidebarProps {
  open: boolean;
  onClose: () => void;
  projectId: string;
  getContext: () => string; // Callback to get current editor content
}

export default function AIChatSidebar({ onClose, projectId, getContext }: AIChatSidebarProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const theme = useTheme();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = { role: 'user', content: input };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    // Placeholder for new Assistant Message
    const assistantMessage: Message = { role: 'assistant', content: '' };
    setMessages((prev) => [...prev, assistantMessage]);

    try {
      const token =
        localStorage.getItem('access_token') ||
        JSON.parse(localStorage.getItem('auth-storage') || '{}')?.state?.token;

      const response = await fetch('http://localhost:8000/api/v1/agent/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          project_id: projectId,
          message: userMessage.content,
          context: getContext(),
          chat_history: messages.map((m) => ({ role: m.role, content: m.content })),
        }),
      });

      if (!response.body) throw new Error('No response body');

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let done = false;

      while (!done) {
        const { value, done: doneReading } = await reader.read();
        done = doneReading;
        const chunkValue = decoder.decode(value);

        setMessages((prev) => {
          const lastMsg = { ...prev[prev.length - 1] };
          lastMsg.content += chunkValue;
          return [...prev.slice(0, -1), lastMsg];
        });
      }
    } catch (error) {
      console.error('Chat Error:', error);
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: 'Error: Failed to get response.' },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Box
      sx={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        bgcolor: 'background.default',
      }}
    >
      <Box
        sx={{
          p: 2,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          bgcolor: 'background.paper',
          borderBottom: `1px solid ${theme.palette.divider}`,
        }}
      >
        <Typography
          variant='h6'
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            color: 'text.primary',
            fontSize: 16,
          }}
        >
          <SmartToyIcon sx={{ color: 'secondary.main' }} /> SciAgent Copilot
        </Typography>
        <IconButton onClick={onClose} sx={{ color: 'text.secondary' }}>
          <CloseIcon />
        </IconButton>
      </Box>

      <List sx={{ flexGrow: 1, overflow: 'auto', p: 2 }}>
        {messages.map((msg, index) => (
          <ListItem
            key={index}
            sx={{
              flexDirection: 'column',
              alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start',
            }}
          >
            <Paper
              sx={{
                p: 1.5,
                maxWidth: '90%',
                bgcolor: msg.role === 'user' ? 'primary.main' : 'background.paper',
                color: msg.role === 'user' ? 'primary.contrastText' : 'text.primary',
                border: msg.role === 'user' ? 'none' : `1px solid ${theme.palette.divider}`,
                borderRadius: 2,
              }}
            >
              <Typography variant='body2' component='div'>
                <ReactMarkdown>{msg.content}</ReactMarkdown>
              </Typography>
            </Paper>
            <Typography variant='caption' sx={{ mt: 0.5, color: 'text.secondary' }}>
              {msg.role === 'user' ? (
                <PersonIcon fontSize='small' />
              ) : (
                <SmartToyIcon fontSize='small' sx={{ color: 'secondary.main' }} />
              )}
            </Typography>
          </ListItem>
        ))}
        {isLoading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 1 }}>
            <CircularProgress size={20} />
          </Box>
        )}
        <div ref={messagesEndRef} />
      </List>

      <Box
        sx={{ p: 2, borderTop: `1px solid ${theme.palette.divider}`, bgcolor: 'background.paper' }}
      >
        <TextField
          fullWidth
          size='small'
          placeholder='Ask about your paper...'
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
          disabled={isLoading}
          sx={{
            '& .MuiOutlinedInput-root': {
              color: 'text.primary',
              bgcolor: 'background.default',
              '& fieldset': { borderColor: 'divider' },
              '&:hover fieldset': { borderColor: 'text.secondary' },
              '&.Mui-focused fieldset': { borderColor: 'primary.main' },
            },
          }}
          InputProps={{
            endAdornment: (
              <IconButton
                onClick={handleSend}
                disabled={isLoading || !input.trim()}
                sx={{ color: 'primary.main', '&.Mui-disabled': { color: 'action.disabled' } }}
              >
                <SendIcon />
              </IconButton>
            ),
          }}
        />
      </Box>
    </Box>
  );
}
