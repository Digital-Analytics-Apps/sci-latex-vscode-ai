# PostgreSQL 16 baseline

## Scope
This package targets PostgreSQL major version 16. The `postgres:16` image tag tracks the 16.x series; it is not an immutable artifact. Runtime diagnosis must collect `server_version`, `server_version_num`, image tag, and preferably image digest.

## Operational architecture facts
- PostgreSQL uses a process-per-connection model.
- MVCC allows concurrent transactions while retaining row versions; old row versions require vacuuming.
- WAL (write-ahead log) records changes for crash recovery and supports physical replication and point-in-time recovery when correctly archived.
- `pg_stat_activity` exposes one row per server process and is central to session/lock diagnosis.
- `pg_stat_replication` exposes sender-side information for connected standbys.
- `pg_stat_wal_receiver` exposes receiver-side information on a standby.
- `pg_stat_database`, `pg_stat_bgwriter`, `pg_stat_wal`, and related views provide cumulative operational statistics.

## Version discipline
Do not use PostgreSQL 17/18-only syntax, catalog columns, monitoring views, or behavior unless verified for PG16. When a reference is version-neutral, still validate it against PG16 documentation.

## Runtime facts to collect
- `version()` / `server_version`
- `server_version_num`
- `max_connections`
- `superuser_reserved_connections`
- `shared_buffers`
- `work_mem`
- `maintenance_work_mem`
- `wal_level`
- `archive_mode`
- `max_wal_size`
- `checkpoint_timeout`
- `track_activities`, `track_counts`, `track_io_timing`
- `hot_standby` on replicas

Do not recommend changing any setting. Report observed values and compare them with an approved baseline.
