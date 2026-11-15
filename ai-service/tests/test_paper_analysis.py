import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from httpx import ASGITransport, AsyncClient
from app.agents.sub_agents.methodology_reviewer import run_paper_analysis
from app.main import app
from app.schemas.paper_analysis import (
    AuthorAlignment,
    PaperAnalysisRequest,
    PaperContributions,
    PaperCritique,
    PaperFindings,
    PaperMetadata,
    PaperMethodology,
    PaperProblemAndObjectives,
    ScientificPaperAnalysis,
)


@pytest.fixture
def mock_scientific_analysis():
    return ScientificPaperAnalysis(
        metadata=PaperMetadata(
            title="Estudo sobre Criptografia Pós-Quântica",
            authors=["Alice", "Bob"],
            year=2024,
            venue="IEEE S&P",
            doi="10.1109/SP.2024.0001",
            arxiv_url="https://arxiv.org/abs/2401.00001",
            pdf_url="https://arxiv.org/pdf/2401.00001.pdf",
        ),
        executive_summary="Análise de algoritmos baseados em reticulados.",
        problem_and_objectives=PaperProblemAndObjectives(
            research_question="Como mitigar vulnerabilidades quânticas?",
            objectives=["Avaliar algoritmos NIST"],
        ),
        methodology=PaperMethodology(
            study_type="Experimental",
            dataset_sample="Testes criptográficos sintéticos",
        ),
        findings=PaperFindings(
            main_results=["Resistência comprovada sob simulação quântica"],
        ),
        critique=PaperCritique(
            strengths=["Rigor matemático"],
            declared_limitations=["Overhead computacional elevado"],
            internal_validity_threats=["Premissas teóricas"],
            external_validity_threats=["Hardware limitado"],
        ),
        contributions=PaperContributions(
            theoretical_advance="Novo esquema de assinaturas",
            future_work=["Otimização de chaves"],
        ),
        alignment=AuthorAlignment(
            relation_type="foundational",
            suggested_sections=["Fundamentação Teórica", "Segurança"],
            synthesis_note="Base essencial para o modelo proposto",
        ),
    )


@pytest.mark.asyncio
async def test_run_paper_analysis_success(mock_scientific_analysis):
    req = PaperAnalysisRequest(
        title="Estudo sobre Criptografia Pós-Quântica",
        abstract="Este artigo apresenta uma análise de algoritmos baseados em reticulados.",
        authors=["Alice", "Bob"],
        year=2024,
        author_topic="Segurança em Redes",
    )

    with patch("app.agents.sub_agents.methodology_reviewer.get_llm") as mock_get_llm:
        mock_llm_instance = MagicMock()
        mock_structured = MagicMock()
        mock_structured.ainvoke = AsyncMock(return_value=mock_scientific_analysis)
        mock_llm_instance.with_structured_output.return_value = mock_structured
        mock_get_llm.return_value = mock_llm_instance

        result = await run_paper_analysis(req)

        assert isinstance(result, ScientificPaperAnalysis)
        assert result.metadata.title == "Estudo sobre Criptografia Pós-Quântica"
        assert len(result.critique.strengths) > 0


@pytest.mark.asyncio
async def test_run_paper_analysis_raises_error_without_fallback():
    req = PaperAnalysisRequest(
        title="Estudo sobre Criptografia Pós-Quântica",
        abstract="Este artigo apresenta uma análise de algoritmos baseados em reticulados.",
        authors=["Alice", "Bob"],
        year=2024,
        author_topic="Segurança em Redes",
    )

    # Verifica que erros do LLM não são mascarados com fallbacks silenciosos
    with patch("app.agents.sub_agents.methodology_reviewer.get_llm") as mock_get_llm:
        mock_llm_instance = MagicMock()
        mock_structured = MagicMock()
        mock_structured.ainvoke = AsyncMock(side_effect=RuntimeError("LLM API indisponível"))
        mock_llm_instance.with_structured_output.return_value = mock_structured
        mock_get_llm.return_value = mock_llm_instance

        with pytest.raises(RuntimeError) as exc_info:
            await run_paper_analysis(req)

        assert "Falha na análise estruturada" in str(exc_info.value)
        assert "LLM API indisponível" in str(exc_info.value)


@pytest.mark.asyncio
async def test_paper_analysis_endpoint_success(mock_scientific_analysis):
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        payload = {
            "title": "Deep Learning for Anomaly Detection",
            "abstract": "We explore deep neural networks to detect network intrusion with 98% accuracy.",
            "authors": ["John Doe"],
            "year": 2023,
            "author_topic": "Detecção de Intrusão em Redes",
        }

        with patch("app.agents.sub_agents.methodology_reviewer.get_llm") as mock_get_llm:
            mock_llm_instance = MagicMock()
            mock_structured = MagicMock()
            mock_structured.ainvoke = AsyncMock(return_value=mock_scientific_analysis)
            mock_llm_instance.with_structured_output.return_value = mock_structured
            mock_get_llm.return_value = mock_llm_instance

            response = await client.post("/internal/v1/papers/analyze", json=payload)
            assert response.status_code == 200
            data = response.json()
            assert "critique" in data
            assert len(data["critique"]["strengths"]) > 0


@pytest.mark.asyncio
async def test_paper_analysis_endpoint_propagates_error():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        payload = {
            "title": "Deep Learning for Anomaly Detection",
            "abstract": "We explore deep neural networks to detect network intrusion with 98% accuracy.",
            "authors": ["John Doe"],
            "year": 2023,
            "author_topic": "Detecção de Intrusão em Redes",
        }

        with patch("app.agents.sub_agents.methodology_reviewer.get_llm") as mock_get_llm:
            mock_llm_instance = MagicMock()
            mock_structured = MagicMock()
            mock_structured.ainvoke = AsyncMock(side_effect=RuntimeError("Simulated LLM network timeout"))
            mock_llm_instance.with_structured_output.return_value = mock_structured
            mock_get_llm.return_value = mock_llm_instance

            response = await client.post("/internal/v1/papers/analyze", json=payload)
            assert response.status_code == 500
            data = response.json()
            assert "Simulated LLM network timeout" in data["detail"]
