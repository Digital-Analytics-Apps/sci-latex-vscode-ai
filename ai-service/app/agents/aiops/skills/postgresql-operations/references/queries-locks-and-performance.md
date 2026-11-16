# Query performance and locks

## Query diagnosis
Use time-series evidence before inspecting individual sessions:
- request latency and error rate from application metrics;
- PostgreSQL active sessions and wait events;
- transaction duration;
- I/O timing and buffer hit/read trends;
- query statistics, if `pg_stat_statements` is installed and enabled.

## Lock diagnosis
- `pg_locks` shows held and awaited locks.
- `pg_stat_activity` provides transaction start, query start, state, and wait event.
- A blocked process may be waiting on a lock held by another backend.
- Long-running or idle-in-transaction sessions can retain locks and old row versions.

Build a blocker/waiter relationship using `pg_blocking_pids(pid)` where permitted.
