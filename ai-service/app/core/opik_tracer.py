import logging
from typing import Optional, Any

logger = logging.getLogger(__name__)


def get_correlated_opik_tracer(
    conversation_id: str,
    article_id: Optional[str] = None,
    otel_trace_id: Optional[str] = None,
) -> Optional[Any]:
    """
    Retorna uma instância de OpikTracer (LangChain / LangGraph) correlacionada com o W3C Trace Context.
    Implementa resiliência Fail-Open estrita (ADR-013):
    Caso o Opik esteja indisponível, desabilitado ou o pacote não esteja presente,
    retorna None sem derrubar ou interromper a execução do fluxo de IA.
    """
    try:
        from opik.integrations.langchain import OpikTracer

        return OpikTracer(
            project_name="scia-academic-copilot",
            metadata={
                "otel_trace_id": otel_trace_id or "unknown",
                "conversation_id": conversation_id,
                "article_id": article_id or "n/a",
            },
        )
    except ImportError:
        logger.debug("[Opik] Pacote opik não instalado no ambiente. Fail-open ativo.")
        return None
    except Exception as exc:
        logger.warning(f"[Opik] Falha ao instanciar OpikTracer (fail-open ativo): {exc}")
        return None
