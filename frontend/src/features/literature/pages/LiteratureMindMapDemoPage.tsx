import React from 'react';
import { Box, Container, Typography, Button, Breadcrumbs, Link, Chip } from '@mui/material';
import { ArrowLeft, Brain } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { LiteratureMindMap } from '../components/LiteratureMindMap';
import type { LiteratureNode, LiteratureEdge } from '../types';

export const LiteratureMindMapDemoPage: React.FC = () => {
  const navigate = useNavigate();

  // Dados de teste mockados representando o grafo de literatura
  const demoNodes: LiteratureNode[] = [
    // 1. Vaswani et al. (2017) - Attention Is All You Need
    {
      id: 'paper-vaswani-2017',
      type: 'paperNode',
      position: { x: 380, y: 50 },
      data: {
        id: 'paper-vaswani-2017',
        title: 'Attention Is All You Need',
        authors: ['Ashish Vaswani', 'Noam Shazeer', 'Niki Parmar', 'Jakob Uszkoreit'],
        year: 2017,
        venue: 'NeurIPS 2017',
        doi: '10.48550/arXiv.1706.03762',
        arxivUrl: 'https://arxiv.org/abs/1706.03762',
        pdfUrl: 'https://arxiv.org/pdf/1706.03762',
        executiveSummary:
          'Propõe a arquitetura Transformer baseada unicamente em mecanismos de atenção, eliminando completamente recorrências (RNNs) e convoluções.',
        studyType: 'Pesquisa Experimental Quantitativa',
        empiricalMetrics: '28.4 BLEU no WMT 2014 En-De e 41.8 BLEU no WMT En-Fr',
        strengths: [
          'Inovação arquitetural radical com paralelização massiva de treino',
          'Aceleração computacional drástica em relação a LSTMs',
          'Reprodutibilidade empírica validada em benchmarks oficiais',
        ],
        declaredLimitations: [
          'Complexidade de memória quadrática O(n²) com o comprimento da sequência',
        ],
        internalValidityThreats: [
          'Alta sensibilidade aos hiperparâmetros de aquecimento (warmup) e taxas de aprendizado',
        ],
        externalValidityThreats: [
          'Validação empírica inicial focada exclusivamente em tradução textual',
        ],
        relationType: 'baseline',
        relationLabel: 'Fundamentação Teórica Base',
        suggestedSections: ['Fundamentação Teórica', 'Introdução'],
      },
    },

    // 2. Devlin et al. (2018) - BERT
    {
      id: 'paper-devlin-2018',
      type: 'paperNode',
      position: { x: 50, y: 380 },
      data: {
        id: 'paper-devlin-2018',
        title: 'BERT: Pre-training of Deep Bidirectional Transformers',
        authors: ['Jacob Devlin', 'Ming-Wei Chang', 'Kenton Lee', 'Kristina Toutanova'],
        year: 2018,
        venue: 'NAACL 2019',
        doi: '10.48550/arXiv.1810.04805',
        arxivUrl: 'https://arxiv.org/abs/1810.04805',
        pdfUrl: 'https://arxiv.org/pdf/1810.04805',
        executiveSummary:
          'Apresenta o BERT, modelo pré-treinado bidirecional para representação de linguagem que alcançou SOTA em 11 tarefas de NLP.',
        studyType: 'Pesquisa Empírica com Pré-Treinamento em Larga Escala',
        empiricalMetrics: 'GLUE score de 80.5% (superior em 7.7% ao SOTA anterior)',
        strengths: [
          'Representação verdadeiramente bidirecional com Masked Language Model',
          'Capacidade superior de transferência de aprendizado (*fine-tuning*)',
        ],
        declaredLimitations: [
          'Custo de pré-treino extremamente alto exigindo infraestrutura de TPU Pods',
        ],
        internalValidityThreats: [
          'Discrepância entre pré-treino (com máscara [MASK]) e inferência (sem máscara)',
        ],
        relationType: 'evolution',
        relationLabel: 'Evolução de Encoder',
        suggestedSections: ['Trabalhos Relacionados', 'Fundamentação'],
      },
    },

    // 3. Kitaev et al. (2020) - Reformer
    {
      id: 'paper-kitaev-2020',
      type: 'paperNode',
      position: { x: 450, y: 400 },
      data: {
        id: 'paper-kitaev-2020',
        title: 'Reformer: The Efficient Transformer',
        authors: ['Nikita Kitaev', 'Lukasz Kaiser', 'Anselm Levskaya'],
        year: 2020,
        venue: 'ICLR 2020',
        doi: '10.48550/arXiv.2001.04451',
        arxivUrl: 'https://arxiv.org/abs/2001.04451',
        pdfUrl: 'https://arxiv.org/pdf/2001.04451',
        executiveSummary:
          'Introduz técnicas para reduzir a complexidade do Transformer de O(N²) para O(N log N) utilizando Locality-Sensitive Hashing (LSH) e camadas reversíveis.',
        studyType: 'Otimização Algorítmica e Validação Experimental',
        empiricalMetrics: 'Execução de sequências de até 64.000 tokens em uma única GPU de 16GB',
        strengths: [
          'Resolução elegante do gargalo de memória do Transformer original',
          'Viabilidade de contextos longos sem estourar VRAM',
        ],
        declaredLimitations: [
          'Pequena degradação de precisão em sequências curtas devido ao hashing probabilístico',
        ],
        internalValidityThreats: [
          'Trade-off entre número de hashes LSH e tempo de computação por etapa',
        ],
        relationType: 'evolution',
        relationLabel: 'Mitigação de Gargalo O(n²)',
        suggestedSections: ['Metodologia', 'Otimização'],
      },
    },

    // 4. Baseline Tradicional (LSTM / RNN)
    {
      id: 'paper-hochreiter-1997',
      type: 'paperNode',
      position: { x: 850, y: 250 },
      data: {
        id: 'paper-hochreiter-1997',
        title: 'Long Short-Term Memory (LSTM)',
        authors: ['Sepp Hochreiter', 'Jürgen Schmidhuber'],
        year: 1997,
        venue: 'Neural Computation',
        doi: '10.1162/neco.1997.9.8.1735',
        executiveSummary:
          'Proposta seminal de células de memória com portas de esquecimento para mitigar o problema do gradiente que desaparece em redes recorrentes.',
        studyType: 'Proposta Teórica e Arquitetural',
        strengths: [
          'Complexidade linear de inferência O(1) por token sequencial',
          'Baixo consumo de memória em tempo de execução',
        ],
        declaredLimitations: [
          'Gargalo estritamente sequencial que impede paralelismo no treino em GPUs modernas',
        ],
        relationType: 'divergent',
        relationLabel: 'Baseline Divergente',
        suggestedSections: ['Trabalhos Relacionados', 'Comparação'],
      },
    },

    // 5. Lacuna Científica (Gap Alert)
    {
      id: 'gap-robustness-edge',
      type: 'gapNode',
      position: { x: 420, y: 780 },
      data: {
        id: 'gap-robustness-edge',
        title: 'Atenção Eficiente sob Dados Ruidosos em Hardware de Borda',
        description:
          'A literatura atual foca quase exclusivamente em eficiência de servidores e datacenters (GPUs A100/H100), deixando escassos estudos empíricos sobre resiliência a ruído em micro-dispositivos IoT.',
        scope: 'Artigos analisados no período 2017–2024 no arXiv/NeurIPS',
        recommendedAction:
          'Posicione o seu manuscrito como o benchmark pioneiro de Transformers esparsos em nós de borda com ruído de rede.',
      },
    },

    // 6. Seções do Artigo do Autor
    {
      id: 'sec-intro',
      type: 'sectionNode',
      position: { x: 50, y: 700 },
      data: {
        id: 'sec-intro',
        sectionNumber: 'Seção 1',
        sectionTitle: 'Introdução & Problema',
        coverageStatus: 'well_covered',
        referencesCount: 2,
      },
    },
    {
      id: 'sec-fundamentacao',
      type: 'sectionNode',
      position: { x: 850, y: 650 },
      data: {
        id: 'sec-fundamentacao',
        sectionNumber: 'Seção 2',
        sectionTitle: 'Fundamentação Teórica',
        coverageStatus: 'well_covered',
        referencesCount: 3,
      },
    },
  ];

  const demoEdges: LiteratureEdge[] = [
    {
      id: 'e-vaswani-bert',
      source: 'paper-vaswani-2017',
      target: 'paper-devlin-2018',
      type: 'relationshipEdge',
      data: {
        relationType: 'evolution',
        label: 'Evolução Arquitetural',
      },
    },
    {
      id: 'e-vaswani-reformer',
      source: 'paper-vaswani-2017',
      target: 'paper-kitaev-2020',
      type: 'relationshipEdge',
      data: {
        relationType: 'evolution',
        label: 'Resolve Gargalo O(n²)',
      },
    },
    {
      id: 'e-vaswani-lstm',
      source: 'paper-vaswani-2017',
      target: 'paper-hochreiter-1997',
      type: 'relationshipEdge',
      data: {
        relationType: 'divergent',
        label: 'Supera Paradigma Sequencial',
      },
    },
    {
      id: 'e-reformer-gap',
      source: 'paper-kitaev-2020',
      target: 'gap-robustness-edge',
      type: 'relationshipEdge',
      data: {
        relationType: 'complementary',
        label: 'Deixa em Aberto',
      },
    },
    {
      id: 'e-bert-sec-intro',
      source: 'paper-devlin-2018',
      target: 'sec-intro',
      type: 'relationshipEdge',
      data: {
        relationType: 'convergent',
        label: 'Cobre Introdução',
      },
    },
    {
      id: 'e-vaswani-sec-fund',
      source: 'paper-vaswani-2017',
      target: 'sec-fundamentacao',
      type: 'relationshipEdge',
      data: {
        relationType: 'convergent',
        label: 'Cobre Fundamentação',
      },
    },
  ];

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      {/* Header com Navegação e Título */}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mb: 3 }}>
        <Breadcrumbs aria-label="breadcrumb">
          <Link
            underline="hover"
            color="inherit"
            href="#"
            onClick={(e) => {
              e.preventDefault();
              navigate('/articles');
            }}
          >
            Artigos
          </Link>
          <Typography color="text.primary">Literature Intelligence</Typography>
        </Breadcrumbs>

        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 0.5 }}>
              <Brain size={30} color="#1976d2" />
              <Typography variant="h5" sx={{ fontWeight: 800 }}>
                Mapa Mental de Literatura Científica
              </Typography>
              <Chip
                label="React Flow (@xyflow/react)"
                size="small"
                color="primary"
                variant="outlined"
                sx={{ fontWeight: 700, fontSize: '0.7rem' }}
              />
            </Box>
            <Typography variant="body2" color="text.secondary">
              Visualização interativa de relações conceituais, pontos fortes, limitações e cobertura do seu artigo LaTeX.
            </Typography>
          </Box>

          <Button
            variant="outlined"
            startIcon={<ArrowLeft size={16} />}
            onClick={() => navigate('/articles')}
            sx={{ textTransform: 'none' }}
          >
            Voltar aos Artigos
          </Button>
        </Box>
      </Box>

      {/* Canvas Interativo do Mapa Mental */}
      <LiteratureMindMap initialNodes={demoNodes} initialEdges={demoEdges} height="78vh" />
    </Container>
  );
};
