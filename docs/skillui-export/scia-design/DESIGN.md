# SCIA DESIGN.md

> Auto-generated design system — reverse-engineered via static analysis by skillui.
> Frameworks: React 19.2.8 + CSS-in-JS (Emotion) 11.14.0
> Colors: 20 · Fonts: 1 · Components: 63
> Icon library: not detected · State: Redux
> Primary theme: light · Dark mode toggle: no · Motion: subtle

---

## 1. Visual Theme & Atmosphere

This is a **light-themed** interface with a neutral, approachable feel. The light background emphasizes content clarity. Typography uses **sans-serif** throughout — a clean, modern choice that maintains consistency. Spacing follows a **4px base grid** (compact density), with scale: 4, 8, 10, 18, 20, 24, 32, 48px. Motion is subtle — smooth transitions (150-300ms) ease state changes without drawing attention.

---

## 2. Color Palette & Roles

| Token | Hex | Role | Use |
|---|---|---|---|
| 50 | `#f8fafc` | background | Page background, darkest surface |
| 50 | `#fff7ed` | surface | Card and panel backgrounds |
| 800 | `#1e293b` | text-primary | Headings and body text |
| 400 | `#94a3b8` | text-muted | Captions, placeholders, secondary info |
| 600 | `#52525b` | border | Dividers, card borders, outlines |
| 950 | `#450a0a` | danger | Error states, destructive actions |
| 200 | `#e2e8f0` | info | Informational highlights |
| 300 | `#cbd5e1` | unknown | Palette color |
| 950 | `#020617` | unknown | Palette color |
| 500 | `#64748b` | unknown | Palette color |
| 700 | `#334155` | unknown | Palette color |
| 900 | `#0f172a` | unknown | Palette color |
| 400 | `#a1a1aa` | unknown | Palette color |
| 700 | `#3f3f46` | unknown | Palette color |
| 800 | `#27272a` | unknown | Palette color |
| 900 | `#18181b` | unknown | Palette color |
| 950 | `#0a0a0a` | unknown | Palette color |
| 100 | `#e0f2fe` | unknown | Palette color |
| 100 | `#ede9fe` | unknown | Palette color |
| 600 | `#475569` | unknown | Palette color |


---

## 3. Typography Rules

**Font Stack:**
- **sans-serif** — Heading 1, Heading 2, Heading 3, Body, Caption

| Role | Font | Size | Weight |
|---|---|---|---|
| Heading 1 | sans-serif | 48px / 3rem | 700 |
| Heading 2 | sans-serif | 32px / 2rem | 600 |
| Heading 3 | sans-serif | 24px / 1.5rem | 600 |
| Body | sans-serif | 16px / 1rem | 400 |
| Caption | sans-serif | 12px / 0.75rem | 400 |

**Typographic Rules:**
- Use **sans-serif** for all text — do not mix font families
- Maintain consistent hierarchy: no more than 3-4 font sizes per screen
- Headings use bold (600-700), body uses regular (400)
- Line height: 1.5 for body text, 1.2 for headings
- Use color and opacity for secondary hierarchy, not additional font sizes


---

## 4. Component Stylings

### Layout (1)

**PageContainer** — `src/components/common/PageContainer.tsx`
- Props: `children`, `disablePadding`, `sx`

```tsx
<Box
      sx={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        width: "100%",
        p: disablePadding ? 0 : { xs: 2, sm: 3, md: 4 },
        boxSizing: "border-box",
        overflow: "hidden",
        ...sx,
      }}
      {...restProps}
```

### Navigation (10)

**AppHeaderBar** — `src/components/common/AppHeaderBar.tsx`
- Variants: `Geral`
- Props: `o`, `title`, `icon`, `ex`, `extraHeaderActions`
- State: useState

```tsx
<AppBar
      position="static"
      color="default"
      elevation={0}
      sx={{
        bgcolor: "background.paper",
        borderBottom: "1px solid",
        borderColor: "divider",
        borderRadius: 0,
      }}
    >
      <Toolbar
```

**NotFoundPage** — `src/components/common/NotFoundPage.tsx`

```tsx
<Box
      sx={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "70vh",
        textAlign: "center",
        px: 2,
      }}
    >
      <Typography
```

**TableContainer** — `src/components/common/TableContainer.tsx`
- Props: `children`, `sx`

```tsx
<Box
      sx={{
        flex: 1,
        minHeight: 0,
        width: "100%",
        ...sx,
      }}
      {...restProps}
    >
      {children}
    </Box>
```

**TableFilters** — `src/components/common/TableFilters.tsx`
- Props: `value`, `onChange`, `placeholder`, `fullWidth`, `size`, `slotProps`

```tsx
<TextField
      fullWidth={fullWidth}
      size={size}
      placeholder={placeholder}
      value={value}
      onChange={(e
```

**ArticleDetailPage** — `src/features/author/ArticleDetailPage.tsx`
- Props: `queryKey`, `projectId]`, `queryFn`, `enabled`
- State: useState, react-query

```tsx
<Box sx={{ p: 3, width: "100%" }}>
        <LinearProgress color="primary" />
      </Box>
```

**AuthorArticlesPage** — `src/features/author/AuthorArticlesPage.tsx`
- Variants: `ALL`
- Props: `title`, `subtitle`
- State: useState

```tsx
<PageContainer>
      <WelcomeHeader subtitle="Seja bem-vindo ao SCIA — Scientific Collaboration and Intelligent Assistance. Selecione um artigo para gerenciar suas tarefas e acessar o workspace." />

      {/* Container flexível para o AutoSizer medir a altura exata disponível */}
      <TableContainer sx={{ mt: 2 }}>
        <AutoSizer
          renderProp={({ height, width }
```

**ManagerSidebar** — `src/features/manager/components/ManagerSidebar.tsx`
- Props: `height`, `width`

```tsx
<Paper
      elevation={0}
      variant="outlined"
      sx={{
        width,
        height,
        flexShrink: 0,
        p: 2,
        display: "flex",
        flexDirection: "column",
        borderRadius: 2,
        bgcolor: "background.paper",
```

**ReviewDetailPage** — `src/features/reviewer/ReviewDetailPage.tsx`
- Variants: `overview`, `roundChanges`, `Revisor`
- Props: `status`, `comment`, `lineNumer`
- State: useState

```tsx
<Box
        sx={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          height: "100%",
          gap: 2,
        }}
      >
        <CircularProgress color="primary" />
        <Typography variant="body2" color="text.secondary">
```

*...and 2 more navigation components.*

### Data Display (2)

**MetricCard** — `src/components/common/MetricCard.tsx`
- Variants: `ON_TIME`, `WARNING`, `success`, `warning`, `OVERDUE`, `error`
- Props: `title`, `value`, `icon`, `subtitle`, `color`, `isLoading`, `onClick`, `sx` (+1 more)
- Animation: tw-transitions: ease-in-out

```tsx
<Chip
      label={label}
      size="small"
      color={color}
      variant="outlined"
      sx={{ fontWeight: 600, fontSize: 11 }}
    />
```

**StatusChips** — `src/components/common/StatusChips.tsx`
- Variants: `ON_TIME`, `WARNING_SOON`, `OVERDUE`
- Props: `status`

```tsx
<Chip
          label="Aprovado"
          size="small"
          color="success"
          variant="outlined"
          sx={{ fontWeight: 600 }}
        />
```

### Data Input (11)

**StandardModal** — `src/components/common/StandardModal.tsx`
- Variants: `sm`, `md`, `lg`, `primary`, `secondary`, `warning`, `error`, `info`, `contained`, `outlined`, `submit`, `xl`, `success`, `text`, `button`
- Props: `open`, `onClose`, `title`, `icon`, `subtitle`, `size`, `width`, `height` (+19 more)

```tsx
<Dialog
      open={open}
      onClose={onClose}
      slotProps={{
        paper: {
          sx: {
            width: modalWidth,
            height: modalHeight,
            maxWidth: "95vw",
            maxHeight: "95vh",
            borderRadius: 3,
            overflow: "hidden",
```

**LoginPage** — `src/features/auth/LoginPage.tsx`
- Props: `token`, `user`
- State: useState, react-hook-form

```tsx
<Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        bgcolor: "background.default",
        position: "relative",
        overflow: "hidden",
        px: 2,
        py: 4,
      }}
```

**CreateAcademicPeriodModal** — `src/features/manager/components/CreateAcademicPeriodModal.tsx`
- Props: `open`, `onClose`
- State: useState

```tsx
<StandardModal
      open={open}
      onClose={onClose}
      size="sm"
      icon={<CalendarTodayIcon color="warning" />}
      title="Novo Ciclo Acadêmico"
      subtitle="Defina um novo período institucional de produção científica e sua meta global de artigos."
      onSubmit={handleSubmit}
      confirmText="Criar Ciclo Acadêmico"
      confirmColor="warning"
      isSubmitting={createPeriodMutation.isPending}
    >
```

**CreateUserModal** — `src/features/manager/components/CreateUserModal.tsx`
- Props: `open`, `onClose`
- State: useState

```tsx
<StandardModal
      open={open}
      onClose={onClose}
      size="sm"
      icon={<PersonAddIcon color="primary" />}
      title="Cadastrar Novo Integrante"
      subtitle="Cadastre um novo usuário no sistema e atribua seu papel de acesso institucional."
      onSubmit={handleSubmit}
      confirmText="Cadastrar Integrante"
      confirmColor="primary"
      isSubmitting={createUserMutation.isPending}
    >
```

**ManageTeamModal** — `src/features/manager/components/ManageTeamModal.tsx`
- Props: `open`, `onClose`, `team`
- State: useState

```tsx
<StandardModal
      open={open}
      onClose={handleCloseModal}
      size="md"
      icon={<GroupIcon color="warning" />}
      title={
        isEditMode
          ? `Gerenciar: ${currentTeam?.name || teamForm.name}`
          : "Nova Equipe de Pesquisa"
      }
      subheader={
        isEditMode ? (
```

**TeamGeneralTab** — `src/features/manager/components/manage-team-tabs/TeamGeneralTab.tsx`
- Props: `isEditMode`, `teamForm`, `name`, `coordinatorId`, `coordinatorEmail`, `setTeamForm`, `onSubmit`

```tsx
<Box
      component="form"
      id="save-team-form"
      onSubmit={onSubmit}
      sx={{ display: "flex", flexDirection: "column", gap: 2.5 }}
    >
      <Typography variant="body2" color="text.secondary">
        {isEditMode
          ? "Atualize o nome do laboratório/equipe e o Coordenador responsável."
          : "Cadastre uma nova equipe de pesquisa e atribua o Coordenador responsável."}
      </Typography>
```

**TeamGoalsTab** — `src/features/manager/components/manage-team-tabs/TeamGoalsTab.tsx`
- Props: `periods`, `selectedPeriodId`, `setSelectedPeriodId`, `id`, `targetArticles`, `setTargetArticles`, `val`, `onSubmit` (+1 more)

```tsx
<Box
      component="form"
      id="team-goal-form"
      onSubmit={onSubmit}
      sx={{ display: "flex", flexDirection: "column", gap: 2.5 }}
    >
      <Typography variant="body2" color="text.secondary">
        Defina a meta/cota de artigos científicos a serem produzidos por este
        laboratório no Ciclo Acadêmico ativo.
      </Typography>

      <FormControl fullWidth size="small">
```

**PostSubmissionModal** — `src/features/post-submission/PostSubmissionModal.tsx`
- Variants: `ACCEPTED`, `SUBMIT_BACKUP`, `REJECTED`
- Props: `open`, `onClose`, `projectId`, `projectTitle`, `initialStatus`
- State: useState, react-hook-form

```tsx
<StandardModal
      open={open}
      onClose={onClose}
      size="md"
      icon={<CheckCircleOutlinedIcon color="primary" />}
      title="Registro de Pós-Submissão & Resultado Final"
      subheader={
        <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
          <Typography variant="body2" color="text.secondary">
            Projeto: <strong>{projectTitle}</strong>
          </Typography>
          <Tabs
```

*...and 3 more data input components.*

### Overlay (6)

**AddMemberModal** — `src/features/author/modals/AddMemberModal.tsx`
- Props: `open`, `onClose`, `projectId`, `onMemberAdded`
- State: useState

```tsx
<StandardModal
      open={open}
      onClose={onClose}
      size="sm"
      icon={<PersonAddIcon color="primary" />}
      title="Adicionar Novo Membro ao Artigo"
      subtitle="Pesquise pesquisadores cadastrados na plataforma para associá-los a este artigo como Co-Autores ou Revisores de Par."
      onSubmit={handleSubmit}
      confirmText="Adicionar Membro"
      confirmColor="primary"
      confirmDisabled={!selectedUser}
      isSubmitting={addMemberMutation.isPending}
```

**CreateProjectModal** — `src/features/author/modals/CreateProjectModal.tsx`
- Variants: `IEEEtran`
- Props: `open`, `onClose`, `onArticleCreated`, `articleId`
- State: useState, react-hook-form

```tsx
<StandardModal
      open={open}
      onClose={onClose}
      size="lg"
      icon={<AddCircleOutlinedIcon color="primary" />}
      title="Criar Novo Artigo Científico (Projeto LaTeX
```

**CreateStageModal** — `src/features/author/modals/CreateStageModal.tsx`
- Props: `open`, `onClose`, `projectId`, `nextOrder`
- State: useState

```tsx
<StandardModal
      open={open}
      onClose={onClose}
      size="sm"
      icon={<AddTaskIcon color="primary" />}
      title="Adicionar Nova Etapa de Escrita"
      subtitle="Crie uma nova etapa/seção para a escrita do artigo. Cada etapa representa uma Feature Branch no Git."
      onSubmit={handleSubmit}
      confirmText="Adicionar Etapa"
      confirmColor="primary"
      isSubmitting={createStageMutation.isPending}
    >
```

**CreateTaskModal** — `src/features/author/modals/CreateTaskModal.tsx`
- Props: `open`, `onClose`, `projectId`, `members`, `initialTitle`, `initialStageId`, `onTaskCreated`
- State: useState

```tsx
projectDetails?.stages || []
```

**ProjectSettingsModal** — `src/features/author/modals/ProjectSettingsModal.tsx`
- Variants: `success`, `warning`, `error`, `REVIEWER`, `default`, `U`
- Props: `open`, `onClose`, `projectId`, `projectDetails`, `stages`, `onRefetchStages`, `onOpenCreateStage`, `onOpenAddMember` (+9 more)
- Animation: tw-transitions: ease-candidate
- State: useState

```tsx
<Paper
      ref={setNodeRef}
      style={style}
      variant="outlined"
      sx={{
        p: 1.5,
        borderRadius: 2,
        bgcolor: isDragging ? "action.hover" : "background.paper",
        borderColor:
          stage.status === StageStatus.COMPLETED ? "success.main" : "divider",
        display: "flex",
        flexDirection: "column",
```

**ReleaseCandidatesModal** — `src/features/author/modals/ReleaseCandidatesModal.tsx`
- Props: `open`, `onClose`, `projectId`
- Animation: tw-transitions: ease-candidate
- State: useState

```tsx
<Box sx={{ display: "flex", justifyContent: "center", py: 3 }}>
          <CircularProgress size={28} />
        </Box>
```

### Typography (1)

**CodeServerIframe** — `src/features/workspace/CodeServerIframe.tsx`
- Props: `projectId`, `taskId`, `stageId`, `mode`
- State: useState

```tsx
<Box
      sx={{
        width: "100%",
        height: "100%",
        position: "relative",
        // bgcolor: "#0b0f17",
      }}
    >
      {isLoading && (
        <Box
          sx={{
            position: "absolute",
```

### Other (32)

**ProtectedRoute** — `src/components/ProtectedRoute.tsx`
- Props: `allowedRoles`

**ActiveTaskCard** — `src/components/common/ActiveTaskCard.tsx`
- Variants: `primary`, `secondary`, `success`, `warning`, `info`
- Props: `title`, `subtitle`, `statusLabel`, `statusColor`

```tsx
<Box
      sx={{
        p: 1.5,
        borderRadius: 1.5,
        bgcolor: "action.hover",
        border: "1px solid",
        borderColor: "divider",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
      }}
    >
```

**ArticleTimelineHeader** — `src/components/common/ArticleTimelineHeader.tsx`
- Variants: `success`, `primary`, `warning`, `default`, `T`
- Props: `stages`, `selectedStageId`, `onSelectStage`, `stageId`, `onUpdateStageStatus`, `status`, `onDeleteStage`, `onOpenCreateStage` (+11 more)
- State: useState

```tsx
<Box
      onClick={onClick}
      sx={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        cursor: "pointer",
        position: "relative",
        zIndex: isSelected ? 2 : 1,
        transition: "transform 0.15s ease",
        "&:hover": {
          transform: "scale(1.08
```

**GatekeeperLockBadge** — `src/components/common/GatekeeperLockBadge.tsx`
- Variants: `NIT`
- Props: `isGatekeeper`, `gatekeeperType`, `status`, `title`

```tsx
<Tooltip title="Parecer Favorável do NIT Aprovado! Trava liberada para Submissão.">
          <Chip
            icon={<CheckCircleIcon />}
            label="NIT: Parecer Favorável"
            color="success"
            variant="filled"
            size="small"
            sx={{ fontWeight: "bold" }}
          />
        </Tooltip>
```

**GenericDataGrid** — `src/components/common/GenericDataGrid.tsx`

```tsx
<Card
        variant="outlined"
        sx={{
          width,
          height,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        {(title || headerToolbarContent
```

**ReviewTypeSelector** — `src/components/common/ReviewTypeSelector.tsx`
- Variants: `PEER_REVIEW`
- Props: `value`, `onChange`, `val`, `label`

```tsx
<Box>
      <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
        {label}
      </Typography>
      <ToggleButtonGroup
        exclusive
        fullWidth
        size="small"
        value={value}
        onChange={(_, val
```

**ReviewerSelector** — `src/components/common/ReviewerSelector.tsx`
- Props: `reviewType`, `officialReviewer`, `peerOptions`, `selectedPeers`, `onPeersChange`, `peers`

```tsx
<TextField
        fullWidth
        size="small"
        label="Revisor Oficial (Orientador
```

**UserAvatar** — `src/components/common/UserAvatar.tsx`
- Props: `member`, `user`, `name`, `role`, `size`, `showTooltip`, `tooltipTitle`, `useDeterministicColor` (+1 more)

*...and 24 more other components.*



---

## 5. Layout Principles

- **Base spacing unit:** 4px
- **Spacing scale:** 4, 8, 10, 18, 20, 24, 32, 48, 88
- **Border radius:** 4px, 5px
- **Max content width:** 1024px

**Spacing as Meaning:**
| Spacing | Use |
|---|---|
| 4-8px | Tight: related items within a group |
| 12-16px | Medium: between groups |
| 24-32px | Wide: between sections |
| 48px+ | Vast: major section breaks |


---

## 6. Depth & Elevation

### Flat — subtle depth hints

- **sm:** `0 1px 2px 0 rgba(0, 0, 0, 0.05)`

### Raised — cards, buttons, interactive elements

- **default:** `0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px -1px rgba(0, 0, 0, 0.1)`
- **md:** `0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1)`
- **inner:** `inset 0 2px 4px 0 rgba(0, 0, 0, 0.05)`

### Floating — dropdowns, popovers, modals

- **lg:** `0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1)`

### Overlay — full-screen overlays, top-level dialogs

- **xl:** `0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)`
- **2xl:** `0 25px 50px -12px rgba(0, 0, 0, 0.25)`

### Z-Index Scale

`0, 1`



---

## 7. Animation & Motion

This project uses **subtle motion**. Transitions smooth state changes without demanding attention.

### Animated Components

- **MetricCard**: tw-transitions: ease-in-out
- **SciLatexAnimatedLogo**: tw-transitions: ease-out, ease-in-out
- **GanttChartGrid**: tw-transitions: ease-in-out
- **ProjectSettingsModal**: tw-transitions: ease-candidate
- **ReleaseCandidatesModal**: tw-transitions: ease-candidate

### Motion Guidelines

- Duration: 150-300ms for micro-interactions, 300-500ms for page transitions
- Easing: `ease-out` for enters, `ease-in` for exits
- Always respect `prefers-reduced-motion`


---

## 8. Do's and Don'ts

### Do's

- Use `#f8fafc` as the primary page background
- Use **sans-serif** for all UI text
- Follow the **4px** spacing grid for all margins, padding, and gaps
- Use the defined shadow tokens for elevation — see Section 6
- Use border-radius from the scale: 4px, 5px
- Reuse existing components from Section 4 before creating new ones

### Don'ts

- Don't introduce colors outside this palette — extend the design tokens first
- Don't mix font families — use sans-serif consistently
- Don't use arbitrary spacing values — stick to multiples of 4px
- Don't create custom box-shadow values outside the system tokens
- Don't use gradients — the design uses solid colors only
- Don't use arbitrary border-radius values — pick from the defined scale
- Don't duplicate component patterns — check Section 4 first
- Don't use backdrop-blur or blur effects

### Anti-Patterns (detected from codebase)

- No gradient backgrounds
- No blur or backdrop-blur effects
- No zebra striping on tables/lists


---

## 9. Responsive Behavior

No breakpoints detected. Consider adding responsive breakpoints to the design system.

---

## 10. Agent Prompt Guide

Use these as starting points when building new UI:

### Build a Card

```
Background: #fff7ed
Border: 1px solid #52525b
Radius: 5px
Padding: 18px
Font: sans-serif
Use shadow tokens from Section 6.
```

### Build a Button

```
Primary: bg var(--accent), text white
Ghost: bg transparent, border #52525b
Padding: 8px 18px
Radius: 5px
Hover: opacity 0.9 or lighter shade
Focus: ring with var(--accent)
```

### Build a Page Layout

```
Background: #f8fafc
Max-width: 1024px, centered
Grid: 4px base
Responsive: mobile-first, breakpoints from Section 9
```

### Build a Stats Card

```
Surface: #fff7ed
Label: #94a3b8 (muted, 12px, uppercase)
Value: #1e293b (primary, 24-32px, bold)
Status: use success/warning/danger from Section 2
```

### Build a Form

```
Input bg: #f8fafc
Input border: 1px solid #52525b
Focus: border-color var(--accent)
Label: #94a3b8 12px
Spacing: 18px between fields
Radius: 5px
```

### General Component

```
1. Read DESIGN.md Sections 2-6 for tokens
2. Colors: only from palette
3. Font: sans-serif, type scale from Section 3
4. Spacing: 4px grid
5. Components: match patterns from Section 4
6. Elevation: shadow tokens
```
