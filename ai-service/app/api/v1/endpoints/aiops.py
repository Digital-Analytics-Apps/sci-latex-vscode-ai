import logging
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from app.core.config import settings
from app.core.m2m_auth import verify_m2m_token
from app.agents.aiops.sre_supervisor import run_aiops_chat

logger = logging.getLogger(__name__)
router = APIRouter()

class AiopsChatRequest(BaseModel):
    content: str
    history: Optional[List[Dict[str, str]]] = None
    serviceContext: Optional[str] = None
    incidentId: Optional[str] = None
    userId: Optional[str] = None

class AiopsChatResponse(BaseModel):
    message: str
    incidentId: Optional[str] = None
    serviceContext: Optional[str] = None
    suggestedActions: Optional[List[Dict[str, Any]]] = None

@router.post("/aiops/chat", response_model=AiopsChatResponse)
async def aiops_chat_endpoint(
    request: AiopsChatRequest,
    principal: Dict[str, Any] = Depends(verify_m2m_token),
):
    """
    Endpoint interno M2M para o SRE Supervisor Agent (AIOps).
    Autenticado via JWT M2M criptográfico (ADR-012) com escopos técnicos.
    Recebe consultas operacionais do Fastify e coordena o Barramento MCP via Tool Calling nativo.
    """
    try:
        effective_user_id = request.userId or principal.get("actor", {}).get("userId") or principal.get("sub")
        logger.info(f"[AIOps API] Requisição recebida com M2M sub={principal.get('sub')} actor={effective_user_id}")
        result = await run_aiops_chat(
            user_prompt=request.content,
            history=request.history,
            service_context=request.serviceContext,
            incident_id=request.incidentId,
        )

        return AiopsChatResponse(
            message=result["message"],
            incidentId=result.get("incidentId"),
            serviceContext=result.get("serviceContext"),
            suggestedActions=result.get("suggestedActions"),
        )
    except Exception as exc:
        logger.error(f"[AIOps API] Erro ao processar chat de SRE: {exc}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Falha interna no SRE Supervisor: {str(exc)}",
        )
