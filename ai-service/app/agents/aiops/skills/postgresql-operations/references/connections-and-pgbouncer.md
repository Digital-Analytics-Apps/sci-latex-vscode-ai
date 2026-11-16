# Connections and PgBouncer

## PostgreSQL-side diagnosis
Inspect:
- total sessions and sessions grouped by state/application role (with identifiers redacted);
- active versus idle versus idle-in-transaction sessions;
- connection count compared with `max_connections`;
- reserved connection headroom;
- connection age and transaction age;
- wait events and connection churn over time.

## PgBouncer concepts
PgBouncer separates client connections from PostgreSQL server connections. Its pool mode changes application semantics:
- `session`: a server connection is assigned for the client session.
- `transaction`: a server connection is assigned only for a transaction.
- `statement`: a server connection is assigned per statement; multi-statement transactions are not supported.

The SCIA architecture direction is transaction pooling. This must be confirmed from the deployed PgBouncer configuration and metrics.

## Transaction-pooling caveats
Applications must not assume that session state survives between transactions. Review use of:
- session-level `SET` state;
- temporary tables;
- session advisory locks;
- `LISTEN` / `NOTIFY` listener sessions;
- cursors that span transactions;
- prepared statements and driver behavior;
- connection pinning features and PgBouncer version support.
