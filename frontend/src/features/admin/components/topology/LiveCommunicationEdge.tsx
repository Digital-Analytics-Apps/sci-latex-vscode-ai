import { Box, Chip, Stack, Tooltip } from '@mui/material';
import { BaseEdge, EdgeLabelRenderer, type EdgeProps, getSmoothStepPath } from '@xyflow/react';
import React from 'react';
import type { CommunicationEdge } from './types';

const LiveCommunicationEdgeComponent: React.FC<EdgeProps<CommunicationEdge>> = ({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  style,
  markerEnd,
}) => {
  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
    borderRadius: 20,
  });

  const protocol = data?.protocol || 'TCP';
  const description = data?.description || '';
  const latency = data?.latency;
  const throughput = data?.throughput;
  const status = data?.status || 'healthy';
  const isTransmitting = Boolean(data?.isTransmitting);
  const activeDirection = data?.activeDirection || 'forward';
  const customColor = data?.particleColor;
  const speed = `${data?.particleSpeedSeconds || 1.4}s`;

  const getEdgeColors = () => {
    switch (status) {
      case 'warning':
        return {
          stroke: isTransmitting ? '#f59e0b' : '#f59e0b',
          strokeWidth: isTransmitting ? 3.5 : 2.2,
          bgColor: '#fffbeb',
          borderColor: '#fcd34d',
          textColor: '#b45309',
          particle: customColor || '#f59e0b',
        };
      case 'error':
        return {
          stroke: '#ef4444',
          strokeWidth: isTransmitting ? 4 : 2.5,
          bgColor: '#fef2f2',
          borderColor: '#fca5a5',
          textColor: '#b91c1c',
          particle: customColor || '#ef4444',
        };
      case 'healthy':
      default:
        return {
          stroke: isTransmitting ? '#38bdf8' : '#6366f1',
          strokeWidth: isTransmitting ? 3.5 : 2.2,
          bgColor: isTransmitting ? '#f0f9ff' : '#f5f3ff',
          borderColor: isTransmitting ? '#7dd3fc' : '#c7d2fe',
          textColor: isTransmitting ? '#0284c7' : '#4338ca',
          particle: customColor || '#38bdf8',
        };
    }
  };

  const colors = getEdgeColors();

  return (
    <>
      {/* Linha Base SVG da Conexão com Estilo Vibrante Roxo/Azul */}
      <BaseEdge
        id={id}
        path={edgePath}
        markerEnd={markerEnd}
        style={{
          ...style,
          stroke: isTransmitting ? colors.particle : colors.stroke,
          strokeWidth: colors.strokeWidth,
          strokeDasharray: isTransmitting ? '8,4' : status === 'error' ? '6,4' : '6,4',
          filter: isTransmitting
            ? 'drop-shadow(0 0 6px rgba(56, 189, 248, 0.8))'
            : status === 'healthy'
              ? 'drop-shadow(0 0 2px rgba(99, 102, 241, 0.35))'
              : undefined,
          transition: 'stroke 0.3s ease, stroke-width 0.3s ease, filter 0.3s ease',
        }}
      />

      {/* Partícula / Ponto Animado de Ida (Forward: Source -> Target) - APENAS durante transmissão */}
      {isTransmitting && (activeDirection === 'forward' || activeDirection === 'both') && (
        <g>
          <circle r={7} fill={colors.particle} opacity={0.4}>
            <animateMotion dur={speed} repeatCount="indefinite" path={edgePath} rotate="auto" />
          </circle>
          <circle r={4.5} fill="#ffffff" stroke={colors.particle} strokeWidth={2}>
            <animateMotion dur={speed} repeatCount="indefinite" path={edgePath} rotate="auto" />
          </circle>
        </g>
      )}

      {/* Partícula / Ponto Animado de Volta (Backward: Target -> Source) - APENAS durante transmissão */}
      {isTransmitting && (activeDirection === 'backward' || activeDirection === 'both') && (
        <g>
          <circle r={7} fill={colors.particle} opacity={0.4}>
            <animateMotion
              dur={speed}
              repeatCount="indefinite"
              path={edgePath}
              keyPoints="1;0"
              keyTimes="0;1"
              calcMode="linear"
              rotate="auto"
            />
          </circle>
          <circle r={4.5} fill="#ffffff" stroke={colors.particle} strokeWidth={2}>
            <animateMotion
              dur={speed}
              repeatCount="indefinite"
              path={edgePath}
              keyPoints="1;0"
              keyTimes="0;1"
              calcMode="linear"
              rotate="auto"
            />
          </circle>
        </g>
      )}

      {/* Badge Flutuante no Meio da Aresta */}
      <EdgeLabelRenderer>
        <Box
          sx={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            pointerEvents: 'all',
            zIndex: 10,
          }}
        >
          <Tooltip title={description || `${protocol} - ${throughput || ''}`} arrow>
            <Box
              sx={{
                px: 1,
                py: 0.25,
                borderRadius: 2,
                backgroundColor: colors.bgColor,
                border: '1.5px solid',
                borderColor: colors.borderColor,
                boxShadow: isTransmitting ? 4 : 1,
                display: 'flex',
                alignItems: 'center',
                gap: 0.5,
                cursor: 'pointer',
                transition: 'all 0.2s ease-in-out',
                transform: isTransmitting ? 'scale(1.12)' : 'none',
                '&:hover': {
                  transform: 'scale(1.12)',
                  boxShadow: 3,
                },
              }}
            >
              <Chip
                label={protocol}
                size="small"
                sx={{
                  height: 18,
                  fontSize: '0.65rem',
                  fontWeight: 700,
                  bgcolor: colors.borderColor,
                  color: colors.textColor,
                  '& .MuiChip-label': { px: 0.75 },
                }}
              />
              {latency && (
                <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
                  <Box
                    component="span"
                    sx={{
                      fontSize: '0.65rem',
                      fontWeight: 600,
                      color: colors.textColor,
                    }}
                  >
                    {latency}
                  </Box>
                </Stack>
              )}
            </Box>
          </Tooltip>
        </Box>
      </EdgeLabelRenderer>
    </>
  );
};

// Otimização estrita de re-renderização
export const LiveCommunicationEdge = React.memo(LiveCommunicationEdgeComponent, (prev, next) => {
  return (
    prev.sourceX === next.sourceX &&
    prev.sourceY === next.sourceY &&
    prev.targetX === next.targetX &&
    prev.targetY === next.targetY &&
    prev.data?.isTransmitting === next.data?.isTransmitting &&
    prev.data?.status === next.data?.status &&
    prev.data?.throughput === next.data?.throughput &&
    prev.data?.latency === next.data?.latency
  );
});
