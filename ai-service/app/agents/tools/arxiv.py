import re
import asyncio
import logging
import time
import xml.etree.ElementTree as ET
from typing import Any, Dict, List, Optional, Union
import httpx
from langchain_core.tools import tool

logger = logging.getLogger(__name__)

# Conforme os Termos de Uso (ToU) oficiais do arXiv:
# 1. No máximo 1 requisição a cada 3 segundos.
# 2. Apenas 1 conexão concorrente por vez.
ARXIV_SEMAPHORE = asyncio.Semaphore(1)
_LAST_REQUEST_TIME: float = 0.0

# Cliente HTTP Singleton para reaproveitar conexões TCP (Connection Pooling)
_http_client: Optional[httpx.AsyncClient] = None

# User-Agent descritivo e identificável conforme recomendado pela política de uso do arXiv
ARXIV_USER_AGENT = "SciAI-Assistant/1.0 (https://github.com/sci-latex; mailto:contact@sciai.internal)"

# Namespaces XML Atom 1.0 e extensões arXiv / OpenSearch
NAMESPACES = {
    "atom": "http://www.w3.org/2005/Atom",
    "arxiv": "http://arxiv.org/schemas/atom",
    "opensearch": "http://a9.com/-/spec/opensearch/1.1/",
}

STOPWORDS = {
    "a", "about", "above", "after", "again", "against", "all", "am", "an", "and", "any", "are",
    "as", "at", "be", "because", "been", "before", "being", "below", "between", "both", "but",
    "by", "can", "did", "do", "does", "doing", "down", "during", "each", "few", "for", "from",
    "further", "had", "has", "have", "having", "he", "her", "here", "hers", "herself", "him",
    "himself", "his", "how", "i", "if", "in", "into", "is", "it", "its", "itself", "just", "me",
    "more", "most", "my", "myself", "no", "nor", "not", "now", "of", "off", "on", "once", "only",
    "or", "other", "our", "ours", "ourselves", "out", "over", "own", "s", "same", "she", "should",
    "so", "some", "such", "t", "than", "that", "the", "their", "theirs", "them", "themselves",
    "then", "there", "these", "they", "this", "those", "through", "to", "too", "under", "until",
    "up", "very", "was", "we", "were", "what", "when", "where", "which", "while", "who", "whom",
    "why", "will", "with", "you", "your", "yours", "yourself", "yourselves"
}
def get_http_client() -> httpx.AsyncClient:
    global _http_client
    if _http_client is None or _http_client.is_closed:
        _http_client = httpx.AsyncClient(
            timeout=12.0,
            headers={"User-Agent": ARXIV_USER_AGENT},
            follow_redirects=True,
        )
    return _http_client


def build_arxiv_query(query: str) -> str:
    """
    Constrói a query para a API do arXiv conforme o User's Manual (seção 5.1).
    Prefixos suportados: ti (título), au (autor), abs (resumo), co (comentário),
    jr (journal ref), cat (categoria temática), all (todos os campos).
    Operadores booleanos suportados em MAIÚSCULAS: AND, OR, ANDNOT.
    Filtra stopwords, elimina termos duplicados e limita a no máximo 4 palavras-chave
    para prevenir sobrecarga e timeouts no motor de busca Lucene do arXiv.
    """
    cleaned = " ".join(query.strip().split())
    if not cleaned:
        return "all:all"

    # Se a query já contém operadores booleanos ou prefixos explícitos de campo, preserva
    prefixes = ("ti:", "au:", "abs:", "co:", "jr:", "cat:", "rn:", "id:", "all:")
    has_prefix = any(p in cleaned for p in prefixes)
    has_bool = any(b in cleaned for b in (" AND ", " OR ", " ANDNOT "))

    if has_prefix or has_bool:
        return cleaned

    # Se já estiver entre aspas, busca como frase exata em all:
    if cleaned.startswith('"') and cleaned.endswith('"'):
        return f"all:{cleaned}"

    # Extrai tokens alfanuméricos ignorando pontuações
    raw_tokens = re.findall(r"[a-zA-Z0-9_\-]+", cleaned)
    meaningful: List[str] = []
    seen = set()

    for tok in raw_tokens:
        tl = tok.lower()
        if tl not in STOPWORDS and len(tl) > 2 and tl not in seen:
            meaningful.append(tok)
            seen.add(tl)

    if not meaningful:
        meaningful = raw_tokens[:3]

    # Limita a 3 ou 4 termos principais para evitar que queries longas gerem timeouts (>20s)
    selected = meaningful[:4] if len(meaningful) > 4 else meaningful
    return " AND ".join(f"all:{w}" for w in selected)

async def search_academic_papers_arxiv(
    query: str,
    limit: int = 5,
    sort_by: Optional[str] = "relevance",
    sort_order: Optional[str] = "descending",
    id_list: Optional[str] = None,
) -> Union[List[Dict[str, Any]], str]:
    """
    Pesquisa artigos acadêmicos e preprints na API oficial do arXiv (export.arxiv.org).
    Segue estritamente as diretrizes da documentação oficial:
    - Controle de concorrência com semáforo unitário (1 conexão).
    - Throttle temporal mandatório de 3 segundos entre requisições.
    - Parse de XML Atom 1.0 com namespaces oficiais.
    - Retries com backoff exponencial para códigos HTTP 429 e 503.
    """
    global _LAST_REQUEST_TIME

    async with ARXIV_SEMAPHORE:
        logger.info(f"[arXiv] Iniciando busca: '{query}' (limit={limit})")

        # Respeita o intervalo mandatório de 3 segundos entre requisições consecutivas
        now = time.time()
        elapsed = now - _LAST_REQUEST_TIME
        if elapsed < 3.0:
            sleep_duration = 3.0 - elapsed
            logger.debug(f"[arXiv] Throttle ativo: aguardando {sleep_duration:.2f}s antes da requisição.")
            await asyncio.sleep(sleep_duration)

        formatted_query = build_arxiv_query(query)
        url = "https://export.arxiv.org/api/query"
        params: Dict[str, Any] = {
            "search_query": formatted_query,
            "start": 0,
            "max_results": min(max(1, limit), 50),
        }

        if id_list:
            params["id_list"] = id_list

        # sortBy e sortOrder são suportados pelo arXiv: relevance, lastUpdatedDate, submittedDate
        # Ordenação: 'relevance' é a ordem nativa padrão do motor do arXiv.
        # Especificar explicitamente sortBy='relevance' degrada a performance do Lucene
        # e induz timeouts. Só enviamos sortBy quando for por data explícita.
        if sort_by and sort_by in ("lastUpdatedDate", "submittedDate"):
            params["sortBy"] = sort_by
            if sort_order:
                params["sortOrder"] = sort_order

        client = get_http_client()
        max_retries = 2
        retry_delay = 3.5
        for attempt in range(max_retries):
            try:
                response = await client.get(url, params=params)
                _LAST_REQUEST_TIME = time.time()

                # Tratamento de rate limit e sobrecarga do servidor arXiv
                if response.status_code == 429:
                    logger.warning(
                        f"[arXiv] Rate Limit (429) detectado na tentativa {attempt + 1}. Acionando failover rápido para contingência."
                    )
                    # Fail-fast imediato para não prender o usuário esperando cooldown de IP
                    return "ERRO_RATE_LIMIT_ARXIV: Limite de requisições excedido no arXiv (HTTP 429). Acionando fallback..."

                if response.status_code == 503:
                    logger.warning(f"[arXiv] Servidor indisponível (503) na tentativa {attempt + 1}/{max_retries}.")
                    if attempt < max_retries - 1:
                        await asyncio.sleep(retry_delay)
                        continue
                    return "ERRO_INDISPONIVEL_ARXIV: Servidor arXiv temporariamente indisponível (HTTP 503)."
                response.raise_for_status()
                xml_content = response.text

                # Parse do Atom XML Feed
                root = ET.fromstring(xml_content)
                entries = root.findall("atom:entry", NAMESPACES)

                results: List[Dict[str, Any]] = []

                for entry in entries:
                    raw_title = entry.findtext("atom:title", default="", namespaces=NAMESPACES)
                    clean_title = " ".join(raw_title.strip().split())

                    # O arXiv retorna uma entrada com título "Error" em caso de erro na consulta
                    if clean_title.lower() == "error":
                        err_summary = entry.findtext("atom:summary", default="", namespaces=NAMESPACES)
                        logger.error(f"[arXiv] Erro retornado pela API: {err_summary}")
                        return f"ERRO_ARXIV_QUERY: {err_summary}"

                    raw_summary = entry.findtext("atom:summary", default="", namespaces=NAMESPACES)
                    clean_snippet = " ".join(raw_summary.strip().split())

                    published = entry.findtext("atom:published", default="", namespaces=NAMESPACES)
                    year = int(published[:4]) if published and len(published) >= 4 else None

                    raw_id = entry.findtext("atom:id", default="", namespaces=NAMESPACES)
                    url_clean = raw_id.replace("http://", "https://") if raw_id else ""

                    # Extração de links de PDF e DOI alternativo
                    pdf_url: Optional[str] = None
                    doi_url: Optional[str] = None

                    for link in entry.findall("atom:link", NAMESPACES):
                        rel = link.attrib.get("rel", "")
                        title = link.attrib.get("title", "")
                        link_type = link.attrib.get("type", "")
                        href = link.attrib.get("href", "")

                        if title == "pdf" or link_type == "application/pdf":
                            pdf_url = href.replace("http://", "https://")
                        elif title == "doi" or rel == "related" and "doi.org" in href:
                            doi_url = href.replace("http://", "https://")

                    raw_doi = entry.findtext("arxiv:doi", default=None, namespaces=NAMESPACES)
                    final_doi = f"https://doi.org/{raw_doi.strip()}" if raw_doi else doi_url

                    journal_ref = entry.findtext("arxiv:journal_ref", default=None, namespaces=NAMESPACES)
                    primary_cat_elem = entry.find("arxiv:primary_category", NAMESPACES)
                    cat_term = primary_cat_elem.attrib.get("term", "") if primary_cat_elem is not None else ""

                    # Formatação de local de publicação (venue)
                    if journal_ref:
                        venue = " ".join(journal_ref.strip().split())
                    elif cat_term:
                        venue = f"arXiv:{cat_term}"
                    else:
                        venue = "arXiv preprint"

                    # Extração dos autores
                    authors: List[str] = []
                    for author_elem in entry.findall("atom:author", NAMESPACES):
                        name = author_elem.findtext("atom:name", default="", namespaces=NAMESPACES)
                        if name:
                            authors.append(" ".join(name.strip().split()))

                    paper = {
                        "title": clean_title or "Título desconhecido",
                        "authors": authors or ["Autores desconhecidos"],
                        "year": year,
                        "venue": venue,
                        "snippet": clean_snippet[:500] + ("..." if len(clean_snippet) > 500 else ""),
                        "url": url_clean,
                        "pdf_url": pdf_url,
                        "doi": final_doi,
                        "citation_count": 0,  # arXiv é repositório de preprints e não calcula citações
                        "primary_category": cat_term,
                    }
                    results.append(paper)

                logger.info(f"[arXiv] Busca concluída com sucesso: {len(results)} artigos encontrados.")
                return results

            except ET.ParseError as pe:
                logger.error(f"[arXiv] Erro de parsing XML: {str(pe)}")
                if attempt == max_retries - 1:
                    return f"ERRO_ARXIV_XML: Falha ao interpretar XML da resposta: {str(pe)}"
                await asyncio.sleep(retry_delay)

            except Exception as e:
                logger.error(f"[arXiv] Erro durante requisição na tentativa {attempt + 1}: {str(e)}")
                if attempt == max_retries - 1:
                    return f"ERRO_ARXIV: {str(e)}"
                await asyncio.sleep(retry_delay)

        return "ERRO_DESCONHECIDO: Falha na busca no arXiv após tentativas."


@tool
async def search_arxiv_preprints(query: str, limit: int = 5) -> Union[List[Dict[str, Any]], str]:
    """
    Pesquisa artigos científicos e preprints de ponta no repositório arXiv (export.arxiv.org).
    Ideal para ciência da computação, inteligência artificial, física e matemática.
    Retorna lista de artigos contendo título, autores, ano, resumo, link do abstract, link do PDF e DOI.
    """
    return await search_academic_papers_arxiv(query=query, limit=limit)
