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

## 3. Workspace Ownership, Sequential Locks & Occupation Rules
- **Single Integrated View (Gantt Timeline):** The Author detail view is unified under [`GanttTimelineView`](file:///home/gilson-russo/development/professional/sci-latex-vscode/frontend/src/features/author/components/gantt/GanttTimelineView.tsx). The sidebar [`GanttTableTree`](file:///home/gilson-russo/development/professional/sci-latex-vscode/frontend/src/features/author/components/gantt/GanttTableTree.tsx) serves as the primary workspace launchpad.
- **Mandatory Task Claim for Workspace Launch:** An author can ONLY launch/start a workspace if they have claimed/assigned the sub-task to themselves (`assignedToId === currentUserId`). Unclaimed tasks display `✍️ Assine a Tarefa para Abrir Workspace` and require clicking `Assinar` first.
- **Full Read-Only Drawer Mode for Locked/Other Author Tasks:** When a task is assigned to another author (`assignedToId !== currentUserId`) or occupied by an active session (`isOccupied === true`), opening the detail drawer ([`GanttTaskDetailDrawer`](file:///home/gilson-russo/development/professional/sci-latex-vscode/frontend/src/features/author/components/gantt/GanttTaskDetailDrawer.tsx)) displays an informational banner and enforces **Full Read-Only Mode**: all input controls (Status Select, Start Date, Due Date) are disabled and locked against editing.
- **Sequential Sub-task Lock (`isBlockedByPrevious`):** Sub-tasks under a stage edit shared `.tex` section files. Execution is strictly sequential. Sub-task $N+1$ displays a `🔒 Aguardando Anterior` lock and cannot start a workspace until Sub-task $N$ reaches `MERGED`.
- **Feature Stage Workspace Lock:** The workspace for a Feature Stage branch (`feature/stage-X`) can only be launched directly if all sub-tasks under that stage are `MERGED` (or 0 sub-tasks exist). If unmerged sub-tasks remain, the Feature workspace button displays `🔒`.
- **Live Occupation Lock (`isOccupied`):** If an author is actively inside the workspace (`isOccupied === true`), the sidebar and drawer display `🔒 Em uso por [Nome]` and lock claim/unclaim/launch actions to prevent concurrent overwrites.
- **Review Feedback & Correction Sub-tasks:** Authors inspect reviewer comments grouped by stage in [`ReviewFeedbackPanel`](file:///home/gilson-russo/development/professional/sci-latex-vscode/frontend/src/features/author/components/ReviewFeedbackPanel.tsx) (`GET /api/v1/projects/:id/review-comments-by-stage`) and use the `➕ Criar Sub-tarefa` side button to generate targeted correction sub-tasks into that stage's sequential queue.

## 4. Mandatory Task Completion Checklist
Upon finishing or pausing work:
1. Ensure all tests pass (`npm test` in backend) and typecheck passes with 0 errors (`npm run build` in frontend and backend).
2. Update Jira issue: Transition to `Fazendo` (`21`) at start, and to `Feito` (`31`) upon completion, filling textual Summary & Description (Problem & Solution).
3. Open Pull Request via GitHub MCP Server (`create_pull_request`).
4. Update [`docs/planning/ROADMAP.md`](file:///home/gilson-russo/development/professional/sci-latex-vscode/docs/planning/ROADMAP.md) marking completed items as `[x]`.
5. Update [`docs/planning/STATUS.md`](file:///home/gilson-russo/development/professional/sci-latex-vscode/docs/planning/STATUS.md) with exact work done, environment state, and next steps for hand-off.
