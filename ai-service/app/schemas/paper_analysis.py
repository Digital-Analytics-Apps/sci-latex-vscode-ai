from typing import List, Optional
from pydantic import BaseModel, Field


class PaperMetadata(BaseModel):
    title: str = Field(..., description="Título completo do artigo")
    authors: List[str] = Field(default_factory=list, description="Lista de autores")
    year: Optional[int] = Field(None, description="Ano de publicação")
    venue: Optional[str] = Field(None, description="Periódico, congresso ou conferência")
    doi: Optional[str] = Field(None, description="Identificador digital único (DOI)")
    arxiv_url: Optional[str] = Field(None, description="URL do arXiv (se aplicável)")
    pdf_url: Optional[str] = Field(None, description="URL direta do PDF")


class PaperProblemAndObjectives(BaseModel):
    research_question: str = Field(..., description="Questão central investigada pelo artigo")
    theoretical_gap: Optional[str] = Field(None, description="Lacuna teórica ou prática que motivou a pesquisa")
    objectives: List[str] = Field(default_factory=list, description="Objetivos principais e específicos")


class PaperMethodology(BaseModel):
    study_type: str = Field(..., description="Tipo de estudo: experimental, qualitativo, quantitativo, revisão, etc.")
    dataset_sample: Optional[str] = Field(None, description="Descrição da amostra, dados, volume ou benchmarks")
    instruments_methods: Optional[str] = Field(None, description="Técnicas, instrumentos de coleta ou algoritmos")
    analysis_techniques: Optional[str] = Field(None, description="Testes estatísticos ou modelos utilizados")


class PaperFindings(BaseModel):
    main_results: List[str] = Field(default_factory=list, description="Principais descobertas suportadas por evidências")
    empirical_metrics: Optional[str] = Field(None, description="Métricas, valores estatísticos ou desempenho obtido")
    hypotheses_corroborated: Optional[bool] = Field(None, description="Se as hipóteses foram corroboradas")


class PaperCritique(BaseModel):
    strengths: List[str] = Field(default_factory=list, description="Pontos fortes do artigo e rigor identificado")
    declared_limitations: List[str] = Field(default_factory=list, description="Limitações explicitadas pelos próprios autores")
    internal_validity_threats: List[str] = Field(default_factory=list, description="Ameaças à validade interna (vieses, controles faltantes)")
    external_validity_threats: List[str] = Field(default_factory=list, description="Ameaças à validade externa (generalização para outros cenários)")


class PaperContributions(BaseModel):
    theoretical_advance: Optional[str] = Field(None, description="Como o estudo avança a literatura ou modelos existentes")
    practical_implications: Optional[str] = Field(None, description="Aplicações práticas para engenharia ou indústria")
    future_work: List[str] = Field(default_factory=list, description="Trabalhos futuros sugeridos pelos autores")


class AuthorAlignment(BaseModel):
    relation_type: str = Field(
        default="complementary",
        description="Relação com a pesquisa do autor: 'direct_problem', 'theoretical_foundation', 'methodology_baseline', 'divergent_finding', 'complementary'"
    )
    suggested_sections: List[str] = Field(
        default_factory=list,
        description="Seções do artigo do autor recomendadas para citar este trabalho (ex: Introdução, Metodologia, Trabalhos Relacionados)"
    )
    synthesis_note: Optional[str] = Field(None, description="Nota de síntese acionável para o autor")


class ScientificPaperAnalysis(BaseModel):
    """
    Ficha Científica Estruturada (Scientific Paper Intelligence)
    Seguindo rigorosamente a skill 'scientific-article-analysis'.
    """
    metadata: PaperMetadata
    executive_summary: str = Field(..., description="Síntese fiel ao conteúdo distinguindo objetivo, método e achados")
    problem_and_objectives: PaperProblemAndObjectives
    methodology: PaperMethodology
    findings: PaperFindings
    critique: PaperCritique
    contributions: PaperContributions
    alignment: Optional[AuthorAlignment] = Field(None, description="Alinhamento e utilidade para o artigo do autor")


class PaperAnalysisRequest(BaseModel):
    title: str = Field(..., description="Título do artigo a ser analisado")
    abstract: str = Field(..., description="Resumo (abstract) ou conteúdo do artigo")
    authors: Optional[List[str]] = Field(default_factory=list)
    year: Optional[int] = None
    venue: Optional[str] = None
    doi: Optional[str] = None
    arxiv_url: Optional[str] = None
    pdf_url: Optional[str] = None
    author_topic: Optional[str] = Field(None, description="Tema ou recorte do artigo em escrita pelo autor para cálculo de aderência")
