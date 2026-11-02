import React from 'react';
import { Box, Paper, Typography } from '@mui/material';
import { ChatAgentBadge } from './ChatAgentBadge';
import { ChatMarkdownRenderer } from './ChatMarkdownRenderer';
import type { ChatMessage } from '../../features/ai-chat/types/chat.types';

interface ChatMessageBubbleProps {
  message: ChatMessage;
  children?: React.ReactNode;
}

export const ChatMessageBubble: React.FC<ChatMessageBubbleProps> = ({
  message,
  children,
}) => {
  const isUser = message.role === 'user';
  const isSystem = message.role === 'system';

  if (isSystem) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', my: 1.5 }}>
        <Paper
          elevation={0}
          sx={{
            px: 2,
            py: 0.5,
            borderRadius: 4,
            bgcolor: 'action.hover',
            border: '1px solid',
            borderColor: 'divider',
          }}
        >
          <Typography variant="caption" color="text.secondary">
            {message.content}
          </Typography>
        </Paper>
      </Box>
    );
  }

  const formattedTime = new Date(message.timestamp).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: isUser ? 'flex-end' : 'flex-start',
        mb: 2,
        maxWidth: '100%',
      }}
    >
      {!isUser && (
        <Box sx={{ mb: 0.5, display: 'flex', alignItems: 'center', gap: 1 }}>
          <ChatAgentBadge agent={message.agent || 'supervisor'} />
          <Typography variant="caption" color="text.disabled">
            {formattedTime}
          </Typography>
        </Box>
      )}

      <Paper
        elevation={isUser ? 2 : 1}
        sx={{
          p: 2,
          maxWidth: { xs: '90%', sm: '80%' },
          borderRadius: 2.5,
          borderTopRightRadius: isUser ? 0.5 : 2.5,
          borderTopLeftRadius: !isUser ? 0.5 : 2.5,
          bgcolor: isUser ? 'primary.main' : 'background.paper',
          color: isUser ? 'primary.contrastText' : 'text.primary',
          border: isUser ? 'none' : '1px solid',
          borderColor: 'divider',
          wordBreak: 'break-word',
          whiteSpace: 'pre-wrap',
          lineHeight: 1.6,
        }}
      >
        <ChatMarkdownRenderer content={message.content} isUser={isUser} />

        {children && <Box sx={{ mt: 2 }}>{children}</Box>}
      </Paper>

      {isUser && (
        <Typography variant="caption" color="text.disabled" sx={{ mt: 0.25, mr: 0.5 }}>
          {formattedTime}
        </Typography>
      )}
    </Box>
  );
};
