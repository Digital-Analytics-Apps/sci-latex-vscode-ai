# Proposed PostgreSQL Diagnostic MCP contracts

| Tool | Inputs | Output |
|---|---|---|
| `postgres_inspect_health` | cluster reference | reachability, version, active/idle connections, cache hit ratio, db sizes |
| `postgres_check_slow_queries_and_locks` | cluster reference, min duration | slow queries (>2s), idle-in-tx (>10s), ungranted locks |
| `pgbouncer_inspect_pools` | cluster reference | client/server connections, pools by db, waiting clients (`cl_waiting`) |
