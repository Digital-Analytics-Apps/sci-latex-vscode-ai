import { Box, Card, CardContent, Chip, CircularProgress, Typography } from '@mui/material';
import type { CardProps } from '@mui/material';
import React from 'react';

export type DeadlineStatusKey = 'ON_TIME' | 'WARNING' | 'OVERDUE';

const getDeadlineStatusConfig = (
  type: DeadlineStatusKey,
  count: number
): { color: 'success' | 'warning' | 'error'; label: string } => {
  switch (type) {
    case 'ON_TIME':
      return { color: 'success', label: `${count} no prazo` };
    case 'WARNING':
      return { color: 'warning', label: `${count} atenção` };
    case 'OVERDUE':
      return { color: 'error', label: `${count} atrasado` };
  }
};

/**
 * Chip para Exibição de Status de Prazos (No prazo, Atenção, Atrasado).
 */
export const DeadlineStatusChip = ({ type, count }: { type: DeadlineStatusKey; count: number }) => {
  const { color, label } = getDeadlineStatusConfig(type, count);
  return (
    <Chip
      label={label}
      size="small"
      color={color}
      variant="outlined"
      sx={{ fontWeight: 600, fontSize: 11 }}
    />
  );
};

/**
 * Card Reutilizável de Métricas e KPIs (Gerente, Coordenador, Autor).
 */
export interface MetricCardProps extends CardProps {
  title: string;
  value: React.ReactNode;
  icon?: React.ReactNode;
  subtitle?: React.ReactNode;
  color?: string;
  isLoading?: boolean;
  onClick?: () => void;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  icon,
  subtitle,
  color = 'primary.main',
  isLoading = false,
  onClick,
  sx,
  variant = 'outlined',
  ...restCardProps
}) => {
  return (
    <Card
      variant={variant}
      sx={{
        height: '100%',
        cursor: onClick ? 'pointer' : 'default',
        borderRadius: 2,
        transition:
          'transform 0.2s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.2s cubic-bezier(0.4, 0, 0.2, 1), border-color 0.2s ease',
        '&:hover': {
          borderColor: 'primary.main',
          transform: onClick ? 'translateY(-3px)' : 'translateY(-1px)',
          boxShadow: (theme) =>
            theme.palette.mode === 'dark'
              ? '0 8px 24px rgba(0, 0, 0, 0.35)'
              : '0 8px 24px rgba(0, 0, 0, 0.06)',
        },
        ...sx,
      }}
      onClick={onClick}
      {...restCardProps}
    >
      <CardContent sx={{ p: 2.5, '&:last-child': { pb: 2.5 } }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
            {title}
          </Typography>
          {icon && <Box sx={{ display: 'flex', alignItems: 'center', opacity: 0.85 }}>{icon}</Box>}
        </Box>

        <Typography
          variant="h3"
          sx={{
            fontWeight: 700,
            fontFamily: '"JetBrains Mono", monospace',
            letterSpacing: '-0.02em',
            color,
            my: 0.5,
          }}
        >
          {isLoading ? <CircularProgress size={28} /> : value}
        </Typography>

        {subtitle && (
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
            {subtitle}
          </Typography>
        )}
      </CardContent>
    </Card>
  );
};
