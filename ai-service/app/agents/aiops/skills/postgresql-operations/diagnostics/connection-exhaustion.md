# Diagnostic: connection exhaustion

## Trigger signals
- application connection errors or pool wait time increase;
- PostgreSQL sessions approach configured connection capacity;
- PgBouncer waiting clients increase (`cl_waiting > 0`);
- connection churn or authentication failures rise.

## Investigation
1. Compare application connection errors with PgBouncer client/server counts (`pgbouncer_inspect_pools`).
2. Compare PostgreSQL session count with `max_connections` and reserved headroom (`postgres_inspect_health`).
3. Group sessions by state: active, idle, idle in transaction, waiting.
4. Inspect oldest transaction/session age and wait events.
5. Ask Loki specialist for authentication, network, DNS, or pooler errors.
6. Ask Kubernetes specialist whether application replicas or pooler pods scaled/restarted.
