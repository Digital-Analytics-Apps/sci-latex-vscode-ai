# Diagnostic: lock contention

## Trigger signals
- lock-wait metrics or blocked sessions rise;
- transaction latency increases;
- deadlock count increases.

## Investigation
1. Identify waiting sessions and lock wait events via `postgres_check_slow_queries_and_locks`.
2. Check for idle-in-transaction sessions and long-running transactions.
3. Correlate with application deployment and request timestamps.
4. Ask Loki specialist for transaction errors/deadlock reports.
