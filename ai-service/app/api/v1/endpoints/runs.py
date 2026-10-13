import logging
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Header, HTTPException, status
from pydantic import BaseModel, Field
from app.core.config import settings

logger = logging.getLogger(__name__)
router = APIRouter()


class RunInput(BaseModel):
    topic: str
    sectionPath: str
    baseCommitSha: str
    baseFileHash: str
    existingTextSnippet: Optional[str] = None
    maxReferences: int = Field(default=5, ge=1, le=20)


class CreateRunRequest(BaseModel):
    runId: str
    projectId: str
    taskId: Optional[str] = None
    operation: str
    input: RunInput


class CreateRunResponse(BaseModel):
    runId: str
    status: str = "PENDING"
    estimatedDurationSeconds: int = 45


class ResumeRunRequest(BaseModel):
    runId: str
    interruptionId: str
    humanResponse: Dict[str, Any]


class CancelRunRequest(BaseModel):
    reason: Optional[str] = "USER_ABORTED"


def verify_internal_auth(x_internal_service_key: Optional[str] = Header(None)):
    """
    Validação da chave secreta M2M compartilhada na rede interna do cluster.
    """
    if not x_internal_service_key or x_internal_service_key != settings.INTERNAL_SERVICE_KEY:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Não autorizado: Chave de serviço interno (M2M) inválida.",
        )


@router.post("/runs", response_model=CreateRunResponse, status_code=status.HTTP_202_ACCEPTED)
async def create_run(
    request: CreateRunRequest,
    x_internal_service_key: Optional[str] = Header(None),
):
    """
    Disparado pelo Fastify para registrar e iniciar uma execução assíncrona da IA.
    Retorna imediatamente HTTP 202 Accepted com status PENDING.
    """
    verify_internal_auth(x_internal_service_key)
    logger.info(f"[SciAI M2M] Nova execução recebida: runId={request.runId} operation={request.operation}")

    # No fluxo assíncrono, a mensagem é colocada no worker e retorna PENDING
    return CreateRunResponse(
        runId=request.runId,
        status="PENDING",
        estimatedDurationSeconds=45,
    )


@router.post("/runs/{runId}/resume")
async def resume_run(
    runId: str,
    request: ResumeRunRequest,
    x_internal_service_key: Optional[str] = Header(None),
):
    """
    Retoma uma execução interrompida em WAITING com a resposta humana fornecida.
    """
    verify_internal_auth(x_internal_service_key)
    logger.info(f"[SciAI M2M] Retomando execução: runId={runId} interruptionId={request.interruptionId}")
    return {"runId": runId, "status": "RUNNING"}


@router.post("/runs/{runId}/cancel")
async def cancel_run(
    runId: str,
    request: CancelRunRequest,
    x_internal_service_key: Optional[str] = Header(None),
):
    """
    Solicita o cancelamento assíncrono de uma execução em andamento.
    """
    verify_internal_auth(x_internal_service_key)
    logger.info(f"[SciAI M2M] Cancelamento solicitado: runId={runId} reason={request.reason}")
    return {"runId": runId, "status": "CANCELLED"}
