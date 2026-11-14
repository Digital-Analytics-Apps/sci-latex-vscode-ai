from app.core.opik_tracer import get_correlated_opik_tracer


def test_opik_tracer_fail_open_resilience():
    # Testa que o helper não lança exceção e opera em fail-open mesmo sem Opik ativo
    tracer = get_correlated_opik_tracer(
        conversation_id="conv-123",
        article_id="art-456",
        otel_trace_id="00000000000000004bf92f3577b34da6",
    )
    # Se opik não estiver configurado localmente, retorna None de forma segura (fail-open)
    assert tracer is None or hasattr(tracer, "metadata")
