import logging
import os
from typing import Optional, Any
from app.core.config import settings

logger = logging.getLogger(__name__)


def get_correlated_opik_tracer(
    conversation_id: str,
    article_id: Optional[str] = None,
    otel_trace_id: Optional[str] = None,
) -> Optional[Any]:
    """
    Retorna uma instância de OpikTracer (LangChain / LangGraph) correlacionada com o W3C Trace Context.
    Se OPIK_URL_OVERRIDE estiver configurado, inicializa o tracer e propaga erros reais caso ocorram,
    sem mascarar problemas de conectividade, schema ou autenticação com fallbacks silenciosos.
    """
    if not settings.OPIK_URL_OVERRIDE:
        return None

    os.environ["OPIK_URL_OVERRIDE"] = settings.OPIK_URL_OVERRIDE
    if settings.OPIK_WORKSPACE:
        os.environ["OPIK_WORKSPACE"] = settings.OPIK_WORKSPACE

    try:
        from opik.integrations.langchain import OpikTracer
    except ImportError as exc:
        raise ImportError(
            "OPIK_URL_OVERRIDE está configurado, mas o pacote 'opik' não está instalado no ambiente."
        ) from exc

    try:
        return OpikTracer(
            project_name=settings.OPIK_PROJECT_NAME,
            metadata={
                "otel_trace_id": otel_trace_id or "unknown",
                "conversation_id": conversation_id,
                "article_id": article_id or "n/a",
            },
        )
    except Exception as exc:
        logger.error(f"[Opik] Erro ao instanciar OpikTracer: {exc}")
        raise RuntimeError(f"Falha ao conectar ou inicializar o OpikTracer: {str(exc)}") from exc
