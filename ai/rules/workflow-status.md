# Workflow & Status Update Protocol (`ai/rules/workflow-status.md`)

All tasks in this repository MUST follow the strict state, specs, roadmap, and status update cycle described below.

## 1. Always Read Checkpoint First
Before writing code or forming a plan:
- Inspect [`docs/planning/STATUS.md`](file:///home/gilson-russo/development/professional/sci-latex-vscode/docs/planning/STATUS.md) to see where the previous session stopped.
- Inspect [`docs/planning/ROADMAP.md`](file:///home/gilson-russo/development/professional/sci-latex-vscode/docs/planning/ROADMAP.md) to locate active or pending backlog items.

## 2. Dynamic Specs Maintenance
If your implementation introduces or modifies:
- REST API routes or schemas -> Update [`docs/planning/specs/backend-specs.md`](file:///home/gilson-russo/development/professional/sci-latex-vscode/docs/planning/specs/backend-specs.md) or [`docs/planning/specs/system-specs.md`](file:///home/gilson-russo/development/professional/sci-latex-vscode/docs/planning/specs/system-specs.md).
- Database tables or fields (`schema.prisma`) -> Update [`docs/planning/specs/system-specs.md`](file:///home/gilson-russo/development/professional/sci-latex-vscode/docs/planning/specs/system-specs.md).
- Frontend UI components, state management, or services -> Update [`docs/planning/specs/frontend-specs.md`](file:///home/gilson-russo/development/professional/sci-latex-vscode/docs/planning/specs/frontend-specs.md).

## 3. Workspace Ownership & Occupation Lock Rules
- **Task Workspace Execution:** Only the author currently assigned to a task (`assignedToId === currentUserId`) can see and launch the **"🚀 Iniciar Workspace"** button.
- **Branch Sync:** When an assigned author launches a workspace, the system creates/claims a dedicated workspace and performs `git clone`/`fetch` & `checkout` of the exact task branch (`task.branchName`).
- **Live Occupation Lock (`isOccupied`):** If an author is actively inside the workspace/editor (`isOccupied === true`), **"Assinar"** and **"Desassinar"** actions are locked (`🔒 Em uso por [Nome]`) to prevent accidental unassignment or concurrent overwrites.
- **Reassignment Flow (`isOccupied === false`):** When no active workspace session is live, another author can claim the task, becoming the assigned author and gaining access to launch the workspace on that task's remote branch.

## 4. Mandatory Task Completion Checklist
Upon finishing or pausing work:
1. Ensure all tests pass (`npm test`) and typecheck passes with 0 errors (`npx tsc --noEmit`).
2. Update Jira issue: Transition to `Fazendo` (`21`) at start, and to `Feito` (`31`) upon completion, filling textual Summary & Description (Problem & Solution).
3. Open Pull Request via GitHub MCP Server (`create_pull_request`).
4. Update [`docs/planning/ROADMAP.md`](file:///home/gilson-russo/development/professional/sci-latex-vscode/docs/planning/ROADMAP.md) marking completed items as `[x]`.
5. Update [`docs/planning/STATUS.md`](file:///home/gilson-russo/development/professional/sci-latex-vscode/docs/planning/STATUS.md) with exact work done, environment state, and next steps for hand-off.
