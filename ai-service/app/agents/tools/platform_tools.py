import logging
from typing import Any, Dict, List, Optional
import httpx
from langchain_core.tools import tool
from app.core.config import settings

logger = logging.getLogger(__name__)


def get_m2m_client() -> httpx.AsyncClient:
    return httpx.AsyncClient(
        timeout=10.0,
        headers={
            "Content-Type": "application/json",
            "X-Internal-Service-Key": settings.INTERNAL_SERVICE_KEY,
        },
    )


@tool
async def list_available_templates() -> List[Dict[str, Any]]:
    """
    Consulta os templates LaTeX reais e ativos cadastrados no banco de dados e no MinIO.
    Retorna uma lista contendo id, name, description e targetConference de cada template.
    Utilize esta ferramenta no Estágio 3 para apresentar os modelos oficiais disponíveis ao autor.
    """
    url = f"{settings.BACKEND_API_URL}/api/v1/templates"
    logger.info(f"[PlatformTools] Consultando templates disponíveis em {url}")

    async with get_m2m_client() as client:
        try:
            response = await client.get(url)
            response.raise_for_status()
            data = response.json()
            templates = data.get("templates", []) if isinstance(data, dict) else data

            results = []
            for tpl in templates:
                results.append({
                    "id": tpl.get("id"),
                    "name": tpl.get("name"),
                    "description": tpl.get("description"),
                    "target_conference": tpl.get("targetConference"),
                })
            return results
        except Exception as e:
            logger.error(f"[PlatformTools] Falha ao listar templates: {str(e)}")
            return []


@tool
async def search_institutional_users(
    query: str = "", role: Optional[str] = None
) -> List[Dict[str, Any]]:
    """
    Pesquisa membros, docentes e administradores da instituição cadastrados no sistema.
    Permite filtrar por termo de busca (nome ou e-mail) e pelo papel (role).

    Parâmetros:
    - query: termo de busca (ex: 'Roce', 'Gilson', 'carlos@...')
    - role: papel desejado ('COORDINATOR' para orientador/coordenador técnico, ou 'MANAGER' para gerente institucional)

    Retorna lista de usuários reais contendo id, name, email e role.
    """
    params = {}
    if query.strip():
        params["search"] = query.strip()
    if role and role.upper() in ("COORDINATOR", "MANAGER", "ADMIN", "AUTHOR", "REVIEWER"):
        params["role"] = role.upper()

    url = f"{settings.BACKEND_API_URL}/api/v1/users"
    logger.info(f"[PlatformTools] Buscando usuários em {url} com params: {params}")

    async with get_m2m_client() as client:
        try:
            response = await client.get(url, params=params)
            response.raise_for_status()
            data = response.json()
            users = data.get("users", []) if isinstance(data, dict) else []

            results = []
            for u in users:
                results.append({
                    "id": u.get("id"),
                    "name": u.get("name"),
                    "email": u.get("email"),
                    "role": u.get("role"),
                })
            return results
        except Exception as e:
            logger.error(f"[PlatformTools] Falha ao buscar usuários: {str(e)}")
            return []
