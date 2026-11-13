import type { Node, Edge } from '@xyflow/react';

export type LiteratureRelationType =
  | 'convergent'
  | 'divergent'
  | 'complementary'
  | 'evolution'
  | 'baseline';

export interface ScientificPaperNodeData extends Record<string, unknown> {
  id: string;
  title: string;
  authors: string[];
  year: number;
  venue?: string;
  doi?: string;
  arxivUrl?: string;
  pdfUrl?: string;
  executiveSummary?: string;
  studyType?: string;
  mainFindings?: string[];
  empiricalMetrics?: string;
  strengths: string[];
  declaredLimitations: string[];
  internalValidityThreats?: string[];
  externalValidityThreats?: string[];
  relationType: LiteratureRelationType;
  relationLabel?: string;
  suggestedSections?: string[];
  onSelectPaper?: (paper: ScientificPaperNodeData) => void;
}

export interface GapNodeData extends Record<string, unknown> {
  id: string;
  title: string;
  description: string;
  scope: string;
  recommendedAction?: string;
}

export interface SectionAnchorNodeData extends Record<string, unknown> {
  id: string;
  sectionNumber: string;
  sectionTitle: string;
  coverageStatus: 'well_covered' | 'partial' | 'insufficient';
  referencesCount: number;
}

export type LiteratureNode =
  | Node<ScientificPaperNodeData, 'paperNode'>
  | Node<GapNodeData, 'gapNode'>
  | Node<SectionAnchorNodeData, 'sectionNode'>;

export interface RelationshipEdgeData extends Record<string, unknown> {
  relationType: LiteratureRelationType;
  label: string;
  description?: string;
}

export type LiteratureEdge = Edge<RelationshipEdgeData>;
