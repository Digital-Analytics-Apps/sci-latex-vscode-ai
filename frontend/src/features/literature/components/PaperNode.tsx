import React from 'react';
import { Handle, Position, type NodeProps, type Node } from '@xyflow/react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Chip,
  Button,
  Tooltip,
} from '@mui/material';
import { BookOpen, CheckCircle2, AlertTriangle, ExternalLink } from 'lucide-react';
import type { ScientificPaperNodeData } from '../types';

export const PaperNode: React.FC<NodeProps<Node<ScientificPaperNodeData>>> = ({
  data,
  selected,
}) => {
  const {
    title,
    authors,
    year,
    venue,
    strengths,
    declaredLimitations,
    relationType,
    relationLabel,
    suggestedSections,
    onSelectPaper,
  } = data;

  const getRelationColor = () => {
    switch (relationType) {
      case 'evolution':
        return { bg: 'rgba(2, 119, 189, 0.1)', border: '#0288d1', text: '#0288d1' };
      case 'divergent':
        return { bg: 'rgba(211, 47, 47, 0.1)', border: '#d32f2f', text: '#d32f2f' };
      case 'complementary':
        return { bg: 'rgba(46, 125, 50, 0.1)', border: '#2e7d32', text: '#2e7d32' };
      case 'baseline':
        return { bg: 'rgba(123, 31, 162, 0.1)', border: '#7b1fa2', text: '#7b1fa2' };
      default:
        return { bg: 'rgba(21, 101, 192, 0.1)', border: '#1976d2', text: '#1976d2' };
    }
  };

  const badgeStyle = getRelationColor();

  return (
    <Box sx={{ position: 'relative', width: 340 }}>
      {/* Handles para conexões */}
      <Handle
        type="target"
        position={Position.Top}
        style={{ background: '#1976d2', width: 9, height: 9 }}
      />
      <Handle
        type="source"
        position={Position.Bottom}
        style={{ background: '#1976d2', width: 9, height: 9 }}
      />
      <Handle
        type="target"
        position={Position.Left}
        id="left"
        style={{ background: '#0288d1', width: 8, height: 8 }}
      />
      <Handle
        type="source"
        position={Position.Right}
        id="right"
        style={{ background: '#0288d1', width: 8, height: 8 }}
      />

      <Card
        elevation={selected ? 8 : 3}
        sx={{
          borderRadius: 2.5,
          border: selected ? '2px solid #1976d2' : '1px solid rgba(0,0,0,0.1)',
          background: 'var(--mui-palette-background-paper, #ffffff)',
          transition: 'all 0.2s ease-in-out',
          '&:hover': {
            boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
          },
        }}
      >
        <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
          {/* Header do Card com Tag de Relação e Ano */}
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              mb: 1,
            }}
          >
            <Chip
              label={relationLabel || relationType.toUpperCase()}
              size="small"
              sx={{
                height: 22,
                fontSize: '0.68rem',
                fontWeight: 700,
                backgroundColor: badgeStyle.bg,
                borderColor: badgeStyle.border,
                color: badgeStyle.text,
              }}
              variant="outlined"
            />
            <Typography
              variant="caption"
              sx={{
                fontWeight: 700,
                color: 'text.secondary',
                bgcolor: 'action.hover',
                px: 1,
                py: 0.2,
                borderRadius: 1,
              }}
            >
              {year}
            </Typography>
          </Box>

          {/* Título do Artigo */}
          <Tooltip title={title} placement="top">
            <Typography
              variant="subtitle2"
              sx={{
                fontWeight: 700,
                lineHeight: 1.3,
                mb: 0.5,
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
              }}
            >
              {title}
            </Typography>
          </Tooltip>

          {/* Autores & Veículo */}
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{
              display: 'block',
              mb: 1.5,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {authors.slice(0, 3).join(', ')}
            {authors.length > 3 ? ` et al.` : ''} {venue ? `• ${venue}` : ''}
          </Typography>

          {/* Seção Bicolor: Pontos Fortes & Limitações */}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mb: 1.5 }}>
            {/* Box Pontos Fortes */}
            <Box
              sx={{
                p: 1,
                borderRadius: 1.5,
                bgcolor: 'rgba(46, 125, 50, 0.06)',
                borderLeft: '3px solid #2e7d32',
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.6, mb: 0.3 }}>
                <CheckCircle2 size={14} color="#2e7d32" />
                <Typography variant="caption" sx={{ fontWeight: 700, color: '#2e7d32' }}>
                  Pontos Fortes ({strengths.length})
                </Typography>
              </Box>
              <Typography
                variant="caption"
                sx={{
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                  color: 'text.primary',
                  fontSize: '0.72rem',
                }}
              >
                {strengths[0] || 'Rigor metodológico comprovado'}
              </Typography>
            </Box>

            {/* Box Limitações / Pontos Fracos */}
            <Box
              sx={{
                p: 1,
                borderRadius: 1.5,
                bgcolor: 'rgba(211, 47, 47, 0.06)',
                borderLeft: '3px solid #d32f2f',
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.6, mb: 0.3 }}>
                <AlertTriangle size={14} color="#d32f2f" />
                <Typography variant="caption" sx={{ fontWeight: 700, color: '#d32f2f' }}>
                  Limitações ({declaredLimitations.length})
                </Typography>
              </Box>
              <Typography
                variant="caption"
                sx={{
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                  color: 'text.primary',
                  fontSize: '0.72rem',
                }}
              >
                {declaredLimitations[0] || 'Restrições de escopo e validação'}
              </Typography>
            </Box>
          </Box>

          {/* Seções Recomendadas do LaTeX do Autor */}
          {suggestedSections && suggestedSections.length > 0 && (
            <Box sx={{ mb: 1.5 }}>
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ display: 'block', mb: 0.5, fontSize: '0.68rem' }}
              >
                Recomendado citar em:
              </Typography>
              <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                {suggestedSections.map((sec, idx) => (
                  <Chip
                    key={idx}
                    label={sec}
                    size="small"
                    sx={{ fontSize: '0.65rem', height: 18 }}
                  />
                ))}
              </Box>
            </Box>
          )}

          {/* Ação: Abrir Ficha Científica */}
          <Button
            variant="outlined"
            size="small"
            fullWidth
            startIcon={<BookOpen size={14} />}
            endIcon={<ExternalLink size={12} />}
            onClick={() => onSelectPaper?.(data)}
            sx={{
              fontSize: '0.72rem',
              textTransform: 'none',
              borderRadius: 1.5,
              py: 0.4,
            }}
          >
            Inspecionar Ficha Completa
          </Button>
        </CardContent>
      </Card>
    </Box>
  );
};
