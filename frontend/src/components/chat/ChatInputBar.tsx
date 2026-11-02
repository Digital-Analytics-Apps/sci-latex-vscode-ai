import React, { useState, useRef } from 'react';
import { IconButton, InputBase, Paper, Tooltip } from '@mui/material';
import SendRoundedIcon from '@mui/icons-material/SendRounded';
import StopCircleRoundedIcon from '@mui/icons-material/StopCircleRounded';

interface ChatInputBarProps {
  onSendMessage: (text: string) => void;
  onAbortStream?: () => void;
  isStreaming?: boolean;
  disabled?: boolean;
  placeholder?: string;
}

export const ChatInputBar: React.FC<ChatInputBarProps> = ({
  onSendMessage,
  onAbortStream,
  isStreaming = false,
  disabled = false,
  placeholder = 'Descreva seu tema ou responda à pergunta...',
}) => {
  const [text, setText] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSend = () => {
    const trimmed = text.trim();
    if (!trimmed || isStreaming || disabled) return;
    onSendMessage(trimmed);
    setText('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <Paper
      elevation={2}
      sx={{
        display: 'flex',
        alignItems: 'flex-end',
        p: '6px 8px',
        borderRadius: 3,
        border: '1px solid',
        borderColor: 'divider',
        bgcolor: 'background.paper',
        transition: 'border-color 0.2s',
        '&:focus-within': {
          borderColor: 'primary.main',
        },
      }}
    >
      <InputBase
        inputRef={inputRef}
        multiline
        maxRows={4}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={disabled ? 'Aguardando sua decisão acima...' : placeholder}
        disabled={disabled || isStreaming}
        sx={{
          flex: 1,
          px: 1.5,
          py: 0.5,
          fontSize: '0.925rem',
          lineHeight: 1.5,
        }}
      />

      {isStreaming ? (
        <Tooltip title="Interromper geração">
          <IconButton
            color="error"
            onClick={onAbortStream}
            sx={{ p: 1, alignSelf: 'flex-end' }}
            aria-label="Interromper resposta"
          >
            <StopCircleRoundedIcon />
          </IconButton>
        </Tooltip>
      ) : (
        <Tooltip title="Enviar mensagem (Enter)">
          <span>
            <IconButton
              color="primary"
              onClick={handleSend}
              disabled={!text.trim() || disabled}
              sx={{ p: 1, alignSelf: 'flex-end' }}
              aria-label="Enviar mensagem"
            >
              <SendRoundedIcon />
            </IconButton>
          </span>
        </Tooltip>
      )}
    </Paper>
  );
};
