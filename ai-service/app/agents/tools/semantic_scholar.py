import logging
import asyncio
from typing import List, Dict, Any, Union
import httpx

logger = logging.getLogger(__name__)

S2_SEMAPHORE = asyncio.Semaphore(2)

_http_client: httpx.AsyncClient | None = None


def get_http_client() -> httpx.AsyncClient:
    global _http_client
    if _http_client is None or _http_client.is_closed:
        _http_client = httpx.AsyncClient(timeout=15.0)
    return _http_client


async def search_academic_papers_s2(query: str, limit: int = 5) -> Union[List[Dict[str, Any]], str]:
    """
    Pesquisa artigos acadêmicos usando a API oficial do Semantic Scholar (S2).
    Implementa retries com exponential backoff e controle de concorrência.
    """
    async with S2_SEMAPHORE:
        logger.info(f"[SemanticScholar] Buscando por: '{query}' limit={limit}")
        url = "https://api.semanticscholar.org/graph/v1/paper/search"
        params = {
            "query": query,
            "limit": limit,
            "fields": "title,authors,year,venue,abstract,url,citationCount,externalIds",
        }

        max_retries = 3
        retry_delay = 2.0
        client = get_http_client()

        for attempt in range(max_retries):
            try:
                response = await client.get(url, params=params)

                if response.status_code == 429:
                    logger.warning(f"[SemanticScholar] Rate Limit (429) na tentativa {attempt+1}")
                    if attempt < max_retries - 1:
                        wait_time = retry_delay * (2 ** attempt)
                        await asyncio.sleep(wait_time)
                        continue
                    return "ERRO_RATE_LIMIT: Semantic Scholar sobrecarregado. Fallback para OpenAlex ativado."

                response.raise_for_status()
                data = response.json()
                papers = data.get("data", [])

                results = []
                for p in papers:
                    authors_list = p.get("authors", [])
                    ext_ids = p.get("externalIds") or {}
                    doi = ext_ids.get("DOI")

                    paper = {
                        "title": p.get("title") or "Título desconhecido",
                        "authors": [a.get("name", "") for a in authors_list if a.get("name")] or ["Autores desconhecidos"],
                        "year": p.get("year"),
                        "venue": p.get("venue") or "",
                        "snippet": p.get("abstract") or "Sem resumo disponível (abstract não indexado).",
                        "url": p.get("url") or f"https://api.semanticscholar.org/CorpusID:{p.get('corpusId')}",
                        "doi": f"https://doi.org/{doi}" if doi else None,
                        "citation_count": p.get("citationCount") or 0,
                    }
                    results.append(paper)

                return results

            except Exception as e:
                logger.error(f"[SemanticScholar] Erro: {str(e)}")
                if attempt == max_retries - 1:
                    return f"ERRO_S2: {str(e)}"
                await asyncio.sleep(retry_delay)

        return "ERRO_DESCONHECIDO: Falha na busca no Semantic Scholar."
