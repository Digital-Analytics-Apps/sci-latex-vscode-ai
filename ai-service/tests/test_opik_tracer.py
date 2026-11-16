from app.core.opik_tracer import get_correlated_opik_tracer


def test_opik_tracer_instantiation():
    # Testa a inicialização do tracer com metadados correlacionados
    tracer = get_correlated_opik_tracer(
        conversation_id="conv-123",
        article_id="art-456",
        otel_trace_id="00000000000000004bf92f3577b34da6",
    )
    # Se opik estiver configurado, deve retornar uma instância válida com o método flush
    assert tracer is not None
    assert hasattr(tracer, "flush")
