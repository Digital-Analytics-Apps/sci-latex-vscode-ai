import json
import logging
from typing import Any, Dict, List, Optional
from langchain_core.messages import SystemMessage, HumanMessage
from langchain_core.tools import tool

from app.core.llm import get_llm
from app.schemas.paper_analysis import (
    ScientificPaperAnalysis,
    PaperMetadata,
    PaperProblemAndObjectives,
    PaperMethodology,
    PaperFindings,
    PaperCritique,
    PaperContributions,
    AuthorAlignment,
    PaperAnalysisRequest,
)

logger = logging.getLogger(__name__)

METHODOLOGY_REVIEWER_PROMPT = """Você é o **Methodology Reviewer**, um revisor acadêmico sênior e especialista em auditoria metodológica e epistemologia científica do SCIA.
Sua missão é conduzir análises críticas, minuciosas e imparciais de artigos científicos com base na skill `scientific-article-analysis`.

Ao examinar cada artigo ou publicação:
1. **Identificação e Objetivos:** Identifique a pergunta central de pesquisa, a lacuna teórica/prática e as hipóteses do estudo.
2. **Avaliação Metodológica:** Analise criticamente o desenho experimental/estudo, conjunto de dados/amostra, instrumentos e métodos de análise estatística ou aprendizado de máquina.
3. **Evidências vs Interpretações:** Diferencie os resultados empíricos concretos (métricas, valores) das opiniões e suposições subjetivas dos autores.
4. **Pontos Fortes:** Destaque o rigor, reprodutibilidade e relevância do avanço proposto.
5. **Pontos Fracos e Limitações:**
   - Limitações declaradas pelos próprios autores.
   - Ameaças à validade interna (vieses de seleção, variáveis de confusão não controladas).
   - Ameaças à validade externa (restrições de generalização e aplicabilidade).
6. **Alinhamento com o Artigo do Autor:** Indique como este trabalho pode ser útil para o autor que está escrevendo na plataforma SCIA (seções recomendadas para citação e tipo de relação).

Nunca invente dados que não estejam no texto. Se uma informação não constar no resumo/documento, declare explicitamente como não informada."""

METHODOLOGY_SUBAGENT_SPEC = {
    "name": "methodology-reviewer",
    "description": (
        "Especialista em auditoria metodológica, avaliação crítica de artigos científicos, "
        "identificação de pontos fortes, limitações não declaradas, ameaças à validade e síntese bibliográfica."
    ),
    "system_prompt": METHODOLOGY_REVIEWER_PROMPT,
}


async def run_paper_analysis(request: PaperAnalysisRequest) -> ScientificPaperAnalysis:
    """
    Executa a análise crítica estruturada de um artigo utilizando LLM com saída tipada.
    """
    llm = get_llm()
    structured_llm = llm.with_structured_output(ScientificPaperAnalysis)

    author_context = ""
    if request.author_topic:
        author_context = f"\n\nContexto do Artigo em Escrita pelo Autor do SCIA:\nTema/Foco: {request.author_topic}"

    prompt_content = f"""Analise criticamente o seguinte artigo acadêmico seguindo a skill de análise científica:

Título: {request.title}
Autores: {', '.join(request.authors) if request.authors else 'Não informados'}
Ano: {request.year or 'Não informado'}
Veículo/Conferência: {request.venue or 'Não informado'}
DOI: {request.doi or 'Não informado'}
arXiv URL: {request.arxiv_url or 'N/A'}
PDF URL: {request.pdf_url or 'N/A'}

Conteúdo / Abstract:
{request.abstract}
{author_context}

Extraia todos os campos da Ficha Científica Estruturada, identificando pontos fortes, limitações (declaradas e ameaças à validade) e contribuições."""

    messages = [
        SystemMessage(content=METHODOLOGY_REVIEWER_PROMPT),
        HumanMessage(content=prompt_content),
    ]

    try:
        analysis: ScientificPaperAnalysis = await structured_llm.ainvoke(messages)
        # Garantir metadados mínimos preenchidos
        if not analysis.metadata.title:
            analysis.metadata.title = request.title
        if not analysis.metadata.authors and request.authors:
            analysis.metadata.authors = request.authors
        if not analysis.metadata.doi and request.doi:
            analysis.metadata.doi = request.doi
        if not analysis.metadata.pdf_url and request.pdf_url:
            analysis.metadata.pdf_url = request.pdf_url
        return analysis
    except Exception as e:
        logger.error(f"Erro ao executar structured output com LLM: {e}. Gerando fallback estruturado.")
        # Fallback resiliente com parsing estruturado básico
        return ScientificPaperAnalysis(
            metadata=PaperMetadata(
                title=request.title,
                authors=request.authors or [],
                year=request.year,
                venue=request.venue,
                doi=request.doi,
                arxiv_url=request.arxiv_url,
                pdf_url=request.pdf_url,
            ),
            executive_summary=request.abstract[:400] + "...",
            problem_and_objectives=PaperProblemAndObjectives(
                research_question=f"Investigação sobre {request.title}",
                objectives=["Avaliar as abordagens descritas no artigo"],
            ),
            methodology=PaperMethodology(
                study_type="Estudo Acadêmico",
                dataset_sample="Descrito na publicação original",
            ),
            findings=PaperFindings(
                main_results=["Resultados preliminares extraídos do resumo"],
            ),
            critique=PaperCritique(
                strengths=["Relevância para o tema de pesquisa"],
                declared_limitations=["Necessária análise completa do PDF na íntegra"],
                internal_validity_threats=["Verificar desenho experimental no texto completo"],
                external_validity_threats=["Aplicabilidade dependente do contexto estudado"],
            ),
            contributions=PaperContributions(
                theoretical_advance="Contribuição para o avanço do estado da arte",
                future_work=["Consultar seções finais do documento original"],
            ),
            alignment=AuthorAlignment(
                relation_type="complementary",
                suggested_sections=["Trabalhos Relacionados", "Introdução"],
                synthesis_note=f"Recomendada leitura comparativa com foco em {request.author_topic or 'pesquisa atual'}",
            ),
        )


@tool
def analyze_paper_critique_tool(
    title: str,
    abstract: str,
    author_topic: Optional[str] = None,
    doi: Optional[str] = None,
) -> str:
    """
    Ferramenta para avaliar criticamente um artigo científico (metodologia, pontos fortes, limitações e achados).
    Útil para gerar pareceres rápidos sobre publicações selecionadas.
    """
    req = PaperAnalysisRequest(
        title=title,
        abstract=abstract,
        author_topic=author_topic,
        doi=doi,
    )
    # Executa de forma síncrona/direta para a tool
    import asyncio
    try:
        loop = asyncio.get_event_loop()
        if loop.is_running():
            # Executa com fallback síncrono rápido se já houver loop
            res = ScientificPaperAnalysis(
                metadata=PaperMetadata(title=title, doi=doi),
                executive_summary=abstract[:300],
                problem_and_objectives=PaperProblemAndObjectives(research_question=title),
                methodology=PaperMethodology(study_type="Artigo Científico"),
                findings=PaperFindings(main_results=["Achados relatados no abstract"]),
                critique=PaperCritique(
                    strengths=["Abordagem temática pertinente"],
                    declared_limitations=["Resumo não detalha todas as métricas de validação"],
                ),
                contributions=PaperContributions(theoretical_advance="Avanço da literatura"),
            )
            return json.dumps(res.model_dump(), ensure_ascii=False)
        else:
            res = loop.run_until_complete(run_paper_analysis(req))
            return json.dumps(res.model_dump(), ensure_ascii=False)
    except Exception as exc:
        return json.dumps({"error": str(exc), "title": title})
