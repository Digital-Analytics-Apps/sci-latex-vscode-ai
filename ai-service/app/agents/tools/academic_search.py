import logging
from typing import List, Dict, Any, Union
from langchain_core.tools import tool
from app.agents.tools.semantic_scholar import search_academic_papers_s2
from app.agents.tools.openalex import search_academic_papers_openalex

logger = logging.getLogger(__name__)


@tool
async def execute_academic_search(query: str, limit: int = 5) -> Union[List[Dict[str, Any]], str]:
    """
    Executa busca bibliográfica em bases de dados científicas (Semantic Scholar e OpenAlex).
    Tenta primeiro o Semantic Scholar e usa o OpenAlex como fallback automático em caso de rate limit ou indisponibilidade.
    """
    logger.info(f"[AcademicSearch] Iniciando busca unificada para: '{query}'")

    # 1. Tenta Semantic Scholar
    try:
        results = await search_academic_papers_s2(query, limit)
        if isinstance(results, list) and len(results) > 0:
            logger.info(f"[AcademicSearch] Sucesso no Semantic Scholar ({len(results)} resultados)")
            return results

        if isinstance(results, str) and "RATE_LIMIT" in results:
            logger.warning("[AcademicSearch] Semantic Scholar retornou Rate Limit. Acionando Fallback OpenAlex...")
    except Exception as e:
        logger.error(f"[AcademicSearch] Falha no Semantic Scholar: {str(e)}. Tentando fallback...")

    # 2. Fallback para OpenAlex
    try:
        logger.info(f"[AcademicSearch] Executando Fallback OpenAlex para: '{query}'")
        fallback_results = await search_academic_papers_openalex(query, limit)

        if isinstance(fallback_results, list) and len(fallback_results) > 0:
            logger.info(f"[AcademicSearch] Sucesso no OpenAlex ({len(fallback_results)} resultados)")
            return fallback_results

        return fallback_results
    except Exception as e:
        logger.error(f"[AcademicSearch] Falha no fallback OpenAlex: {str(e)}")
        return f"ERRO_TOTAL: Ambas as bases de dados falharam: {str(e)}"
