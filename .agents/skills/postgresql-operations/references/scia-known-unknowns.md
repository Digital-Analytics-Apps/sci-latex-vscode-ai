# SCIA architecture: knowns and unknowns

## Known from architecture context
- PostgreSQL 16 is the target major version (`postgres:16`).
- The approved architecture direction uses CloudNativePG for PostgreSQL HA.
- PgBouncer is part of the connection-pooling strategy; transaction pooling is the active mode (:6543).
- WAL-based recovery and private MinIO storage are architectural goals.
- Prometheus and Loki are part of the observability stack.
- AIOps specialists must be read-only; remediation requires human approval.
