import React from 'react';
import { Box, IconButton, Paper, Typography } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';

interface ChatContainerProps {
  variant?: 'modal' | 'drawer' | 'embedded';
  title?: string;
  subtitle?: string;
  onClose?: () => void;
  headerActions?: React.ReactNode;
  children: React.ReactNode;
  inputBar: React.ReactNode;
}

export const ChatContainer: React.FC<ChatContainerProps> = ({
  variant = 'modal',
  title = 'Assistente de IA Científica (SciAI)',
  subtitle = 'Ideação, busca no arXiv e planejamento do artigo',
  onClose,
  headerActions,
  children,
  inputBar,
}) => {
  const isDrawer = variant === 'drawer';

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        maxHeight: '100%',
        bgcolor: 'background.default',
        overflow: 'hidden',
        borderRadius: isDrawer ? 0 : 2,
      }}
    >
      {/* Cabeçalho do Chat */}
      <Paper
        square
        elevation={0}
        sx={{
          px: 2.5,
          py: 1.5,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid',
          borderColor: 'divider',
          bgcolor: 'background.paper',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 36,
              height: 36,
              borderRadius: '50%',
              bgcolor: 'primary.light',
              color: 'primary.main',
            }}
          >
            <AutoAwesomeIcon sx={{ fontSize: 20 }} />
          </Box>
          <Box>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, lineHeight: 1.2 }}>
              {title}
            </Typography>
            {subtitle && (
              <Typography variant="caption" color="text.secondary">
                {subtitle}
              </Typography>
            )}
          </Box>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {headerActions}
          {onClose && (
            <IconButton onClick={onClose} size="small" aria-label="Fechar chat">
              <CloseIcon fontSize="small" />
            </IconButton>
          )}
        </Box>
      </Paper>

      {/* Área da Lista de Mensagens */}
      <Box sx={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {children}
      </Box>

      {/* Barra de Entrada de Texto */}
      <Box sx={{ p: 2, borderTop: '1px solid', borderColor: 'divider', bgcolor: 'background.paper' }}>
        {inputBar}
      </Box>
    </Box>
  );
};
