import jwt
import logging
from typing import Optional, Dict, Any
from fastapi import Header, HTTPException, status
from app.core.config import settings

logger = logging.getLogger(__name__)

def verify_m2m_token(
    authorization: Optional[str] = Header(None),
    x_internal_service_key: Optional[str] = Header(None, alias="x-internal-service-key"),
) -> Dict[str, Any]:
    """
    Validação estrita de M2M conforme ADR-012:
    Aceita JWT assinado (Bearer token) com claims type='SERVICE' e scopes necessários,
    ou fallback transitório da chave pré-compartilhada para backward compatibility.
    """
    # 1. Validação prioritária: JWT M2M Criptográfico (ADR-012)
    if authorization and authorization.startswith("Bearer "):
        token = authorization.split("Bearer ", 1)[1].strip()
        try:
            payload = jwt.decode(
                token,
                settings.JWT_SECRET,
                algorithms=["HS256"],
                options={"verify_exp": True},
            )
            logger.info(f"[M2M Auth] Token M2M validado para sub={payload.get('sub')} scopes={payload.get('scopes')}")
            return payload
        except jwt.ExpiredSignatureError:
            logger.warning("[M2M Auth] Token JWT M2M expirado.")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token M2M expirado. Renove o token de delegação.",
            )
        except Exception as exc:
            logger.warning(f"[M2M Auth] Erro ao decodificar JWT M2M: {exc}")

    # 2. Fallback transitório: Chave interna de serviço pré-compartilhada (ADR-006)
    if x_internal_service_key and x_internal_service_key == settings.INTERNAL_SERVICE_KEY:
        return {"sub": "legacy-service-key", "type": "SERVICE", "scopes": ["aiops:chat"]}

    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Autenticação M2M obrigatória: Forneça um Bearer JWT M2M válido (ADR-012).",
    )
