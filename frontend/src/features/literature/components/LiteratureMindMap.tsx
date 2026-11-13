import React, { useMemo, useState } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  Panel,
  BackgroundVariant,
  useNodesState,
  useEdgesState,
  type NodeTypes,
  type EdgeTypes,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import {
  Box,
  Paper,
  Typography,
  Chip,
  IconButton,
  Tooltip,
} from '@mui/material';
import { Filter, RotateCcw } from 'lucide-react';

import { PaperNode } from './PaperNode';
import { GapNode } from './GapNode';
import { SectionAnchorNode } from './SectionAnchorNode';
import { RelationshipEdge } from './RelationshipEdge';
import { PaperAnalysisDrawer } from './PaperAnalysisDrawer';
import type { LiteratureNode, LiteratureEdge, ScientificPaperNodeData } from '../types';

interface LiteratureMindMapProps {
  initialNodes: LiteratureNode[];
  initialEdges: LiteratureEdge[];
  height?: string | number;
}

export const LiteratureMindMap: React.FC<LiteratureMindMapProps> = ({
  initialNodes,
  initialEdges,
  height = '80vh',
}) => {
  const [selectedPaper, setSelectedPaper] = useState<ScientificPaperNodeData | null>(null);
  const [filterType, setFilterType] = useState<string>('ALL');

  // Conecta o callback de seleção de artigo nos nós do tipo 'paperNode'
  const enrichedInitialNodes = useMemo(() => {
    return initialNodes.map((node) => {
      if (node.type === 'paperNode') {
        return {
          ...node,
          data: {
            ...node.data,
            onSelectPaper: (paper: ScientificPaperNodeData) => setSelectedPaper(paper),
          },
        };
      }
      return node;
    });
  }, [initialNodes]);

  const [nodes, , onNodesChange] = useNodesState(enrichedInitialNodes);
  const [edges, , onEdgesChange] = useEdgesState(initialEdges);

  // Mapeamento imutável de tipos para evitar renderizações redundantes do React Flow
  const nodeTypes: NodeTypes = useMemo(
    () => ({
      paperNode: PaperNode,
      gapNode: GapNode,
      sectionNode: SectionAnchorNode,
    }),
    []
  );

  const edgeTypes: EdgeTypes = useMemo(
    () => ({
      relationshipEdge: RelationshipEdge,
    }),
    []
  );

  // Filtragem visual dos nós
  const filteredNodes = useMemo(() => {
    if (filterType === 'ALL') return nodes;
    if (filterType === 'GAPS_ONLY') return nodes.filter((n) => n.type === 'gapNode');
    if (filterType === 'PAPERS_ONLY') return nodes.filter((n) => n.type === 'paperNode');
    if (filterType === 'SECTIONS_ONLY') return nodes.filter((n) => n.type === 'sectionNode');
    return nodes;
  }, [nodes, filterType]);

  return (
    <Box sx={{ width: '100%', height, position: 'relative', bgcolor: 'background.default', borderRadius: 3, overflow: 'hidden', border: '1px solid rgba(0,0,0,0.1)' }}>
      <ReactFlow
        nodes={filteredNodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView
        attributionPosition="bottom-left"
      >
        <Background variant={BackgroundVariant.Dots} gap={16} size={1} color="#cbd5e1" />
        <Controls position="top-right" />
        <MiniMap
          position="bottom-right"
          nodeStrokeWidth={3}
          zoomable
          pannable
          style={{
            height: 110,
            width: 150,
            backgroundColor: '#f8fafc',
            borderRadius: 8,
            border: '1px solid #e2e8f0',
          }}
        />

        {/* Painel Superior: Filtros e Controles */}
        <Panel position="top-left">
          <Paper
            elevation={3}
            sx={{
              p: 1.5,
              borderRadius: 2,
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              bgcolor: 'background.paper',
              border: '1px solid rgba(0,0,0,0.08)',
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Filter size={16} color="#64748b" />
              <Typography variant="caption" sx={{ fontWeight: 700, mr: 0.5 }}>
                Visualização:
              </Typography>
              <Chip
                label="Todos"
                size="small"
                clickable
                color={filterType === 'ALL' ? 'primary' : 'default'}
                onClick={() => setFilterType('ALL')}
                sx={{ height: 24, fontSize: '0.72rem' }}
              />
              <Chip
                label="Apenas Artigos"
                size="small"
                clickable
                color={filterType === 'PAPERS_ONLY' ? 'primary' : 'default'}
                onClick={() => setFilterType('PAPERS_ONLY')}
                sx={{ height: 24, fontSize: '0.72rem' }}
              />
              <Chip
                label="Apenas Lacunas (Gaps)"
                size="small"
                clickable
                color={filterType === 'GAPS_ONLY' ? 'warning' : 'default'}
                onClick={() => setFilterType('GAPS_ONLY')}
                sx={{ height: 24, fontSize: '0.72rem' }}
              />
              <Chip
                label="Seções do Manuscrito"
                size="small"
                clickable
                color={filterType === 'SECTIONS_ONLY' ? 'secondary' : 'default'}
                onClick={() => setFilterType('SECTIONS_ONLY')}
                sx={{ height: 24, fontSize: '0.72rem' }}
              />

              <Tooltip title="Resetar Filtros">
                <IconButton size="small" onClick={() => setFilterType('ALL')}>
                  <RotateCcw size={14} />
                </IconButton>
              </Tooltip>
            </Box>
          </Paper>
        </Panel>
      </ReactFlow>

      {/* Drawer com a Ficha Científica Completa */}
      <PaperAnalysisDrawer
        paper={selectedPaper}
        open={Boolean(selectedPaper)}
        onClose={() => setSelectedPaper(null)}
      />
    </Box>
  );
};
