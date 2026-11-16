import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app


@pytest.mark.asyncio
async def test_metrics_endpoint_returns_prometheus_data():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        # Faz uma requisição de health para gerar métrica de tráfego
        health_res = await ac.get("/health")
        assert health_res.status_code == 200

        # Faz scraping do endpoint de métricas
        metrics_res = await ac.get("/metrics")
        assert metrics_res.status_code == 200
        assert "text/plain" in metrics_res.headers.get("content-type", "")
        
        body = metrics_res.text
        # Verifica se as métricas do FastAPI Instrumentator e Python runtime estão presentes
        assert "http_requests_total" in body or "http_request_duration_seconds" in body
