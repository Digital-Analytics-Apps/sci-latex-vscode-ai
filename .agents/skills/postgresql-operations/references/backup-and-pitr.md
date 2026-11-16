# Backup, WAL archiving, and PITR

## Backup types
PostgreSQL distinguishes logical dumps (`pg_dump`), filesystem-level backups, and continuous archiving with base backups plus WAL. Logical dumps alone are not a physical PITR chain.

## PITR prerequisites
A valid continuous-archiving recovery chain requires:
- a usable base backup;
- a continuous required sequence of WAL segments from the backup start through the recovery target;
- correct restore configuration and compatible PostgreSQL major version;
- a tested procedure and a known recovery target.

## SCIA boundary
The SCIA architecture direction references WAL-based recovery and private MinIO object storage with Barman Cloud.
