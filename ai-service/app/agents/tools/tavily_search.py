import logging
from typing import List, Dict, Any, Union
from app.core.config import settings

logger = logging.getLogger(__name__)


async def execute_web_search(query: str, max_results: int = 5) -> Union[List[Dict[str, Any]], str]:
    """
    Executa busca geral na web via Tavily para contextualizar tópicos recentes.
    """
    if not settings.TAVILY_API_KEY:
        return "AVISO: TAVILY_API_KEY não configurada. Busca web indisponível."

    try:
        from tavily import AsyncTavilyClient

        client = AsyncTavilyClient(api_key=settings.TAVILY_API_KEY)
        response = await client.search(query=query, max_results=max_results)

        results = []
        for r in response.get("results", []):
            results.append({
                "title": r.get("title", "Sem título"),
                "url": r.get("url", ""),
                "snippet": r.get("content", ""),
            })
        return results
    except Exception as e:
        logger.error(f"[Tavily] Erro na busca web: {str(e)}")
        return f"ERRO_TAVILY: {str(e)}"
