# Diagnostic: slow queries

## Trigger signals
- application latency rises;
- query duration distribution worsens;
- active sessions or I/O waits increase;
- CPU or storage latency rises.

## Investigation
1. Execute `postgres_check_slow_queries_and_locks` to list queries > 2s.
2. Check for lock waits, cache/read I/O changes, and concurrency.
3. Correlate node CPU, memory, and volume latency with Kubernetes/Prometheus specialists.
