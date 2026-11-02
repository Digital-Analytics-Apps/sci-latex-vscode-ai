import logging
from typing import List, Dict, Any, Union
from langchain_core.tools import tool
from app.agents.tools.arxiv import search_academic_papers_arxiv
from app.agents.tools.semantic_scholar import search_academic_papers_s2
from app.agents.tools.openalex import search_academic_papers_openalex

logger = logging.getLogger(__name__)


@tool
async def execute_academic_search(query: str, limit: int = 5) -> Union[List[Dict[str, Any]], str]:
    """
    Executa busca bibliográfica em bases de dados científicas (arXiv, Semantic Scholar e OpenAlex).
    Utiliza o arXiv como mecanismo de busca padrão e primário.
    Em caso de rate limit, timeout ou erro no arXiv, aciona automaticamente o Semantic Scholar e o OpenAlex como fallbacks.
    """
    logger.info(f"[AcademicSearch] Iniciando busca unificada para: '{query}'")

    # 1. Mecanismo padrão: arXiv
    try:
        logger.info(f"[AcademicSearch] Consultando base primária default: arXiv para '{query}'")
        arxiv_results = await search_academic_papers_arxiv(query, limit)
        if isinstance(arxiv_results, list) and len(arxiv_results) > 0:
            logger.info(f"[AcademicSearch] Sucesso no arXiv ({len(arxiv_results)} resultados)")
            return arxiv_results

        if isinstance(arxiv_results, str):
            logger.warning(f"[AcademicSearch] arXiv retornou mensagem: {arxiv_results}. Acionando fallback Semantic Scholar...")
        else:
            logger.warning("[AcademicSearch] arXiv retornou 0 resultados. Acionando fallback Semantic Scholar...")
    except Exception as e:
        logger.error(f"[AcademicSearch] Falha no arXiv: {str(e)}. Tentando fallback Semantic Scholar...")

    # 2. Fallback 1: Semantic Scholar
    try:
        logger.info(f"[AcademicSearch] Executando Fallback 1 (Semantic Scholar) para: '{query}'")
        s2_results = await search_academic_papers_s2(query, limit)
        if isinstance(s2_results, list) and len(s2_results) > 0:
            logger.info(f"[AcademicSearch] Sucesso no Semantic Scholar ({len(s2_results)} resultados)")
            return s2_results

        if isinstance(s2_results, str) and "RATE_LIMIT" in s2_results:
            logger.warning("[AcademicSearch] Semantic Scholar retornou Rate Limit. Acionando Fallback OpenAlex...")
    except Exception as e:
        logger.error(f"[AcademicSearch] Falha no Semantic Scholar: {str(e)}. Tentando fallback OpenAlex...")

    # 3. Fallback 2: OpenAlex
    try:
        logger.info(f"[AcademicSearch] Executando Fallback 2 (OpenAlex) para: '{query}'")
        fallback_results = await search_academic_papers_openalex(query, limit)

        if isinstance(fallback_results, list) and len(fallback_results) > 0:
            logger.info(f"[AcademicSearch] Sucesso no OpenAlex ({len(fallback_results)} resultados)")
            return fallback_results

        return fallback_results
    except Exception as e:
        logger.error(f"[AcademicSearch] Falha no fallback OpenAlex: {str(e)}")
        return f"ERRO_TOTAL: Todas as bases de dados acadêmicas falharam (arXiv, S2, OpenAlex): {str(e)}"
