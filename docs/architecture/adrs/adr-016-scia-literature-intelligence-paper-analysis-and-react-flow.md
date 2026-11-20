# ADR 016: Arquitetura de Literature Intelligence, Auditoria Crítica de Artigos Científicos e Mapa Mental com React Flow (`@xyflow/react`)

- **Status:** APROVADO / EM IMPLEMENTAÇÃO
- **Data:** 12 de Novembro de 2026
- **Autor(es):** Equipe de Engenharia, Inteligência Artificial e Arquitetura SCIA
- **Domínio:** Inteligência Artificial Científica, Literature Intelligence, Visualização de Grafos/Mapas Mentais, Contratos M2M e Licenciamento Corporativo
- **Componentes Relacionados:** `ai-service` (FastAPI / LangGraph / DeepAgents), `backend` (Fastify / Prisma / PostgreSQL), `frontend` (React 19 / Vite / `@xyflow/react`), `docs/planejamento de novas features/literature-intelligence`

---

## 1. Contexto & Motivação

A rotina de produção de artigos científicos no SCIA exige muito mais do que a recuperação e geração de resumos genéricos de PDFs. Pesquisadores e coautores enfrentam gargalos críticos durante o levantamento bibliográfico e a redação da fundamentação teórica:
1. **Compreensão Crítica Rápida:** Dificuldade em identificar rapidamente o real rigor metodológico, hipóteses corroboradas e limitações intrínsecas de múltiplos artigos sem ler integralmente dezenas de páginas técnicas.
2. **Identificação de Pontos Fortes e Fracos (Auditoria Metodológica):** Necessidade de separar fatos empíricos (dados concretos, métricas estatísticas) de interpretações subjetivas dos autores, identificando tanto as limitações explicitadas quanto ameaças à validade interna e externa (tamanho amostral, variáveis de confusão, restrições de generalização).
3. **Visão Relacional e Mapa Mental da Literatura:** A compreensão do estado da arte não é linear; artigos convergem, divergem metodologicamente, complementam abordagens anteriores ou evidenciam lacunas de pesquisa (*research gaps*).
4. **Alinhamento com o Manuscrito do Autor:** Falta de conexão direta entre os artigos analisados e as seções específicas que o autor está escrevendo no editor LaTeX (`main.tex`).
5. **Requisito Corporativo de Licenciamento:** Para a visualização interativa em mapa mental/grafo no frontend React, qualquer biblioteca adotada deve possuir conformidade jurídica estrita para uso livre em ambiente corporativo/comercial, com soberania dos dados e sem custos imprevistos de royalties ou licenças restritivas (Copyleft/GPL).

---

## 2. Decisão Arquitetural Adotada

Fica decidida a implementação do módulo **SCIA Literature Intelligence** estruturado em três capacidades complementares, apoiado no subagente **Methodology Reviewer** no `ai-service` e na biblioteca **React Flow (`@xyflow/react`)** no frontend.

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                        SCIA LITERATURE INTELLIGENCE ARCHITECTURE                       │
├───────────────────────────────┬───────────────────────────────┬────────────────────────┤
│ 1. Scientific Paper Intel     │ 2. Research Relationships     │ 3. Research Alignment  │
│ - Ficha Científica Tipada     │ - Mapa Mental com React Flow  │ - Aderência ao Manuscrito│
│ - Pontos Fortes & Rigor       │ - Grafo interativo livre (MIT)│ - Gaps e Lacunas Reais │
│ - Limitações & Ameaças        │ - Arestas semânticas          │ - Sugestão de Seções   │
│ - Metodologia & Evidências    │ - Algoritmo layout (Dagre/Elk)│ - Citação 1-clique TeX │
└───────────────────────────────┴───────────────────────────────┴────────────────────────┘
```

---

### Pilar 1: Procedimento Rigoroso de Análise via Skill `scientific-article-analysis`

O processo de leitura crítica do `ai-service` passa a adotar a especificação formal de 6 etapas definida na skill:
1. **Extração de Metadados e Contexto:** Título, Autores, Ano, Periódico/Conferência, DOI, arXiv e PDF URL.
2. **Formulação do Problema e Objetivos:** Pergunta central, lacuna teórica motivadora e objetivos primários/secundários.
3. **Metodologia e Desenho do Estudo:** Tipo de estudo, dataset/amostra, instrumentos de medição e técnicas analíticas/estatísticas.
4. **Principais Resultados e Evidências:** Descobertas empíricas comprovadas por métricas, validando se as hipóteses foram corroboradas.
5. **Auditoria Crítica (Pontos Fortes vs. Limitações):**
   * *Pontos Fortes:* Rigor de engenharia, reproducibilidade e relevância.
   * *Limitações Declaradas:* Restrições confessadas pelos próprios autores.
   * *Ameaças à Validade Interna:* Riscos de viés de seleção e variáveis intervenientes.
   * *Ameaças à Validade Externa:* Limitações de generalização para outros cenários e domínios.
6. **Contribuições e Trabalhos Futuros:** Avanço teórico e direções futuras sugeridas.

---

### Pilar 2: Subagente Especialista `methodology-reviewer` e Contratos Tipados

1. **Subagente em Quarentena de Contexto (*Context Quarantine*):**
   * Implementado em `app/agents/sub_agents/methodology_reviewer.py`, operando de maneira análoga a um revisor acadêmico sênior ("Revisor 2").
   * Foca exclusivamente em integridade metodológica e limitações não declaradas, sem poluição de contexto com o diálogo geral do chat.
2. **Schema Pydantic Estrito (`ScientificPaperAnalysis`):**
   * Definido em `app/schemas/paper_analysis.py`, garantindo contrato JSON determinístico para o frontend e backend Fastify via `with_structured_output`.
3. **Endpoints M2M no FastAPI:**
   * `POST /internal/v1/papers/analyze`: Análise crítica pontual de um artigo.
   * `POST /internal/v1/papers/analyze-batch`: Processamento em lote de múltiplos artigos com resiliência a falhas individuais.

---

### Pilar 3: Visualização do Mapa Mental com React Flow (`@xyflow/react`)

1. **Conformidade de Licença Corporativa (MIT):**
   * A biblioteca `@xyflow/react` (v12) é licenciada sob a **MIT License**, permitindo integralmente uso comercial, modificação, distribuição e integração corporativa proprietária sem cobrança de royalties.
   * **Política de Atribuição:** A aplicação mantém o selo discreto de crédito ao React Flow no canto inferior do canvas, garantindo conformidade jurídica e moral com o projeto open-source sem custos de licenciamento.
2. **Modelagem de Nós e Arestas Customizadas:**
   * **Custom Paper Node (`PaperNode.tsx`):** Exibe card compacto com título, ano, chips de pontos fortes (verde), limitações (vermelho) e status de aderência.
   * **Custom Semantic Edge (`RelationshipEdge.tsx`):** Arestas rotuladas com as naturezas de relacionamento acadêmico:
     * `CONVERGENT`: Resultados alinhados e compatíveis.
     * `DIVERGENT`: Resultados discordantes ou controvérsias empíricas.
     * `COMPLEMENTARY`: Abordagens ortogonais que se somam.
     * `BASELINE_METHOD`: Método base estendido ou superado.
3. **Layout Automático:**
   * Uso de bibliotecas de ordenação de grafos (`dagre` ou `elkjs`) para posicionamento orgânico e hierárquico dos nós sem sobreposição.

---

### Pilar 4: Persistência Híbrida e Deduplicação por DOI

1. **Deduplicação Global (Cache de Análises):**
   * O resultado da análise estruturada é indexado por hash de DOI / arXiv ID no PostgreSQL. Artigos clássicos analisados por um pesquisador ficam instantaneamente disponíveis para outros membros da instituição sem consumo repetido de tokens de LLM.
2. **Armazenamento de Evidências no MinIO:**
   * PDFs completos e recortes textuais são arquivados em buckets MinIO (`literature-papers/{projectId}/{doi}.pdf`), assegurando que o autor possa clicar em qualquer afirmação da ficha e ser transportado para a página e linha exata do documento original.

---

## 3. Consequências da Decisão

### Positivas:
* **Ganho de Produtividade Científica:** Redução de semanas de leitura manual e fichamento de literatura para poucos minutos de análise orientada a evidências.
* **Redução de Vieses e Alucinações:** O subagente separa rigorosamente conclusões fundamentadas de declarações infundadas dos autores.
* **Segurança Jurídica:** Uso de biblioteca de visualização de grafos (React Flow) sob licença MIT livre, sem riscos de contaminação por GPL ou custos de licenciamento obrigatórios.
* **Modularidade e Reutilização:** As fichas científicas alimentam tanto a UI interativa quanto a mentora do chat (Belisa) e a geração de seções TeX.

### Riscos & Mitigações:
* **Risco de Falsas Lacunas:** A IA pode interpretar a ausência de um tema em 5 artigos como uma "lacuna científica universal".  
  * *Mitigação:* O relatório sempre declara o escopo estrito dos artigos consultados e utiliza linguagem probabilística ("Possível lacuna no conjunto analisado").
* **Risco de Custo de LLM sob Processamento em Massa:**  
  * *Mitigação:* Deduplicação e cache persistente no PostgreSQL; análise individual sob demanda ou disparada apenas para artigos confirmados pelo autor.
