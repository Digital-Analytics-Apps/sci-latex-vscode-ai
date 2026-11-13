import React from 'react';
import {
  BaseEdge,
  EdgeLabelRenderer,
  getBezierPath,
  type EdgeProps,
} from '@xyflow/react';
import { Box, Chip } from '@mui/material';
import type { LiteratureEdge } from '../types';

export const RelationshipEdge: React.FC<EdgeProps<LiteratureEdge>> = ({
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
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  const relationType = data?.relationType || 'convergent';
  const label = data?.label || '';

  const getEdgeStyle = () => {
    switch (relationType) {
      case 'divergent':
        return { stroke: '#d32f2f', strokeDasharray: '5,5', strokeWidth: 2, bg: '#ffebee', color: '#c62828' };
      case 'complementary':
        return { stroke: '#2e7d32', strokeDasharray: '3,3', strokeWidth: 2, bg: '#e8f5e9', color: '#1b5e20' };
      case 'evolution':
        return { stroke: '#0288d1', strokeWidth: 2.5, bg: '#e1f5fe', color: '#01579b' };
      case 'baseline':
        return { stroke: '#7b1fa2', strokeWidth: 2, bg: '#f3e5f5', color: '#4a148c' };
      default:
        return { stroke: '#1976d2', strokeWidth: 2, bg: '#e3f2fd', color: '#0d47a1' };
    }
  };

  const styleConfig = getEdgeStyle();

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        markerEnd={markerEnd}
        style={{
          ...style,
          stroke: styleConfig.stroke,
          strokeWidth: styleConfig.strokeWidth,
          strokeDasharray: styleConfig.strokeDasharray,
        }}
      />
      {label && (
        <EdgeLabelRenderer>
          <Box
            sx={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
              pointerEvents: 'all',
              zIndex: 10,
            }}
            className="nodrag nopan"
          >
            <Chip
              label={label}
              size="small"
              sx={{
                height: 20,
                fontSize: '0.62rem',
                fontWeight: 700,
                bgcolor: styleConfig.bg,
                color: styleConfig.color,
                border: `1px solid ${styleConfig.stroke}`,
                boxShadow: '0 2px 6px rgba(0,0,0,0.08)',
              }}
            />
          </Box>
        </EdgeLabelRenderer>
      )}
    </>
  );
};
