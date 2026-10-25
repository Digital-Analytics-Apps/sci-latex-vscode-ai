import logging
import asyncio
from typing import List, Dict, Any, Union
import httpx

logger = logging.getLogger(__name__)

# Controle de concorrência para respeitar limites da API pública
OPENALEX_SEMAPHORE = asyncio.Semaphore(5)

# Cliente HTTP Singleton para reaproveitar conexões TCP (Connection Pooling)
_http_client: httpx.AsyncClient | None = None


def get_http_client() -> httpx.AsyncClient:
    global _http_client
    if _http_client is None or _http_client.is_closed:
        _http_client = httpx.AsyncClient(timeout=15.0)
    return _http_client


async def search_academic_papers_openalex(
    query: str, limit: int = 5
) -> Union[List[Dict[str, Any]], str]:
    """
    Pesquisa artigos acadêmicos na API oficial do OpenAlex.
    Retorna lista estruturada de artigos com título, autores, ano, resumo e DOI.
    """
    async with OPENALEX_SEMAPHORE:
        logger.info(f"[OpenAlex] Buscando por: '{query}' (limit={limit})")
        url = "https://api.openalex.org/works"
        params = {
            "search": query,
            "per-page": limit,
        }

        max_retries = 3
        retry_delay = 1.5
        client = get_http_client()

        for attempt in range(max_retries):
            try:
                response = await client.get(url, params=params)

                if response.status_code == 429:
                    logger.warning(f"[OpenAlex] Rate Limit (429) na tentativa {attempt+1}")
                    if attempt < max_retries - 1:
                        await asyncio.sleep(retry_delay * (attempt + 1))
                        continue
                    return "ERRO_RATE_LIMIT: Limite de requisições do OpenAlex excedido. Tente novamente em instantes."

                response.raise_for_status()
                data = response.json()
                works = data.get("results", [])

                results = []
                for w in works:
                    authorships = w.get("authorships", [])
                    abstract_inverted = w.get("abstract_inverted_index")
                    snippet = "Resumo indisponível"

                    if abstract_inverted:
                        try:
                            max_pos = max([pos for arr in abstract_inverted.values() for pos in arr])
                            words = [""] * (max_pos + 1)
                            for word, positions in abstract_inverted.items():
                                for pos in positions:
                                    words[pos] = word
                            snippet = " ".join(words)[:500] + "..."
                        except Exception:
                            snippet = "Erro ao processar resumo invertido."

                    venue_str = ""
                    primary_location = w.get("primary_location")
                    if primary_location and primary_location.get("source"):
                        venue_str = primary_location.get("source").get("display_name", "")

                    paper = {
                        "title": w.get("title") or w.get("display_name") or "Título desconhecido",
                        "authors": [a.get("author", {}).get("display_name", "") for a in authorships] or ["Autores desconhecidos"],
                        "year": w.get("publication_year"),
                        "venue": venue_str,
                        "snippet": snippet,
                        "url": w.get("doi") or (primary_location.get("landing_page_url") if primary_location else "") or w.get("id", ""),
                        "doi": w.get("doi"),
                        "citation_count": w.get("cited_by_count") or 0,
                    }
                    results.append(paper)

                return results

            except Exception as e:
                logger.error(f"[OpenAlex] Erro na requisição: {str(e)}")
                if attempt == max_retries - 1:
                    return f"ERRO_OPENALEX: {str(e)}"
                await asyncio.sleep(retry_delay)

        return "ERRO_DESCONHECIDO: Não foi possível obter resultados do OpenAlex."
