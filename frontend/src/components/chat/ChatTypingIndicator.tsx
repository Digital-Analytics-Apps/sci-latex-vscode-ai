import React from 'react';
import { Box, Typography } from '@mui/material';
import { motion } from 'framer-motion';
import { ChatAgentBadge } from './ChatAgentBadge';
import type { AgentName } from '../../features/ai-chat/types/chat.types';

interface ChatTypingIndicatorProps {
  agent?: AgentName;
  statusMessage?: string;
}

const dotVariants = {
  initial: { y: 0, opacity: 0.4 },
  animate: {
    y: [-2, 2, -2],
    opacity: [0.4, 1, 0.4],
  },
};

export const ChatTypingIndicator: React.FC<ChatTypingIndicatorProps> = ({
  agent,
  statusMessage = 'Processando...',
}) => {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-start',
        gap: 0.75,
        mb: 2,
      }}
    >
      {agent && <ChatAgentBadge agent={agent} />}

      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1.5,
          px: 2,
          py: 1.25,
          borderRadius: 2,
          bgcolor: 'background.paper',
          border: '1px solid',
          borderColor: 'divider',
          boxShadow: 1,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          {[0, 0.2, 0.4].map((delay, index) => (
            <motion.span
              key={index}
              variants={dotVariants}
              initial="initial"
              animate="animate"
              transition={{
                duration: 0.8,
                repeat: Infinity,
                delay,
              }}
              style={{
                display: 'inline-block',
                width: 6,
                height: 6,
                borderRadius: '50%',
                backgroundColor: 'currentColor',
              }}
            />
          ))}
        </Box>

        <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.85rem' }}>
          {statusMessage}
        </Typography>
      </Box>
    </Box>
  );
};
