import { Box } from '@mui/material';
import {
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  ReactFlow,
  useEdgesState,
  useNodesState,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import React, { useEffect, useMemo } from 'react';
import type { AdminCollaborationData, AdminInfrastructureData } from '../../api/adminCenterApi';
import { LiveCommunicationEdge } from './LiveCommunicationEdge';
import { ServiceTopologyNode } from './ServiceTopologyNode';
import { buildTopologyNodesAndEdges } from './topologyConfig';
import type { TraceStep } from './types';

export interface ServiceTopologyFlowProps {
  width?: number;
  height?: number;
  infraData?: AdminInfrastructureData;
  collabData?: AdminCollaborationData;
  activeTraceStep?: TraceStep | null;
  activeProcessingNodeIds?: string[];
}

const ServiceTopologyFlowComponent: React.FC<ServiceTopologyFlowProps> = ({
  width,
  height,
  infraData,
  collabData,
  activeTraceStep = null,
  activeProcessingNodeIds = [],
}) => {
  const { nodes: initialNodes, edges: initialEdges } = useMemo(
    () =>
      buildTopologyNodesAndEdges(
        infraData,
        collabData,
        activeTraceStep,
        activeProcessingNodeIds
      ),
    [infraData, collabData, activeTraceStep, activeProcessingNodeIds]
  );

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  // Sincroniza nós e arestas quando as queries recebem novos dados ou uma etapa de tráfego ocorre
  useEffect(() => {
    const updated = buildTopologyNodesAndEdges(
      infraData,
      collabData,
      activeTraceStep,
      activeProcessingNodeIds
    );
    setNodes(updated.nodes);
    setEdges(updated.edges);
  }, [
    infraData,
    collabData,
    activeTraceStep,
    activeProcessingNodeIds,
    setNodes,
    setEdges,
  ]);

  const nodeTypes = useMemo(
    () => ({
      serviceNode: ServiceTopologyNode,
    }),
    []
  );

  const edgeTypes = useMemo(
    () => ({
      communicationEdge: LiveCommunicationEdge,
    }),
    []
  );

  return (
    <Box
      sx={{
        width: width ? `${width}px` : '100%',
        height: height ? `${height}px` : '100%',
        position: 'relative',
        borderRadius: 2,
        overflow: 'hidden',
        border: '1px solid',
        borderColor: 'divider',
        backgroundColor: 'background.default',
        '& .react-flow__edge-path': {
          animation: 'flowAnimation 1.5s linear infinite !important',
        },
        '@keyframes flowAnimation': {
          to: {
            strokeDashoffset: -20,
          },
        },
      }}
    >
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.25}
        maxZoom={1.6}
        defaultEdgeOptions={{ animated: true }}
      >
        <Background variant={BackgroundVariant.Dots} gap={24} size={1.2} color="#94a3b8" />
        <Controls showInteractive={false} position="top-right" />
        <MiniMap
          position="bottom-right"
          nodeColor={(node) => {
            const status = (node.data as any)?.status;
            if (status === 'DOWN') return '#ef4444';
            if (status === 'DEGRADED') return '#f59e0b';
            return '#22c55e';
          }}
          maskColor="rgba(0, 0, 0, 0.08)"
          style={{
            borderRadius: 8,
            border: '1px solid #cbd5e1',
          }}
        />
      </ReactFlow>
    </Box>
  );
};

export const ServiceTopologyFlow = React.memo(ServiceTopologyFlowComponent);
