# Diagnostic: autovacuum health

## Trigger signals
- dead tuple estimates rise persistently;
- autovacuum activity is absent or not keeping pace;
- transaction ID age approaches warning levels.

## Investigation
1. Review table-level last vacuum/analyze timestamps and dead tuple estimates.
2. Inspect active vacuum progress and worker availability.
3. Check oldest transaction age and replication slot retention.
