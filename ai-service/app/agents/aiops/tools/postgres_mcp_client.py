import csv
import io
import logging
import os
import subprocess
import urllib.parse
from typing import Dict, Any, List, Optional
import asyncpg
from langchain_core.tools import tool
from app.core.config import settings

logger = logging.getLogger(__name__)

# Fallback hierárquico: se DATABASE_URL ou AIOPS_DATABASE_URL estiver presente, faz parse para defaults
_db_url = os.environ.get("DATABASE_URL") or getattr(settings, "DATABASE_URL", None) or os.environ.get("AIOPS_DATABASE_URL") or settings.AIOPS_DATABASE_URL
_def_host = getattr(settings, "POSTGRES_HOST", "localhost")
_def_port = getattr(settings, "POSTGRES_PORT", 5432)
_def_user = getattr(settings, "POSTGRES_USER", "postgres")
_def_pass = getattr(settings, "POSTGRES_PASSWORD", "postgres")
_def_db = getattr(settings, "POSTGRES_DB", "sci_latex_db")

if _db_url:
    try:
        _parsed = urllib.parse.urlparse(_db_url)
        _def_host = _parsed.hostname or _def_host
        _def_port = _parsed.port or _def_port
        _def_user = _parsed.username or _def_user
        _def_pass = _parsed.password or _def_pass
        _def_db = _parsed.path.lstrip("/") or _def_db
    except Exception:
        pass

POSTGRES_HOST = os.environ.get("POSTGRES_HOST", _def_host)
POSTGRES_PORT = int(os.environ.get("POSTGRES_PORT", _def_port))
POSTGRES_USER = os.environ.get("POSTGRES_USER", _def_user)
POSTGRES_PASSWORD = os.environ.get("POSTGRES_PASSWORD", _def_pass)
POSTGRES_DB = os.environ.get("POSTGRES_DB", _def_db)

_def_pgbouncer_host = getattr(settings, "PGBOUNCER_HOST", POSTGRES_HOST)
_def_pgbouncer_port = getattr(settings, "PGBOUNCER_PORT", 6543)
PGBOUNCER_HOST = os.environ.get("PGBOUNCER_HOST", _def_pgbouncer_host)
PGBOUNCER_PORT = int(os.environ.get("PGBOUNCER_PORT", _def_pgbouncer_port))

async def _get_pg_connection(database: str = POSTGRES_DB) -> asyncpg.Connection:
    return await asyncpg.connect(
        host=POSTGRES_HOST,
        port=POSTGRES_PORT,
        user=POSTGRES_USER,
        password=POSTGRES_PASSWORD,
        database=database,
        timeout=5.0,
    )

@tool
async def postgres_inspect_health() -> str:
    """Inspeciona o estado operacional, saúde e conexões do PostgreSQL 16 (Cache Hit Ratio, Conexões ativas/idle, Tamanho das bases)."""
    try:
        conn = await _get_pg_connection()
        try:
            # 1. Versão e uptime
            version_row = await conn.fetchrow("SELECT version();")
            version_str = version_row["version"].split(",")[0] if version_row else "PostgreSQL 16"

            # 2. Conexões por estado
            state_rows = await conn.fetch("""
                SELECT 
                    coalesce(state, 'unknown') as state,
                    count(*) as count
                FROM pg_stat_activity
                GROUP BY state;
            """)
            states_dict = {r["state"]: r["count"] for r in state_rows}
            total_conns = sum(states_dict.values())
            active_conns = states_dict.get("active", 0)
            idle_conns = states_dict.get("idle", 0)
            idle_in_tx = states_dict.get("idle in transaction", 0)

            # 3. Cache Hit Ratio
            cache_row = await conn.fetchrow("""
                SELECT 
                    sum(blks_hit) * 100.0 / nullif(sum(blks_hit + blks_read), 0) AS cache_hit_ratio
                FROM pg_stat_database;
            """)
            cache_hit = round(cache_row["cache_hit_ratio"], 2) if cache_row and cache_row["cache_hit_ratio"] else 0.0

            # 4. Tamanho dos Bancos
            size_rows = await conn.fetch("""
                SELECT 
                    datname,
                    pg_size_pretty(pg_database_size(datname)) as size
                FROM pg_database
                WHERE datname in ('sci_latex_db', 'sci_aiops_db');
            """)
            sizes_str = ", ".join(f"`{r['datname']}`: {r['size']}" for r in size_rows)

            # 5. Avaliação de Alerta
            status_badge = "🟢 Saudável"
            alerts = []
            if cache_hit < 95.0 and cache_hit > 0:
                alerts.append(f"⚠️ Cache Hit Ratio baixo ({cache_hit}%). Ideal > 99%.")
            if idle_in_tx > 3:
                alerts.append(f"⚠️ {idle_in_tx} transações em 'idle in transaction' (risco de retenção de locks).")
            if total_conns > 80:
                alerts.append(f"⚠️ Volume elevado de conexões diretas ({total_conns}/100). Recomenda-se PgBouncer.")

            alert_msg = "\n".join(f"> [!WARNING]\n> {a}" for a in alerts) if alerts else "> [!NOTE]\n> Parâmetros dentro das faixas recomendadas de SLA (ADR-015)."

            return f"""### 🐘 Saúde Operacional do PostgreSQL 16

**Engine:** `{version_str}`  
**Status Geral:** **{status_badge}**  
**Eficiência de Memória (Cache Hit Ratio):** **`{cache_hit}%`** *(leituras atendidas em RAM)*  
**Bases de Dados Monitoradas:** {sizes_str}  

#### 📊 Estado das Conexões Atuais:
- **Total de Conexões:** {total_conns}
- **Ativas (executando queries):** {active_conns}
- **Ociosas (`idle`):** {idle_conns}
- **Ociosas em Transação (`idle in transaction`):** {idle_in_tx}

{alert_msg}
"""
        finally:
            await conn.close()
    except Exception as exc:
        logger.error(f"[Postgres MCP] Erro ao inspecionar saúde: {exc}")
        return f"Falha de conexão com o PostgreSQL ({POSTGRES_HOST}:{POSTGRES_PORT}): {str(exc)}"


@tool
async def postgres_check_slow_queries_and_locks() -> str:
    """Verifica queries em execução lenta (> 2s), transações presas em 'idle in transaction' e contenção de locks no PostgreSQL."""
    try:
        conn = await _get_pg_connection()
        try:
            # 1. Queries lentas (> 2s) excluindo a própria query de monitoramento
            slow_rows = await conn.fetch("""
                SELECT 
                    pid,
                    now() - pg_stat_activity.query_start AS duration,
                    state,
                    query
                FROM pg_stat_activity
                WHERE (now() - pg_stat_activity.query_start) > interval '2 seconds'
                  AND state != 'idle'
                  AND pid != pg_backend_pid()
                ORDER BY duration DESC
                LIMIT 5;
            """)

            # 2. Transações presas em idle in transaction (> 10s)
            idle_tx_rows = await conn.fetch("""
                SELECT 
                    pid,
                    now() - state_change AS idle_duration,
                    query
                FROM pg_stat_activity
                WHERE state = 'idle in transaction'
                  AND (now() - state_change) > interval '10 seconds'
                ORDER BY idle_duration DESC
                LIMIT 5;
            """)

            # 3. Locks bloqueantes
            lock_rows = await conn.fetch("""
                SELECT 
                    count(*) as blocked_count
                FROM pg_catalog.pg_locks blocked_locks
                WHERE NOT blocked_locks.granted;
            """)
            blocked_count = lock_rows[0]["blocked_count"] if lock_rows else 0

            lines = ["### 🔍 Diagnóstico de Queries e Contenção de Locks (PostgreSQL 16)"]

            if not slow_rows and not idle_tx_rows and blocked_count == 0:
                lines.append("🟢 **Nenhuma query lenta ou lock bloqueante detectado no momento.**")
                lines.append("- Queries em execução > 2s: **0**")
                lines.append("- Transações presas em `idle in transaction` (>10s): **0**")
                lines.append("- Processos aguardando locks de tabela/linha: **0**")
                return "\n".join(lines)

            if slow_rows:
                lines.append(f"\n⚠️ **Queries Lentas Detectadas ({len(slow_rows)}):**")
                for r in slow_rows:
                    q_snippet = r["query"][:150].replace("\n", " ")
                    lines.append(f"- **PID {r['pid']}** (Duração: `{r['duration']}`, Estado: `{r['state']}`): `{q_snippet}`")

            if idle_tx_rows:
                lines.append(f"\n⚠️ **Transações Ociosas em Aberto (`idle in transaction`) ({len(idle_tx_rows)}):**")
                for r in idle_tx_rows:
                    lines.append(f"- **PID {r['pid']}** (Tempo Ocioso: `{r['idle_duration']}`): Último comando: `{r['query'][:120]}`")

            if blocked_count > 0:
                lines.append(f"\n🔴 **Locks Bloqueantes:** {blocked_count} processos aguardando liberação de locks de concorrência!")

            return "\n".join(lines)
        finally:
            await conn.close()
    except Exception as exc:
        logger.error(f"[Postgres MCP] Erro ao checar queries lentas: {exc}")
        return f"Falha ao consultar estatísticas de queries no PostgreSQL: {str(exc)}"


@tool
async def pgbouncer_inspect_pools() -> str:
    """Inspeciona o pooler de conexões PgBouncer (Porta 6543, Modo Transaction Pooling, Clientes Ativos, Filas de Espera)."""
    try:
        proc = subprocess.run(
            ["psql", "-h", PGBOUNCER_HOST, "-p", str(PGBOUNCER_PORT), "-U", POSTGRES_USER, "-d", "pgbouncer", "-c", "SHOW POOLS;", "--csv"],
            env={**os.environ, "PGPASSWORD": POSTGRES_PASSWORD},
            capture_output=True,
            text=True,
            timeout=4.0,
        )

        if proc.returncode != 0:
            return f"Não foi possível consultar o PgBouncer na porta {PGBOUNCER_PORT}: {proc.stderr.strip()}"

        reader = csv.DictReader(io.StringIO(proc.stdout.strip()))
        pools = list(reader)

        if not pools:
            return "Nenhum pool retornado pelo PgBouncer."

        lines = [
            f"### 🛡️ Monitoramento do PgBouncer (Porta {PGBOUNCER_PORT} — ADR-015)",
            "| Banco | Modo de Pool | Clientes Ativos | Clientes em Fila (`waiting`) | Conexões Servidor Ativas | Conexões Servidor Ociosas | Espera Máx |",
            "| :--- | :--- | :--- | :--- | :--- | :--- | :--- |",
        ]

        has_waiting = False
        for p in pools:
            db_name = p.get("database", "unknown")
            if db_name == "pgbouncer":
                continue
            cl_active = p.get("cl_active", "0")
            cl_waiting = p.get("cl_waiting", "0")
            sv_active = p.get("sv_active", "0")
            sv_idle = p.get("sv_idle", "0")
            mode = p.get("pool_mode", "transaction")
            maxwait = p.get("maxwait", "0")

            if int(cl_waiting) > 0:
                has_waiting = True

            lines.append(f"| `{db_name}` | **{mode}** | {cl_active} | **{cl_waiting}** | {sv_active} | {sv_idle} | {maxwait}s |")

        lines.append("\n#### 🔍 Diagnóstico do Pooler:")
        if has_waiting:
            lines.append("> [!WARNING]\n> **Pool Exaurido!** Há conexões de clientes aguardando na fila do PgBouncer (`cl_waiting > 0`). Recomenda-se aumentar `default_pool_size` ou avaliar queries lentas no banco.")
        else:
            lines.append("🟢 **Capacidade Adequada:** 0 clientes aguardando em fila. O PgBouncer está multiplexando o tráfego do Fastify com sucesso, protegendo o limite de conexões físicas (`max_connections`) do PostgreSQL.")

        return "\n".join(lines)
    except Exception as exc:
        logger.error(f"[PgBouncer MCP] Erro ao consultar PgBouncer: {exc}")
        return f"PgBouncer indisponível na porta {PGBOUNCER_PORT}: {str(exc)}"
