# Security and data boundaries

## Identity separation
The AIOps service identity is not a PostgreSQL superuser and is not the application database owner. It receives only the minimum privileges required for approved diagnostic views and functions.

## Data minimization
The PostgreSQL specialist should receive operational metadata, not:
- scientific article content or drafts;
- uploaded files or object contents;
- passwords, connection strings, tokens, certificates, or private keys;
- personal data from application tables;
- raw SQL literals unless strictly necessary and redacted.
