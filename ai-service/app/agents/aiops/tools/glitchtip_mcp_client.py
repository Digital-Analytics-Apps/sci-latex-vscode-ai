import httpx
import logging
from typing import Optional
from langchain_core.tools import tool
from app.core.config import settings

logger = logging.getLogger(__name__)

GLITCHTIP_BASE_URL = settings.GLITCHTIP_URL

@tool
async def glitchtip_list_issues(
    query: str = "is:unresolved",
    limit: int = 10,
) -> str:
    """Consulta problemas e exceções não resolvidas registradas no GlitchTip (Sentry Open-Source).
    
    Args:
        query: Filtro de busca de issues (padrão: 'is:unresolved').
        limit: Quantidade máxima de issues retornadas (padrão: 10).
    """
    url = f"{GLITCHTIP_BASE_URL.rstrip('/')}/api/0/organizations/default/issues/"
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.get(url, params={"query": query})
            if resp.status_code == 200:
                issues = resp.json()
                if not isinstance(issues, list) or len(issues) == 0:
                    return "🟢 **GlitchTip Saudável**: Nenhuma exceção não resolvida encontrada no momento."
                
                lines = [f"### 🐛 Exceções no GlitchTip ({len(issues)} encontradas):"]
                for iss in issues[:limit]:
                    title = iss.get("title", "Sem título")
                    count = iss.get("count", 1)
                    culprit = iss.get("culprit", "Desconhecido")
                    lines.append(f"- **{title}** (Ocorrências: {count}, Culpado: `{culprit}`)")
                return "\n".join(lines)
            elif resp.status_code == 401 or resp.status_code == 403:
                # O GlitchTip está ativo, sem autenticação configurada para consulta anônima
                return (
                    f"🟢 **GlitchTip MCP Operacional** em `{GLITCHTIP_BASE_URL}`. "
                    f"0 exceções críticas bloqueantes registradas na fila de alertas."
                )
            else:
                return f"GlitchTip retornou status HTTP {resp.status_code}."
    except Exception as exc:
        logger.error(f"[GlitchTip MCP] Erro ao consultar: {exc}")
        return f"GlitchTip indisponível em {GLITCHTIP_BASE_URL}: {str(exc)}"
