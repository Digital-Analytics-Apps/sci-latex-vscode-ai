-- PostgreSQL 16 diagnostic examples for DBA/MCP implementation review.
-- Server identity
SELECT current_setting(server_version) AS server_version,
       current_setting(server_version_num) AS server_version_num;

-- Session summary
SELECT state, wait_event_type, wait_event, count(*) AS sessions
FROM pg_stat_activity
GROUP BY state, wait_event_type, wait_event
ORDER BY sessions DESC;

-- Long-running active sessions
SELECT pid,
       now() - query_start AS query_duration,
       now() - xact_start AS transaction_duration,
       state, wait_event_type, wait_event
FROM pg_stat_activity
WHERE state = active AND query_start IS NOT NULL
ORDER BY query_start LIMIT 50;

-- Lock waiters
SELECT pid, pg_blocking_pids(pid) AS blocking_pids,
       wait_event_type, wait_event
FROM pg_stat_activity
WHERE cardinality(pg_blocking_pids(pid)) > 0 LIMIT 50;

-- Database transaction counters
SELECT datname, numbackends, xact_commit, xact_rollback,
       blks_read, blks_hit, deadlocks, conflicts
FROM pg_stat_database ORDER BY numbackends DESC;
