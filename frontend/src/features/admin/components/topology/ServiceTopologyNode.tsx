import { Box, Card, CardContent, Chip, Divider, Stack, Typography } from '@mui/material';
import { Handle, type NodeProps, Position } from '@xyflow/react';
import { Bot, Cpu, Database, Globe, HardDrive, Radio, Server, Sparkles, Zap } from 'lucide-react';
import React from 'react';
import type { ServiceNode } from './types';

const getServiceIcon = (id: string, category: string) => {
  if (id.includes('frontend')) return <Globe size={18} color="#0284c7" />;
  if (id.includes('backend') || id.includes('pod')) return <Server size={18} color="#2563eb" />;
  if (id.includes('sciai') || id.includes('ai')) return <Bot size={18} color="#8b5cf6" />;
  if (id.includes('compiler')) return <Cpu size={18} color="#ea580c" />;
  if (id.includes('postgres') || category === 'storage')
    return <Database size={18} color="#0d9488" />;
  if (id.includes('redis')) return <Zap size={18} color="#dc2626" />;
  if (id.includes('minio')) return <HardDrive size={18} color="#059669" />;
  if (id.includes('opik')) return <Sparkles size={18} color="#d946ef" />;
  return <Server size={18} color="#475569" />;
};

const getStatusBadge = (status: 'UP' | 'DEGRADED' | 'DOWN') => {
  switch (status) {
    case 'UP':
      return {
        label: 'Operacional',
        color: 'success' as const,
        borderColor: '#22c55e',
      };
    case 'DEGRADED':
      return {
        label: 'Degradado',
        color: 'warning' as const,
        borderColor: '#f59e0b',
      };
    case 'DOWN':
      return {
        label: 'Inacessível',
        color: 'error' as const,
        borderColor: '#ef4444',
      };
  }
};

const ServiceTopologyNodeComponent: React.FC<NodeProps<ServiceNode>> = ({ data, selected }) => {
  const { id, name, subTitle, status, metrics, isProcessing } = data;
  const statusInfo = getStatusBadge(status);

  return (
    <Card
      sx={{
        width: 290,
        borderRadius: 2.5,
        border: '2px solid',
        borderColor: isProcessing ? '#0284c7' : selected ? 'primary.main' : statusInfo.borderColor,
        boxShadow: isProcessing ? '0 0 16px 4px rgba(2, 132, 199, 0.45)' : selected ? 6 : 2,
        backgroundColor: 'background.paper',
        overflow: 'visible',
        position: 'relative',
        transform: 'none',
        transition: 'border-color 0.25s, box-shadow 0.25s',
        animation: isProcessing ? 'topologyNodeBlink 1.1s ease-in-out infinite' : 'none',
        '@keyframes topologyNodeBlink': {
          '0%, 100%': {
            borderColor: '#38bdf8',
            boxShadow: '0 0 18px 5px rgba(56, 189, 248, 0.75)',
          },
          '50%': {
            borderColor: '#0284c7',
            boxShadow: '0 0 4px 1px rgba(2, 132, 199, 0.2)',
          },
        },
        '&:hover': {
          boxShadow: 4,
        },
      }}
    >
      {/* Badge Flutuante de Processamento Ativo */}
      {isProcessing && (
        <Box
          sx={{
            position: 'absolute',
            top: -12,
            right: 14,
            zIndex: 20,
          }}
        >
          <Chip
            icon={<Radio size={12} className="animate-pulse" />}
            label="⚡ Ativo"
            size="small"
            sx={{
              bgcolor: '#0284c7',
              color: '#ffffff',
              fontWeight: 800,
              fontSize: '0.68rem',
              height: 22,
              boxShadow: '0 2px 8px rgba(2, 132, 199, 0.4)',
            }}
          />
        </Box>
      )}

      {/* Target & Source Handles */}
      <Handle
        type="target"
        position={Position.Top}
        id="top"
        style={{
          background: isProcessing ? '#38bdf8' : statusInfo.borderColor,
          width: 9,
          height: 9,
          borderRadius: 5,
        }}
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="bottom"
        style={{
          background: isProcessing ? '#38bdf8' : statusInfo.borderColor,
          width: 9,
          height: 9,
          borderRadius: 5,
        }}
      />
      <Handle
        type="target"
        position={Position.Left}
        id="left"
        style={{
          background: isProcessing ? '#38bdf8' : statusInfo.borderColor,
          width: 9,
          height: 9,
          borderRadius: 5,
        }}
      />
      <Handle
        type="source"
        position={Position.Right}
        id="right"
        style={{
          background: isProcessing ? '#38bdf8' : statusInfo.borderColor,
          width: 9,
          height: 9,
          borderRadius: 5,
        }}
      />

      <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
        {/* Node Header */}
        <Stack
          direction="row"
          sx={{ alignItems: 'flex-start', justifyContent: 'space-between', mb: 1 }}
        >
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
            <Box
              sx={{
                p: 0.75,
                borderRadius: 1.5,
                bgcolor: isProcessing ? 'primary.light' : 'action.hover',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {getServiceIcon(id, data.category)}
            </Box>
            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 800, lineHeight: 1.2 }}>
                {name}
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                {subTitle}
              </Typography>
            </Box>
          </Stack>
          <Chip
            label={statusInfo.label}
            color={statusInfo.color}
            size="small"
            sx={{ fontWeight: 700, fontSize: '0.65rem', height: 20 }}
          />
        </Stack>

        <Divider sx={{ my: 1 }} />

        {/* Dynamic Telemetry Metrics (Pure Information, Zero Button Clutter) */}
        <Stack spacing={0.8}>
          {metrics.map((metric, idx) => (
            <Stack
              key={idx}
              direction="row"
              sx={{ justifyContent: 'space-between', alignItems: 'center' }}
            >
              <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                {metric.label}
              </Typography>
              <Typography
                variant="caption"
                sx={{
                  fontWeight: 700,
                  fontSize: '0.75rem',
                  color: metric.highlight ? 'primary.main' : 'text.primary',
                }}
              >
                {metric.value}
              </Typography>
            </Stack>
          ))}
        </Stack>
      </CardContent>
    </Card>
  );
};

// Otimização estrita de re-renderização do React
export const ServiceTopologyNode = React.memo(ServiceTopologyNodeComponent, (prev, next) => {
  return (
    prev.selected === next.selected &&
    prev.data.status === next.data.status &&
    prev.data.isProcessing === next.data.isProcessing &&
    JSON.stringify(prev.data.metrics) === JSON.stringify(next.data.metrics)
  );
});
