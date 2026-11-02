import pytest
from unittest.mock import patch, AsyncMock
from app.agents.tools.arxiv import build_arxiv_query, search_academic_papers_arxiv
from app.agents.tools.academic_search import execute_academic_search


def test_build_arxiv_query():
    # Testa queries simples
    assert build_arxiv_query("transformer") == "all:transformer"
    assert build_arxiv_query("deep learning") == "all:deep AND all:learning"
    
    # Testa queries com operadores booleanos ou prefixos explícitos
    assert build_arxiv_query("ti:attention AND cat:cs.AI") == "ti:attention AND cat:cs.AI"
    assert build_arxiv_query('all:"machine learning"') == 'all:"machine learning"'
    assert build_arxiv_query("") == "all:all"

    # Testa queries longas com stopwords e termos duplicados
    long_query = "time series anomaly detection social media bot detection disinformation posting frequency temporal patterns"
    formatted = build_arxiv_query(long_query)
    # Deve conter no máximo 4 termos AND sem repetições
    assert formatted == "all:time AND all:series AND all:anomaly AND all:detection"

@pytest.mark.asyncio
async def test_search_academic_papers_arxiv_success():
    sample_xml = """<?xml version='1.0' encoding='UTF-8'?>
    <feed xmlns='http://www.w3.org/2005/Atom' xmlns:arxiv='http://arxiv.org/schemas/atom'>
      <entry>
        <id>http://arxiv.org/abs/2104.12345v1</id>
        <title>Attention Is All You Need</title>
        <summary>A groundbreaking paper on transformers.</summary>
        <published>2017-06-12T17:00:00Z</published>
        <author><name>Ashish Vaswani</name></author>
        <author><name>Noam Shazeer</name></author>
        <arxiv:primary_category term="cs.CL"/>
        <arxiv:doi>10.1234/test.doi</arxiv:doi>
        <link href="http://arxiv.org/pdf/2104.12345v1" rel="related" type="application/pdf" title="pdf"/>
      </entry>
    </feed>
    """

    mock_response = AsyncMock()
    mock_response.status_code = 200
    mock_response.text = sample_xml
    mock_response.raise_for_status = lambda: None

    with patch("app.agents.tools.arxiv.get_http_client") as mock_client_factory:
        mock_client = AsyncMock()
        mock_client.get.return_value = mock_response
        mock_client_factory.return_value = mock_client

        results = await search_academic_papers_arxiv("attention", limit=1)
        assert isinstance(results, list)
        assert len(results) == 1
        paper = results[0]
        assert paper["title"] == "Attention Is All You Need"
        assert paper["authors"] == ["Ashish Vaswani", "Noam Shazeer"]
        assert paper["year"] == 2017
        assert paper["venue"] == "arXiv:cs.CL"
        assert paper["url"] == "https://arxiv.org/abs/2104.12345v1"
        assert paper["pdf_url"] == "https://arxiv.org/pdf/2104.12345v1"
        assert paper["doi"] == "https://doi.org/10.1234/test.doi"
        assert paper["citation_count"] == 0


@pytest.mark.asyncio
async def test_execute_academic_search_fallback():
    # Testa fallback quando arXiv retorna erro e Semantic Scholar responde
    dummy_s2_article = [{
        "title": "Fallback S2 Paper",
        "authors": ["Author One"],
        "year": 2023,
        "venue": "IEEE S&P",
        "snippet": "Test abstract",
        "url": "https://example.com",
        "doi": None,
        "citation_count": 42
    }]

    with patch("app.agents.tools.academic_search.search_academic_papers_arxiv", return_value="ERRO_RATE_LIMIT"):
        with patch("app.agents.tools.academic_search.search_academic_papers_s2", return_value=dummy_s2_article):
            res = await execute_academic_search.ainvoke({"query": "cybersecurity", "limit": 1})
            assert isinstance(res, list)
            assert len(res) == 1
            assert res[0]["title"] == "Fallback S2 Paper"
            assert res[0]["citation_count"] == 42
