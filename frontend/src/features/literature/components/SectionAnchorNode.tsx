import React from 'react';
import { Handle, Position, type NodeProps, type Node } from '@xyflow/react';
import { Card, CardContent, Typography, Box, Chip } from '@mui/material';
import { FileText } from 'lucide-react';
import type { SectionAnchorNodeData } from '../types';

export const SectionAnchorNode: React.FC<NodeProps<Node<SectionAnchorNodeData>>> = ({
  data,
  selected,
}) => {
  const { sectionNumber, sectionTitle, coverageStatus, referencesCount } = data;

  const getStatusConfig = () => {
    switch (coverageStatus) {
      case 'well_covered':
        return { label: 'Bem Coberta', color: '#2e7d32', bg: 'rgba(46, 125, 50, 0.1)' };
      case 'partial':
        return { label: 'Parcial', color: '#ed6c02', bg: 'rgba(237, 108, 2, 0.1)' };
      case 'insufficient':
        return { label: 'Evidência Insuficiente', color: '#d32f2f', bg: 'rgba(211, 47, 47, 0.1)' };
    }
  };

  const status = getStatusConfig();

  return (
    <Box sx={{ position: 'relative', width: 260 }}>
      <Handle
        type="target"
        position={Position.Top}
        style={{ background: '#455a64', width: 9, height: 9 }}
      />
      <Handle
        type="source"
        position={Position.Bottom}
        style={{ background: '#455a64', width: 9, height: 9 }}
      />
      <Handle
        type="target"
        position={Position.Left}
        id="left"
        style={{ background: '#455a64', width: 8, height: 8 }}
      />
      <Handle
        type="source"
        position={Position.Right}
        id="right"
        style={{ background: '#455a64', width: 8, height: 8 }}
      />

      <Card
        elevation={selected ? 6 : 2}
        sx={{
          borderRadius: 2,
          border: selected ? '2px solid #455a64' : '1px solid rgba(0,0,0,0.12)',
          background: 'var(--mui-palette-background-paper, #ffffff)',
        }}
      >
        <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
            <FileText size={16} color="#546e7a" />
            <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary' }}>
              Manuscrito LaTeX • {sectionNumber}
            </Typography>
          </Box>

          <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1, fontSize: '0.85rem' }}>
            {sectionTitle}
          </Typography>

          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Chip
              label={status.label}
              size="small"
              sx={{
                fontSize: '0.65rem',
                height: 20,
                color: status.color,
                bgcolor: status.bg,
                fontWeight: 700,
              }}
            />
            <Typography variant="caption" color="text.secondary">
              {referencesCount} {referencesCount === 1 ? 'artigo' : 'artigos'}
            </Typography>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
};
