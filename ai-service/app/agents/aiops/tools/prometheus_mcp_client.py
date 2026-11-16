import httpx
import logging
from typing import Optional
from langchain_core.tools import tool
from app.core.config import settings

logger = logging.getLogger(__name__)

PROMETHEUS_BASE_URL = settings.PROMETHEUS_URL

@tool
async def promql_instant_query(query: str) -> str:
    """Executa uma consulta instantânea PromQL no Prometheus e retorna os valores das séries temporais.
    
    Args:
        query: Expressão PromQL (ex: 'up', 'process_resident_memory_bytes', 'rate(http_requests_total[5m])').
    """
    url = f"{PROMETHEUS_BASE_URL.rstrip('/')}/api/v1/query"
    try:
        async with httpx.AsyncClient(timeout=6.0) as client:
            resp = await client.get(url, params={"query": query})
            if resp.status_code != 200:
                return f"Erro Prometheus HTTP {resp.status_code}: {resp.text}"
            
            data = resp.json().get("data", {})
            results = data.get("result", [])
            if not results:
                return f"Nenhum dado retornado pelo Prometheus para a query: `{query}`."
            
            lines = [f"Resultados PromQL para `{query}` ({len(results)} séries):"]
            for r in results[:15]:
                metric = r.get("metric", {})
                labels_str = ", ".join(f"{k}={v}" for k, v in metric.items() if k != "__name__")
                val = r.get("value", [None, "0"])[1]
                lines.append(f"- [{metric.get('__name__', query)}] {labels_str}: {val}")
            
            if len(results) > 15:
                lines.append(f"... e mais {len(results) - 15} séries.")
            return "\n".join(lines)
    except Exception as exc:
        logger.error(f"[Prometheus MCP] Erro ao consultar {query}: {exc}")
        return f"Falha de conexão com o Prometheus ({PROMETHEUS_BASE_URL}): {str(exc)}"


@tool
async def promql_range_query(query: str, minutes_ago: int = 15, step_seconds: int = 60) -> str:
    """Executa uma consulta de intervalo PromQL (query_range) no Prometheus para analisar tendências temporais.
    
    Args:
        query: Expressão PromQL (ex: 'rate(scia_backend_http_requests_total[2m])', 'process_resident_memory_bytes').
        minutes_ago: Janela histórica em minutos (padrão: 15).
        step_seconds: Resolução temporal entre amostras em segundos (padrão: 60).
    """
    import time
    now = time.time()
    start = now - (max(1, min(minutes_ago, 180)) * 60)
    step = f"{max(10, step_seconds)}s"
    url = f"{PROMETHEUS_BASE_URL.rstrip('/')}/api/v1/query_range"

    try:
        async with httpx.AsyncClient(timeout=8.0) as client:
            resp = await client.get(url, params={"query": query, "start": str(start), "end": str(now), "step": step})
            if resp.status_code != 200:
                return f"Erro Prometheus HTTP {resp.status_code}: {resp.text}"

            data = resp.json().get("data", {})
            results = data.get("result", [])
            if not results:
                return f"Nenhum dado retornado no intervalo para `{query}` ({minutes_ago}m)."

            lines = [f"Tendência PromQL `{query}` (últimos {minutes_ago}m, resolução {step}):"]
            for r in results[:8]:
                metric = r.get("metric", {})
                labels = ", ".join(f"{k}={v}" for k, v in metric.items() if k != "__name__")
                values = r.get("values", [])
                if not values:
                    continue
                num_vals = [float(v[1]) for v in values if v[1] is not None]
                if num_vals:
                    v_min = min(num_vals)
                    v_max = max(num_vals)
                    v_latest = num_vals[-1]
                    lines.append(f"- [{labels or 'global'}] Atual: {v_latest:.2f} | Mín: {v_min:.2f} | Máx: {v_max:.2f} (amostras: {len(values)})")
            
            if len(results) > 8:
                lines.append(f"... e mais {len(results) - 8} séries temporais.")
            return "\n".join(lines)
    except Exception as exc:
        logger.error(f"[Prometheus Tools] Erro ao consultar range {query}: {exc}")
        return f"Falha de conexão com Prometheus ({PROMETHEUS_BASE_URL}): {str(exc)}"


@tool
async def promql_list_targets() -> str:
    """Inspeciona o estado de raspagem (scraping health) de todos os targets configurados no Prometheus.
    
    Verifica se microsserviços como scia-backend, scia-ai-service, scia-compiler e otel-collector estão UP ou DOWN.
    """
    url = f"{PROMETHEUS_BASE_URL.rstrip('/')}/api/v1/targets"
    try:
        async with httpx.AsyncClient(timeout=6.0) as client:
            resp = await client.get(url)
            if resp.status_code != 200:
                return f"Erro Prometheus HTTP {resp.status_code}: {resp.text}"

            data = resp.json().get("data", {})
            active_targets = data.get("activeTargets", [])
            if not active_targets:
                return "Nenhum target ativo registrado no Prometheus."

            lines = [f"Targets de Scraping do Prometheus ({len(active_targets)} alvos):"]
            for t in active_targets:
                job = t.get("labels", {}).get("job", "unknown")
                instance = t.get("labels", {}).get("instance", "unknown")
                health = t.get("health", "unknown").upper()
                last_error = t.get("lastError", "")
                icon = "🟢" if health == "UP" else "🔴"
                error_suffix = f" (Erro: {last_error})" if last_error and health != "UP" else ""
                lines.append(f"{icon} Job `{job}` em `{instance}`: {health}{error_suffix}")
            return "\n".join(lines)
    except Exception as exc:
        logger.error(f"[Prometheus Tools] Erro ao listar targets: {exc}")
        return f"Falha ao consultar targets no Prometheus: {str(exc)}"


@tool
async def promql_get_active_alerts() -> str:
    """Verifica regras de alerta ativas ou disparadas (firing / pending) no Prometheus."""
    url = f"{PROMETHEUS_BASE_URL.rstrip('/')}/api/v1/alerts"
    try:
        async with httpx.AsyncClient(timeout=6.0) as client:
            resp = await client.get(url)
            if resp.status_code != 200:
                return f"Erro Prometheus HTTP {resp.status_code}: {resp.text}"

            data = resp.json().get("data", {})
            alerts = data.get("alerts", [])
            if not alerts:
                return "🟢 Nenhum alerta ativo ou pendente no Prometheus (Zero alertas disparados)."

            lines = [f"⚠️ Alertas Ativos no Prometheus ({len(alerts)}):"]
            for a in alerts:
                state = a.get("state", "unknown").upper()
                name = a.get("labels", {}).get("alertname", "UnnamedAlert")
                severity = a.get("labels", {}).get("severity", "warning")
                summary = a.get("annotations", {}).get("summary", a.get("annotations", {}).get("description", ""))
                lines.append(f"- [{state}] {name} ({severity}): {summary}")
            return "\n".join(lines)
    except Exception as exc:
        logger.error(f"[Prometheus Tools] Erro ao consultar alertas: {exc}")
        return f"Falha ao consultar alertas no Prometheus: {str(exc)}"


@tool
async def promql_cluster_health() -> str:
    """Coleta o panorama de saúde dos serviços monitorados via métricas do Prometheus (status up, serviços ativos)."""
    return await promql_instant_query.ainvoke({"query": "up"})
