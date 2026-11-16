# Workflow: PostgreSQL incident investigation

1. **Scope:** identify cluster reference, affected application, namespace, symptom, start time, timezone, and impact.
2. **Freshness:** collect current server identity and cluster health; reject stale observations.
3. **Classify:** connection, latency, lock, replication, storage/WAL, vacuum, backup, security, or unknown.
4. **Collect:** request narrow diagnostic observations from MCP tools (`postgres_inspect_health`, `postgres_check_slow_queries_and_locks`, `pgbouncer_inspect_pools`).
5. **Correlate:** compare database evidence with Prometheus trends and Loki logs.
6. **Interpret:** map facts to plausible mechanisms; explicitly list alternatives.
7. **Confidence:** assign low/medium/high using the skill policy.
8. **Escalate:** provide evidence and bounded human-review recommendations to SRE Supervisor.
