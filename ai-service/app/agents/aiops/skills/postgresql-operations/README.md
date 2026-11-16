# PostgreSQL Operations Skill for SCIA — v1.0.0

## Purpose
An offline, local knowledge package for the PostgreSQL specialist in the SCIA AIOps architecture. It supports diagnosis and RCA; it is not a database administration agent and does not perform remediation.

## Target version
- Database image family: `postgres:16`
- PostgreSQL major version: 16
- The `postgres:16` tag does not pin a minor release or immutable image digest. Record the deployed image digest and `server_version` from the environment during rollout.
- CloudNativePG and PgBouncer versions are intentionally not guessed; both remain deployment-specific inputs.

## Package layout
- `SKILL.md`: entry point and routing.
- `references/`: PostgreSQL 16 operational knowledge, SCIA-specific assumptions, and proposed MCP contracts.
- `diagnostics/`: focused incident playbooks.
- `workflows/`: investigation, correlation, and RCA procedures.
- `sql/`: bounded read-only SQL examples for review by the MCP implementer. These are not instructions for the agent to execute through a generic SQL tool.
- `schemas/`: specialist output contract.

## Offline and security model
The package contains local knowledge and source provenance URLs. The production specialist does not browse the web. MCP access should be read-only and allowlisted. Do not include secrets, article contents, user data, or raw connection strings in the model context.
