# Diagnostic: replication lag

## Trigger signals
- standby replay delay increases;
- replica freshness checks fail;
- replication connection drops;
- WAL retention grows.

## Investigation
1. Verify which instance is primary and which are standbys.
2. Inspect `pg_stat_replication` on primary and `pg_stat_wal_receiver` on standby.
3. Correlate WAL generation rate, network errors, standby resource pressure, and storage latency.
