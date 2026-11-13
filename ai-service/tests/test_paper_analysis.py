import pytest
from unittest.mock import AsyncMock, patch, MagicMock
from httpx import AsyncClient, ASGITransport

from app.main import app
from app.schemas.paper_analysis import (
    PaperAnalysisRequest,
    ScientificPaperAnalysis,
    PaperMetadata,
    PaperProblemAndObjectives,
    PaperMethodology,
    PaperFindings,
    PaperCritique,
    PaperContributions,
    AuthorAlignment,
)
from app.agents.sub_agents.methodology_reviewer import (
    run_paper_analysis,
    METHODOLOGY_SUBAGENT_SPEC,
)


def test_scientific_paper_analysis_schema():
    analysis = ScientificPaperAnalysis(
        metadata=PaperMetadata(
            title="Attention Is All You Need",
            authors=["Vaswani et al."],
            year=2017,
            venue="NeurIPS",
            doi="10.48550/arXiv.1706.03762",
        ),
        executive_summary="Propõe a arquitetura Transformer baseada unicamente em mecanismos de atenção.",
        problem_and_objectives=PaperProblemAndObjectives(
            research_question="É possível alcançar SOTA em tradução sem redes recorrentes ou convoluções?",
            theoretical_gap="Gargalo sequencial das RNNs que impede paralelização massiva.",
            objectives=["Propor arquitetura puramente baseada em self-attention."],
        ),
        methodology=PaperMethodology(
            study_type="Pesquisa Experimental Quantitativa",
            dataset_sample="WMT 2014 English-German e WMT 2014 English-French",
            instruments_methods="Multi-Head Attention, Scaled Dot-Product",
            analysis_techniques="BLEU score e consumo de FLOPs de treinamento",
        ),
        findings=PaperFindings(
            main_results=["Superou modelos recorrentes com menor tempo de treino."],
            empirical_metrics="28.4 BLEU no WMT 2014 En-De",
            hypotheses_corroborated=True,
        ),
        critique=PaperCritique(
            strengths=["Excelente paralelização computacional", "Novo paradigma para NLP"],
            declared_limitations=["Custo de memória quadrático com o tamanho da sequência"],
            internal_validity_threats=["Dependência intensa de hiperparâmetros de warmup"],
            external_validity_threats=["Testado primariamente em tarefas de tradução automática"],
        ),
        contributions=PaperContributions(
            theoretical_advance="Atenção como primitiva central dispensando recorrência",
            practical_implications="Base fundacional dos modelos de linguagem modernos",
            future_work=["Extensão para multimodalidade e sequências longas"],
        ),
        alignment=AuthorAlignment(
            relation_type="theoretical_foundation",
            suggested_sections=["Fundamentação Teórica", "Trabalhos Relacionados"],
            synthesis_note="Essencial citar como base arquitetural de atenção.",
        ),
    )

    data = analysis.model_dump()
    assert data["metadata"]["title"] == "Attention Is All You Need"
    assert "Custo de memória quadrático" in data["critique"]["declared_limitations"][0]
    assert data["findings"]["hypotheses_corroborated"] is True
    assert data["alignment"]["relation_type"] == "theoretical_foundation"


def test_methodology_subagent_spec():
    assert METHODOLOGY_SUBAGENT_SPEC["name"] == "methodology-reviewer"
    assert "auditoria metodológica" in METHODOLOGY_SUBAGENT_SPEC["description"]
    assert "validação" in METHODOLOGY_SUBAGENT_SPEC["system_prompt"] or "validade" in METHODOLOGY_SUBAGENT_SPEC["system_prompt"]


@pytest.mark.asyncio
async def test_run_paper_analysis_fallback():
    req = PaperAnalysisRequest(
        title="Estudo sobre Criptografia Pós-Quântica",
        abstract="Este artigo apresenta uma análise de algoritmos baseados em reticulados.",
        authors=["Alice", "Bob"],
        year=2024,
        author_topic="Segurança em Redes",
    )

    # Força exceção no structured output para verificar o fallback estruturado robusto
    with patch("app.agents.sub_agents.methodology_reviewer.get_llm") as mock_get_llm:
        mock_llm_instance = MagicMock()
        mock_structured = MagicMock()
        mock_structured.ainvoke = AsyncMock(side_effect=RuntimeError("LLM API indisponível"))
        mock_llm_instance.with_structured_output.return_value = mock_structured
        mock_get_llm.return_value = mock_llm_instance

        result = await run_paper_analysis(req)

        assert isinstance(result, ScientificPaperAnalysis)
        assert result.metadata.title == "Estudo sobre Criptografia Pós-Quântica"
        assert len(result.critique.declared_limitations) > 0
        assert len(result.critique.strengths) > 0
        assert result.alignment.relation_type == "complementary"


@pytest.mark.asyncio
async def test_paper_analysis_endpoint():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        payload = {
            "title": "Deep Learning for Anomaly Detection",
            "abstract": "We explore deep neural networks to detect network intrusion with 98% accuracy.",
            "authors": ["John Doe"],
            "year": 2023,
            "author_topic": "Detecção de Intrusão em Redes",
        }

        # Mock para evitar chamada de rede real no teste unitário
        with patch("app.agents.sub_agents.methodology_reviewer.get_llm") as mock_get_llm:
            mock_llm_instance = MagicMock()
            mock_structured = MagicMock()
            mock_structured.ainvoke = AsyncMock(side_effect=RuntimeError("Simulated LLM network timeout"))
            mock_llm_instance.with_structured_output.return_value = mock_structured
            mock_get_llm.return_value = mock_llm_instance

            response = await client.post("/internal/v1/papers/analyze", json=payload)
            assert response.status_code == 200
            data = response.json()
            assert data["metadata"]["title"] == "Deep Learning for Anomaly Detection"
            assert "critique" in data
            assert "strengths" in data["critique"]
            assert "declared_limitations" in data["critique"]
            assert "internal_validity_threats" in data["critique"]
