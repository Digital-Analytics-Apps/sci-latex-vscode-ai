# Diagnostic: backup failure

## Trigger signals
- scheduled backup job fails or becomes stale;
- WAL archive failures rise;
- restore test is missing or fails.

## Investigation
1. Inspect last successful base backup and WAL archive timestamps.
2. Ask Kubernetes specialist for job/pod/volume events and Loki specialist for backup tool logs.
3. Confirm whether a restore test exists.
