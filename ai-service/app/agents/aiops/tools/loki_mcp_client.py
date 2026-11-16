import time
import httpx
import logging
from typing import Optional
from langchain_core.tools import tool
from app.core.config import settings

logger = logging.getLogger(__name__)

LOKI_BASE_URL = settings.LOKI_URL

@tool
async def loki_query_logs(
    query: str = '{job=~".+"} |= "error"',
    limit: int = 25,
    minutes_ago: int = 30,
) -> str:
    """Executa uma consulta LogQL no Loki para inspecionar logs estruturados, erros, timeouts e exceções.
    
    Args:
        query: Consulta LogQL (ex: '{job=~".+"} |= "error"', '{service_name="backend"} |= "exception"').
        limit: Quantidade máxima de linhas de log (padrão: 25).
        minutes_ago: Janela temporal de busca em minutos atrás (padrão: 30).
    """
    url = f"{LOKI_BASE_URL.rstrip('/')}/loki/api/v1/query_range"
    now_ns = int(time.time() * 1e9)
    start_ns = now_ns - int(minutes_ago * 60 * 1e9)

    params = {
        "query": query,
        "limit": limit,
        "start": start_ns,
        "end": now_ns,
        "direction": "BACKWARD",
    }

    try:
        async with httpx.AsyncClient(timeout=6.0) as client:
            resp = await client.get(url, params=params)
            if resp.status_code != 200:
                return f"Erro Loki HTTP {resp.status_code}: {resp.text}"

            streams = resp.json().get("data", {}).get("result", [])
            if not streams:
                return f"Nenhum log retornado pelo Loki para a consulta `{query}` nos últimos {minutes_ago} minutos (Ambiente Estável sem erros na janela)."

            total_entries = 0
            lines = [f"Resultados Loki para `{query}` (janela: {minutes_ago}m):"]
            for s in streams:
                stream_labels = s.get("stream", {})
                svc = stream_labels.get("service_name") or stream_labels.get("job") or "unknown"
                for ts_ns, log_line in s.get("values", []):
                    total_entries += 1
                    lines.append(f"- [{svc}] {log_line.strip()[:200]}")
                    if total_entries >= limit:
                        break
                if total_entries >= limit:
                    break

            return "\n".join(lines)
    except Exception as exc:
        logger.error(f"[Loki MCP] Erro ao consultar {query}: {exc}")
        return f"Falha de conexão com o Loki ({LOKI_BASE_URL}): {str(exc)}"
