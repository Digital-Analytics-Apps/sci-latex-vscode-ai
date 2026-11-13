# 📐 Especificação Técnica: SCIA Literature Intelligence (`literature-intelligence-spec.md`)

> **Documento de Referência:** [`ADR-016: Arquitetura de Literature Intelligence e React Flow`](file:///home/gilson-russo/development/professional/sci-latex-vscode/docs/planning/adrs/adr-016-scia-literature-intelligence-paper-analysis-and-react-flow.md)  
> **Status:** APROVADO / EM IMPLEMENTAÇÃO  
> **Data:** Novembro de 2026  
> **Componentes:** `ai-service` (FastAPI / LangGraph / DeepAgents), `backend` (Fastify / TypeScript), `frontend` (React 19 / Vite / `@xyflow/react`)

---

## 1. 📋 Visão Geral

O módulo **Literature Intelligence** transforma a pesquisa científica no SCIA em conhecimento acionável para o autor. A funcionalidade é composta por três capacidades principais:
1. **Scientific Paper Intelligence:** Compreensão individual estruturada de cada publicação com extração de metadados, problema, metodologia, evidências empíricas, **pontos fortes** e **limitações (declaradas e ameaças à validade)**.
2. **Research Relationship Intelligence:** Comparação de múltiplos artigos e visualização do mapa mental interativo com `@xyflow/react`.
3. **Research Alignment:** Diagnóstico de aderência e cobertura das seções do manuscrito LaTeX em desenvolvimento pelo autor.

---

## 2. 🔌 Contratos de API (FastAPI `ai-service`)

### 2.1. Análise Individual de Artigo (`POST /internal/v1/papers/analyze`)

- **Headers:** `Content-Type: application/json`
- **Request Body (`PaperAnalysisRequest`):**
```json
{
  "title": "Attention Is All You Need",
  "abstract": "The dominant sequence transduction models are based on complex recurrent or convolutional neural networks...",
  "authors": ["Ashish Vaswani", "Noam Shazeer"],
  "year": 2017,
  "venue": "NeurIPS 2017",
  "doi": "10.48550/arXiv.1706.03762",
  "arxiv_url": "https://arxiv.org/abs/1706.03762",
  "pdf_url": "https://arxiv.org/pdf/1706.03762",
  "author_topic": "Modelos Fundacionais e Transformers em Processamento de Linguagem Natural"
}
```

- **Response Body (`ScientificPaperAnalysis`):**
```json
{
  "metadata": {
    "title": "Attention Is All You Need",
    "authors": ["Ashish Vaswani", "Noam Shazeer"],
    "year": 2017,
    "venue": "NeurIPS 2017",
    "doi": "10.48550/arXiv.1706.03762",
    "arxiv_url": "https://arxiv.org/abs/1706.03762",
    "pdf_url": "https://arxiv.org/pdf/1706.03762"
  },
  "executive_summary": "Propõe a arquitetura Transformer baseada unicamente em auto-atenção...",
  "problem_and_objectives": {
    "research_question": "É possível realizar transdução de sequências com alta eficiência sem recorrência?",
    "theoretical_gap": "Gargalo sequencial das RNNs que inviabiliza paralelização massiva.",
    "objectives": [
      "Eliminar convoluções e recorrência da arquitetura",
      "Reduzir drasticamente o tempo computacional de treino"
    ]
  },
  "methodology": {
    "study_type": "Pesquisa Experimental Quantitativa",
    "dataset_sample": "WMT 2014 English-German e WMT 2014 English-French",
    "instruments_methods": "Mecanismo Multi-Head Attention com codificação posicional",
    "analysis_techniques": "Avaliação BLEU e cálculo de FLOPS"
  },
  "findings": {
    "main_results": [
      "Superou modelos baseados em LSTM em qualidade de tradução",
      "Treinamento completado em 3.5 dias em 8 GPUs"
    ],
    "empirical_metrics": "28.4 BLEU (En-De) e 41.8 BLEU (En-Fr)",
    "hypotheses_corroborated": true
  },
  "critique": {
    "strengths": [
      "Inovação conceitual radical ao estabelecer novo paradigma de atenção",
      "Paralelização massiva do processo de treino",
      "Reprodutibilidade empírica validada em benchmarks oficiais"
    ],
    "declared_limitations": [
      "Complexidade de memória quadrática O(n^2) com sequências longas"
    ],
    "internal_validity_threats": [
      "Sensibilidade a hiperparâmetros de aquecimento e taxas de aprendizado"
    ],
    "external_validity_threats": [
      "Validação restrita inicialmente a tradução automática textual"
    ]
  },
  "contributions": {
    "theoretical_advance": "Prova de que a atenção é suficiente para modelagem de sequências",
    "practical_implications": "Base fundacional de todos os LLMs modernos",
    "future_work": [
      "Aplicação a domínios multimodais (visão, áudio e vídeo)",
      "Mecanismos de atenção local para sequências ultra-longas"
    ]
  },
  "alignment": {
    "relation_type": "theoretical_foundation",
    "suggested_sections": [
      "Introdução",
      "Fundamentação Teórica",
      "Trabalhos Relacionados"
    ],
    "synthesis_note": "Leitura obrigatória para fundamentar a escolha de mecanismos de atenção."
  }
}
```

### 2.2. Análise em Lote (`POST /internal/v1/papers/analyze-batch`)
- Recebe uma lista de `PaperAnalysisRequest` e retorna `List[ScientificPaperAnalysis]`.

---

## 3. 🎨 Visualização do Mapa Mental com React Flow (`@xyflow/react`)

### 3.1. Tipos de Nós Customizados (`NodeTypes`)
* `paperNode`: Card de artigo com título, chips de pontos fortes (verde), limitações (vermelho) e link para o PDF.
* `themeNode`: Agrupamento temático ou tópico guarda-chuva.
* `gapNode`: Alerta visual destacando uma possível lacuna identificada na literatura.

### 3.2. Tipos de Conexões Semânticas (`EdgeTypes`)
* `convergent`: Linha contínua azul com label "Convergência".
* `divergent`: Linha tracejada âmbar com label "Divergência".
* `complementary`: Linha pontilhada verde com label "Complementar".
* `baseline`: Linha sólida com seta indicando extensão metodológica.

### 3.3. Algoritmo de Auto-Layout
* O grafo utiliza o layout hierárquico via biblioteca `dagre` para evitar cruzamentos e organizar os artigos cronológica ou metodologicamente.
