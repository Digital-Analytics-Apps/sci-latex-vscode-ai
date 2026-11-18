import type { Edge, Node } from '@xyflow/react';

export type ServiceStatus = 'UP' | 'DEGRADED' | 'DOWN';

export type ServiceCategory = 'frontend' | 'gateway' | 'service' | 'storage' | 'observability';

export interface ServiceMetricItem {
  label: string;
  value: string | number;
  highlight?: boolean;
}

export interface ServiceNodeData extends Record<string, unknown> {
  id: string;
  name: string;
  subTitle: string;
  category: ServiceCategory;
  status: ServiceStatus;
  metrics: ServiceMetricItem[];
  grafanaUrl?: string;
  isProcessing?: boolean;
  onInvestigate?: (serviceId: string) => void;
}

export type ServiceNode = Node<ServiceNodeData, 'serviceNode'>;

export interface CommunicationEdgeData extends Record<string, unknown> {
  protocol: string;
  description?: string;
  latency?: string;
  throughput?: string;
  status?: 'healthy' | 'warning' | 'error';
  showParticles?: boolean;
  particleColor?: string;
  particleSpeedSeconds?: number;
  isTransmitting?: boolean;
  activeDirection?: 'forward' | 'backward' | 'both';
}

export type CommunicationEdge = Edge<CommunicationEdgeData, 'communicationEdge'>;

export interface TraceStep {
  edgeId: string;
  sourceNodeId: string;
  targetNodeId: string;
  direction: 'forward' | 'backward';
  description: string;
  durationMs: number;
  particleColor?: string;
  processingNodeIds?: string[];
}

export interface RequestSimulationScenario {
  id: string;
  name: string;
  iconName: 'compiler' | 'sciai' | 'collab';
  description: string;
  steps: TraceStep[];
}
