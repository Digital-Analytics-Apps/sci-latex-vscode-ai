---
name: scientific-article-analysis
description: Procedimento especializado para conduzir análise crítica de artigos científicos, avaliar rigor metodológico, sintetizar resultados, identificar limitações e formatar relatórios acadêmicos estruturados. Use esta skill sempre que o usuário solicitar análise, síntese, revisão bibliográfica ou avaliação de artigos científicos.
---

# Análise de Artigos Científicos

## Visão Geral
Esta skill orienta o processo de leitura crítica, avaliação metodológica e síntese de artigos acadêmicos. O objetivo é assegurar análises imparciais, fundamentadas em evidências e estruturadas segundo os padrões de comunicação científica.

## Procedimento de Análise Passo a Passo

Ao receber artigos ou resumos obtidos através de ferramentas de busca científica (como `search_arxiv_articles`), siga rigorosamente as etapas abaixo:

### 1. Extração de Metadados e Contexto
Identifique e registre os elementos essenciais de identificação:
- **Título Completo**
- **Autores e Filiação Institucional** (quando disponível)
- **Ano de Publicação**
- **Periódico ou Conferência**
- **Identificador Digital (DOI)** e URL permanente

### 2. Formulação do Problema e Objetivos
- Identifique a questão central de pesquisa que o estudo visa responder.
- Descreva a lacuna teórica ou prática na literatura existente que motivou a investigação.
- Resuma as hipóteses formuladas ou os objetivos primários e secundários.

### 3. Metodologia e Desenho do Estudo
Avalie como a investigação foi estruturada:
- **Tipo de Estudo**: Qualitativo, quantitativo, experimental, quase-experimental, revisão sistemática, meta-análise ou estudo de caso.
- **Amostra / Conjunto de Dados**: Tamanho da amostra, representatividade, fonte dos dados e critérios de inclusão/exclusão.
- **Instrumentos e Métodos de Coleta**: Questionários, medições, sensores, benchmarks, algoritmos.
- **Técnicas de Análise**: Testes estatísticos empregados, modelos econométricos, arquiteturas de aprendizado de máquina, etc.

### 4. Principais Resultados e Evidências
- Destaque as descobertas centrais suportadas por dados concretos (valores, métricas, significância estatística).
- Diferencie os resultados empíricos das interpretações subjetivas dos autores.
- Aponte se as hipóteses iniciais foram corroboradas ou refutadas.

### 5. Limitações e Ameaças à Validade
Avalie criticamente os pontos vulneráveis do artigo:
- Limitações explicitadas pelos próprios autores (tamanho amostral, premissas restritivas, etc.).
- Ameaças à validade interna (fatores de confusão não controlados, viés de seleção).
- Ameaças à validade externa (capacidade de generalização para outros contextos ou populações).

### 6. Contribuições e Implicações
- **Avanço Teórico**: Como o estudo modifica ou consolida modelos conceituais existentes.
- **Aplicações Práticas**: O que esses resultados significam para profissionais, desenvolvedores ou formuladores de políticas.
- **Trabalhos Futuros**: Direções de pesquisa sugeridas pelos autores.

---

## Formato do Relatório Acadêmico

Quando a análise de um ou mais artigos for concluída, estruture a saída no seguinte padrão Markdown e utilize a ferramenta `write_file` para salvar o documento dentro da pasta `reports/` (exemplo: `reports/relatorio_<tema>.md`):

```markdown
# Relatório de Análise Científica: [Tema da Pesquisa]

**Data da Análise:** [AAAA-MM-DD]  
**Agente Responsável:** Research Assistant (Deep Agents)  

---

## 1. Visão Geral e Artigos Selecionados
[Resumo executivo do levantamento bibliográfico e tabela comparativa dos artigos com Título, Autores, Ano e DOI]

## 2. Síntese dos Artigos Analisados
### Artigo 1: [Título do Artigo]
- **Objetivo:** [Descrição concisa]
- **Metodologia:** [Descrição metodológica]
- **Principais Descobertas:** [Evidências e métricas]
- **Limitações:** [Pontos de atenção]

## 3. Análise Crítica Comparativa
[Síntese convergente e divergente entre os estudos encontrados, identificando consensos e controvérsias na literatura]

## 4. Conclusão e Recomendações
[Resumo das implicações do tema e direções para pesquisas futuras]

---
## Referências
- [Lista em formato ABNT ou APA de todas as obras citadas com links e DOIs]
```
