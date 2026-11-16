# Vacuum, autovacuum, and bloat

## Why vacuum matters
VACUUM reclaims/reuses space occupied by dead row versions, updates planner statistics when paired with ANALYZE, maintains the visibility map, and prevents transaction ID wraparound.

## Diagnostic signals
- `n_dead_tup` estimates dead tuples; it is not an exact physical bloat measurement.
- `last_autovacuum`, `last_autoanalyze`, `autovacuum_count`, and `autoanalyze_count` provide historical context.
- `pg_stat_progress_vacuum` shows active vacuum progress.
- `age(datfrozenxid)` and table `relfrozenxid` help assess transaction ID age.

## Safety
- Do not disable autovacuum.
- Do not suggest `VACUUM FULL` as routine maintenance; it takes an ACCESS EXCLUSIVE lock and can block application traffic.
