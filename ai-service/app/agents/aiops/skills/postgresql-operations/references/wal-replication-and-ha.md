# WAL, replication, and high availability

## WAL
WAL records changes for crash recovery and supports physical replication and PITR. Monitor:
- WAL generation rate;
- archive success/failure and age of last successful archive;
- retained WAL volume;
- checkpoint frequency and write pressure;
- replication slot retention;
- available storage for `pg_wal`.

## Streaming replication
On the primary, `pg_stat_replication` describes connected WAL senders and standby state. On a standby, `pg_stat_wal_receiver` describes the receiver.

## CloudNativePG boundary
CloudNativePG manages PostgreSQL clusters through Kubernetes custom resources and operator reconciliation.
