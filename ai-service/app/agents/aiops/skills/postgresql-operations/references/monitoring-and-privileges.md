# Monitoring and privileges (PostgreSQL 16)

## Core views
- `pg_stat_activity`: current server processes, session state, wait events, query start, transaction start, and application metadata.
- `pg_locks`: held and awaited locks; join to `pg_stat_activity` by PID.
- `pg_stat_database`: database-level transaction, block, tuple, and conflict counters.
- `pg_stat_user_tables` / `pg_stat_all_tables`: table scan and tuple modification counters, vacuum/analyze timestamps.
- `pg_stat_user_indexes` / `pg_stat_all_indexes`: index scan and tuple-fetch counters.
- `pg_stat_replication`: sender-side replication state and lag indicators.
- `pg_stat_wal_receiver`: standby-side receiver state.
- `pg_stat_wal`: WAL generation and write/sync statistics.
- `pg_stat_bgwriter`: background writer and checkpoint statistics in PG16.
- `pg_stat_progress_vacuum`, `pg_stat_progress_create_index`, `pg_stat_progress_analyze`: progress views for supported operations.

## Least-privilege monitoring
PostgreSQL predefined roles include:
- `pg_read_all_stats`: visibility into statistics otherwise restricted for other sessions.
- `pg_read_all_settings`: visibility into configuration settings.
- `pg_monitor`: membership in the monitoring-related predefined roles, including `pg_read_all_stats`, `pg_read_all_settings`, and `pg_stat_scan_tables`.

The MCP identity must not be superuser, database owner, or have write privileges. The application service identity and AIOps diagnostic identity must be separate.
