# Diagnostic: storage and WAL pressure

## Trigger signals
- data volume or `pg_wal` usage rises;
- free storage declines;
- WAL archive failures or replication slot retention appears.

## Investigation
1. Confirm whether pressure is in data volume, WAL volume, or object storage.
2. Inspect WAL generation, archive status, and replication slots.
3. Correlate volume capacity and latency with Kubernetes/Prometheus.
