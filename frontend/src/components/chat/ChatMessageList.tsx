import React from 'react';
import { Box, Fab, Fade } from '@mui/material';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import { ChatMessageBubble } from './ChatMessageBubble';
import { ChatTypingIndicator } from './ChatTypingIndicator';
import { useChatAutoScroll } from '../../features/ai-chat/hooks/useChatAutoScroll';
import type { AgentName, ChatMessage } from '../../features/ai-chat/types/chat.types';

interface ChatMessageListProps {
  messages: ChatMessage[];
  streamingContent?: string;
  currentAgent?: AgentName;
  isStreaming?: boolean;
  statusMessage?: string;
  renderMessageExtra?: (message: ChatMessage) => React.ReactNode;
  emptyState?: React.ReactNode;
}

export const ChatMessageList: React.FC<ChatMessageListProps> = ({
  messages,
  streamingContent,
  currentAgent,
  isStreaming = false,
  statusMessage,
  renderMessageExtra,
  emptyState,
}) => {
  const { containerRef, bottomRef, scrollToBottom, isUserScrolledUp, handleScroll } =
    useChatAutoScroll(messages.length + (streamingContent?.length || 0));

  return (
    <Box
      ref={containerRef}
      onScroll={handleScroll}
      sx={{
        flex: 1,
        overflowY: 'auto',
        p: 2,
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
      }}
    >
      {messages.length === 0 && !isStreaming && emptyState}

      {messages.map((msg) => (
        <ChatMessageBubble key={msg.id} message={msg}>
          {renderMessageExtra ? renderMessageExtra(msg) : null}
        </ChatMessageBubble>
      ))}

      {isStreaming && streamingContent && (
        <ChatMessageBubble
          message={{
            id: 'active-streaming-message',
            role: 'assistant',
            content: streamingContent,
            agent: currentAgent || 'supervisor',
            timestamp: Date.now(),
            status: 'streaming',
          }}
        />
      )}

      {isStreaming && !streamingContent && (
        <ChatTypingIndicator agent={currentAgent} statusMessage={statusMessage} />
      )}

      <div ref={bottomRef} style={{ height: 1 }} />

      <Fade in={isUserScrolledUp}>
        <Fab
          size="small"
          color="primary"
          onClick={() => scrollToBottom(true)}
          sx={{
            position: 'absolute',
            bottom: 16,
            right: 16,
            boxShadow: 3,
            zIndex: 10,
          }}
          aria-label="Rolar para as mensagens recentes"
        >
          <KeyboardArrowDownIcon />
        </Fab>
      </Fade>
    </Box>
  );
};
