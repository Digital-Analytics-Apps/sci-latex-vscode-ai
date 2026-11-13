import logging
from typing import List
from fastapi import APIRouter, HTTPException
from app.schemas.paper_analysis import (
    PaperAnalysisRequest,
    ScientificPaperAnalysis,
)
from app.agents.sub_agents.methodology_reviewer import run_paper_analysis

logger = logging.getLogger(__name__)
router = APIRouter()


@router.post(
    "/papers/analyze",
    response_model=ScientificPaperAnalysis,
    summary="Análise Crítica e Estruturada de Artigo Científico (Scientific Paper Intelligence)",
    description=(
        "Conduz uma auditoria crítica e avaliação metodológica de um artigo científico com base na skill "
        "`scientific-article-analysis`. Retorna uma Ficha Científica com problema, metodologia, achados, "
        "pontos fortes, limitações (declaradas e ameaças à validade) e aderência ao artigo do autor."
    ),
)
async def analyze_paper_endpoint(request: PaperAnalysisRequest):
    try:
        analysis = await run_paper_analysis(request)
        return analysis
    except Exception as exc:
        logger.error(f"Falha ao analisar artigo '{request.title}': {exc}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Erro interno durante a análise metodológica do artigo: {str(exc)}",
        )


@router.post(
    "/papers/analyze-batch",
    response_model=List[ScientificPaperAnalysis],
    summary="Análise Crítica em Lote de Artigos Científicos",
    description="Analisa múltiplos artigos simultaneamente para alimentar a matriz comparativa e ficha científica.",
)
async def analyze_paper_batch_endpoint(requests: List[PaperAnalysisRequest]):
    results = []
    for req in requests:
        try:
            analysis = await run_paper_analysis(req)
            results.append(analysis)
        except Exception as exc:
            logger.warning(f"Erro ao processar item do lote '{req.title}': {exc}")
    return results
