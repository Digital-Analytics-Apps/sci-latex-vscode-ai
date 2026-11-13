import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PaperNode } from './components/PaperNode';
import { GapNode } from './components/GapNode';
import { SectionAnchorNode } from './components/SectionAnchorNode';
import type { ScientificPaperNodeData, GapNodeData, SectionAnchorNodeData } from './types';

// Mock do Handle do React Flow para testes em ambiente JSDOM
vi.mock('@xyflow/react', async () => {
  const actual = await vi.importActual('@xyflow/react');
  return {
    ...actual,
    Handle: () => <div data-testid="flow-handle" />,
  };
});

const defaultNodeProps = {
  selected: false,
  zIndex: 1,
  isConnectable: true,
  positionAbsoluteX: 0,
  positionAbsoluteY: 0,
  dragging: false,
  draggable: true,
  deletable: true,
  selectable: true,
};

describe('Literature Mind Map Components', () => {
  it('renders PaperNode with title, strengths and limitations', () => {
    const handleSelect = vi.fn();
    const paperData: ScientificPaperNodeData = {
      id: 'paper-1',
      title: 'Attention Is All You Need',
      authors: ['Ashish Vaswani', 'Noam Shazeer'],
      year: 2017,
      venue: 'NeurIPS',
      strengths: ['Paralelização massiva do treinamento'],
      declaredLimitations: ['Complexidade quadrática de memória O(n²)'],
      relationType: 'baseline',
      relationLabel: 'Fundamentação Teórica',
      onSelectPaper: handleSelect,
    };

    render(
      <PaperNode
        id="paper-1"
        data={paperData}
        type="paperNode"
        {...defaultNodeProps}
      />
    );

    expect(screen.getByText('Attention Is All You Need')).toBeDefined();
    expect(screen.getByText(/Paralelização massiva/)).toBeDefined();
    expect(screen.getByText(/Complexidade quadrática/)).toBeDefined();
    expect(screen.getByText('2017')).toBeDefined();

    // Clica no botão de inspeção
    const inspectBtn = screen.getByText('Inspecionar Ficha Completa');
    fireEvent.click(inspectBtn);
    expect(handleSelect).toHaveBeenCalledWith(paperData);
  });

  it('renders GapNode with alert information and recommended opportunity', () => {
    const gapData: GapNodeData = {
      id: 'gap-1',
      title: 'Atenção Eficiente sob Dados Ruidosos em IoT',
      description: 'Poucos estudos avaliam robustez adversarial em tempo real.',
      scope: 'Artigos NeurIPS 2017-2024',
      recommendedAction: 'Explorar Transformers em hardware de borda.',
    };

    render(
      <GapNode
        id="gap-1"
        data={gapData}
        type="gapNode"
        {...defaultNodeProps}
      />
    );

    expect(screen.getByText('Atenção Eficiente sob Dados Ruidosos em IoT')).toBeDefined();
    expect(screen.getByText('Lacuna de Pesquisa (SciAI)')).toBeDefined();
    expect(screen.getByText(/Poucos estudos avaliam/)).toBeDefined();
    expect(screen.getByText(/Explorar Transformers/)).toBeDefined();
  });

  it('renders SectionAnchorNode with coverage badge', () => {
    const sectionData: SectionAnchorNodeData = {
      id: 'sec-1',
      sectionNumber: 'Seção 2',
      sectionTitle: 'Fundamentação Teórica',
      coverageStatus: 'well_covered',
      referencesCount: 4,
    };

    render(
      <SectionAnchorNode
        id="sec-1"
        data={sectionData}
        type="sectionNode"
        {...defaultNodeProps}
      />
    );

    expect(screen.getByText('Fundamentação Teórica')).toBeDefined();
    expect(screen.getByText('Bem Coberta')).toBeDefined();
    expect(screen.getByText('4 artigos')).toBeDefined();
  });
});
