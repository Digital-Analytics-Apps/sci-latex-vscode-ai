import React from 'react';
import { Handle, Position, type NodeProps, type Node } from '@xyflow/react';
import { Card, CardContent, Typography, Box, Chip } from '@mui/material';
import { Sparkles } from 'lucide-react';
import type { GapNodeData } from '../types';

export const GapNode: React.FC<NodeProps<Node<GapNodeData>>> = ({ data, selected }) => {
  const { title, description, scope, recommendedAction } = data;

  return (
    <Box sx={{ position: 'relative', width: 300 }}>
      <Handle
        type="target"
        position={Position.Top}
        style={{ background: '#e65100', width: 9, height: 9 }}
      />
      <Handle
        type="source"
        position={Position.Bottom}
        style={{ background: '#e65100', width: 9, height: 9 }}
      />
      <Handle
        type="target"
        position={Position.Left}
        id="left"
        style={{ background: '#e65100', width: 8, height: 8 }}
      />
      <Handle
        type="source"
        position={Position.Right}
        id="right"
        style={{ background: '#e65100', width: 8, height: 8 }}
      />

      <Card
        elevation={selected ? 8 : 4}
        sx={{
          borderRadius: 2.5,
          border: selected ? '2px solid #e65100' : '1px solid #ffb74d',
          background: 'linear-gradient(145deg, #fff8e1 0%, #ffffff 100%)',
          boxShadow: '0 4px 18px rgba(230, 81, 0, 0.12)',
        }}
      >
        <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
            <Sparkles size={18} color="#e65100" />
            <Chip
              label="Lacuna de Pesquisa (SciAI)"
              size="small"
              sx={{
                bgcolor: '#e65100',
                color: '#ffffff',
                fontWeight: 700,
                fontSize: '0.65rem',
                height: 20,
              }}
            />
          </Box>

          <Typography
            variant="subtitle2"
            sx={{ fontWeight: 700, color: '#bf360c', mb: 0.5, lineHeight: 1.3 }}
          >
            {title}
          </Typography>

          <Typography variant="body2" sx={{ fontSize: '0.75rem', color: 'text.secondary', mb: 1 }}>
            {description}
          </Typography>

          {scope && (
            <Typography variant="caption" sx={{ display: 'block', color: 'text.disabled', fontStyle: 'italic', mb: 1 }}>
              Escopo identificado: {scope}
            </Typography>
          )}

          {recommendedAction && (
            <Box
              sx={{
                p: 1,
                bgcolor: 'rgba(230, 81, 0, 0.08)',
                borderRadius: 1.5,
                borderLeft: '3px solid #e65100',
              }}
            >
              <Typography variant="caption" sx={{ fontWeight: 600, color: '#bf360c' }}>
                💡 Oportunidade para seu artigo:
              </Typography>
              <Typography variant="caption" sx={{ display: 'block', color: 'text.primary', fontSize: '0.72rem' }}>
                {recommendedAction}
              </Typography>
            </Box>
          )}
        </CardContent>
      </Card>
    </Box>
  );
};
