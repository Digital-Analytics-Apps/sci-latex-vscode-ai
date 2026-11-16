# Workflow: cross-specialist correlation

## PostgreSQL → Kubernetes
Ask for pod restarts, readiness/liveness events, node pressure, volume attachment errors, PVC capacity, and operator events.

## PostgreSQL → Prometheus
Ask for time-aligned CPU, memory, disk latency/IOPS, network, PostgreSQL exporter metrics, PgBouncer metrics, and request latency.

## PostgreSQL → Loki
Ask for redacted PostgreSQL, PgBouncer, CloudNativePG operator, backup tool, and application logs over the same time window.
