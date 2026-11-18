import asyncio
import json
import logging
from typing import Any, Dict, Optional
from fastapi import APIRouter, Header, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from langchain_core.messages import HumanMessage
from langgraph.types import Command
from langgraph.checkpoint.memory import MemorySaver
from app.agents.sub_agents.supervisor import get_onboarding_supervisor
from app.streaming.stream_processor import StreamProcessor
from app.core.config import settings
from app.core.opik_tracer import get_correlated_opik_tracer

logger = logging.getLogger(__name__)
router = APIRouter()
processor = StreamProcessor()

async def _safe_flush_tracer(tracer: Any) -> None:
    """
    Executa o flush síncrono do tracer em worker thread desacoplada com timeout de 2s.
    Garante resiliência (fail-open) e impede que retentativas de I/O bloqueiem o event loop do Uvicorn.
    """
    if tracer and hasattr(tracer, "flush"):
        try:
            await asyncio.wait_for(asyncio.to_thread(tracer.flush), timeout=2.0)
        except Exception as flush_err:
            logger.warning(f"[Opik] Erro ao descarregar buffer (fail-open): {flush_err}")

# Instância padrão do supervisor com checkpointer em memória (para MVP e experimentação)
# Preserva o histórico de mensagens e o estado por thread_id (conversation_id)
# Permite paradas com interrupt() e retomadas via /chat/resume
chat_checkpointer = MemorySaver()
supervisor_graph = get_onboarding_supervisor(checkpointer=chat_checkpointer)

class ChatStreamRequest(BaseModel):
    conversation_id: str
    message: str
    user_id: Optional[str] = None
    context: Optional[Dict[str, Any]] = None


class ChatResumeRequest(BaseModel):
    conversation_id: str
    decision: Dict[str, Any]


@router.post("/chat/stream")
async def chat_stream_endpoint(
    request: ChatStreamRequest,
    traceparent: Optional[str] = Header(None),
):
    """
    Endpoint de streaming SSE para interação conversacional com o Onboarding.
    """
    article_id = request.context.get("article_id") if request.context else None
    tracer = get_correlated_opik_tracer(
        conversation_id=request.conversation_id,
        article_id=article_id,
        otel_trace_id=traceparent,
    )
    callbacks = [tracer] if tracer else []
    config = {
        "configurable": {"thread_id": request.conversation_id},
        "callbacks": callbacks,
    }

    async def event_generator():
        try:
            yield f"data: {json.dumps({'type': 'status', 'message': 'Conectado ao SCIA. Consultando especialistas...'})}\n\n"
            input_data = {
                "messages": [HumanMessage(content=request.message)],
                "conversation_id": request.conversation_id,
                "user_id": request.user_id,
            }

            graph_stream = supervisor_graph.astream(
                input_data, config=config, stream_mode="updates"
            )

            async for sse_event in processor.process_stream(graph_stream):
                yield sse_event

            # Sinaliza fim do turno
            yield f"data: {json.dumps({'type': 'done'})}\n\n"

        except Exception as e:
            logger.exception("Erro no streaming do chat")
            yield f"data: {json.dumps({'type': 'error', 'message': str(e)})}\n\n"
        finally:
            await _safe_flush_tracer(tracer)

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@router.post("/chat/resume")
async def chat_resume_endpoint(
    request: ChatResumeRequest,
    traceparent: Optional[str] = Header(None),
):
    """
    Retoma o grafo a partir de uma interrupção (Human-in-the-Loop),
    passando as escolhas do autor (ex: artigos selecionados, aprovação do cronograma).
    """
    tracer = get_correlated_opik_tracer(
        conversation_id=request.conversation_id,
        otel_trace_id=traceparent,
    )
    callbacks = [tracer] if tracer else []
    config = {
        "configurable": {"thread_id": request.conversation_id},
        "callbacks": callbacks,
    }

    async def resume_generator():
        try:
            yield f"data: {json.dumps({'type': 'status', 'message': 'Retomando o fluxo com sua decisão...'})}\n\n"
            resume_cmd = Command(resume=request.decision)
            graph_stream = supervisor_graph.astream(
                resume_cmd, config=config, stream_mode="updates"
            )

            async for sse_event in processor.process_stream(graph_stream):
                yield sse_event

            yield f"data: {json.dumps({'type': 'done'})}\n\n"

        except Exception as e:
            logger.exception("Erro na retomada do grafo")
            yield f"data: {json.dumps({'type': 'error', 'message': str(e)})}\n\n"
        finally:
            await _safe_flush_tracer(tracer)

    return StreamingResponse(
        resume_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )
