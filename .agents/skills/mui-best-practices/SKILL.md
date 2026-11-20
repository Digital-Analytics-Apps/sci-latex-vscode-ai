---
name: mui-best-practices
description: Official rules, design patterns, and engineering best practices for Material UI (MUI v5/v6), covering Palette (Light/Dark), Typography, Spacing (8px grid), Shape, Transitions, Extensible Themes (CSS Variables), Bundle Size Optimization, Strict TypeScript, and Polymorphic Composition.
---

# Material UI (MUI) Best Practices & Architecture Guide

> **Official AI & LLM Index**: [MUI LLMs Documentation (`llms.txt`)](https://mui.com/material-ui/llms.txt)  
> When fetching official markdown twins of any MUI documentation page, append `.md` to the URL path (e.g., `https://mui.com/material-ui/customization/css-theme-variables/overview.md`).

When designing, building, or refactoring components with Material UI (MUI v5/v6) and Base UI, ALWAYS follow these mandatory rules and architectural principles.

---

## 1. Palette & Color Schemes (Light & Dark)
**Reference**: [MUI Palette Customization](https://mui.com/material-ui/customization/palette/)

- **Zero Hardcoded Colors in JSX**: NEVER write raw HEX, RGB, or HSL strings in inline styles or `sx` props (e.g., `sx={{ color: '#1976d2', bgcolor: '#fff' }}`). ALWAYS reference semantic theme tokens (`color: 'primary.main'`, `bgcolor: 'background.paper'`).
- **Use Canonical Colors from `@mui/material/colors`**: In `theme/tokens.ts` or `palette.ts`, derive intentions (`primary`, `secondary`, `error`, etc.) from official MUI colors (`blue`, `grey`, `amber`, `purple`, etc.), never from ad-hoc hex tables or unrelated framework palettes (e.g., Tailwind).
- **Mandatory `alpha()` for Opacities and Contrasts**: Never write static `rgba(...)` strings. Always compute opacities dynamically using `alpha` from `@mui/material/styles`:
  ```typescript
  import { alpha } from '@mui/material/styles';
  import { colors } from './tokens';

  text: {
    primary: alpha(colors.black, 0.87),
    secondary: alpha(colors.black, 0.60),
    disabled: alpha(colors.black, 0.38),
  },
  divider: alpha(colors.black, 0.12),
  ```
- **Single Source of Truth (SSOT)**: Do NOT redeclare CSS variables like `--primary-50` or font tokens in global `.css` files (`index.css`). When `cssVariables: true` is enabled in `createTheme`, MUI automatically emits and injects `--mui-palette-*` variables into `:root`.
- **SSR Dark Mode Flickering Prevention (`InitColorSchemeScript`)**:
  Per [InitColorSchemeScript doc](https://mui.com/material-ui/react-init-color-scheme-script.md), always place `<InitColorSchemeScript attribute="data-mui-color-scheme" />` at the very top of `<head>` or `<body>` (e.g., in Next.js `layout.tsx` or `index.html`) to eliminate the white-flash flickering when loading dark mode in SSR/hydration.
- **CSS Theme Variables by Default**: Always enable CSS variables in the theme ([Config guide](https://mui.com/material-ui/customization/css-theme-variables/configuration.md)):
  ```typescript
  export const theme = createTheme({
    cssVariables: {
      colorSchemeSelector: 'data-mui-color-scheme', // or 'class'
    },
    colorSchemes: {
      light: {
        palette: lightPalette,
      },
      dark: {
        palette: darkPalette,
      },
    },
  });
  ```
- **WCAG AAA Contrast in Dark Mode**: When using a light tone as `primary.main` in Dark Mode (e.g., `#90caf9`), ensure `contrastText` is dark (`alpha(colors.black, 0.87)`), never white.
- **Use Theme Action Opacities**: For custom hover or selected states, adhere to official MUI opacities:
  - `action.hover`: `alpha(color, 0.04)` (Light) / `alpha(color, 0.08)` (Dark)
  - `action.selected`: `alpha(color, 0.08)` (Light) / `alpha(color, 0.16)` (Dark)
  - `action.disabled`: `alpha(color, 0.26)` (Light) / `alpha(color, 0.30)` (Dark)
  - `action.disabledBackground`: `alpha(color, 0.12)`

---

## 2. Spacing: The 8px Standard Grid
**Reference**: [MUI Spacing Customization](https://mui.com/material-ui/customization/spacing/)

- **Always use `theme.spacing` factors**: Never pass arbitrary pixel strings to margins, paddings, or gaps (e.g., avoid `p: '15px'`).
- The base unit is **`8px`**:
  - `p: 0.5` $\rightarrow$ `4px`
  - `p: 1` $\rightarrow$ `8px`
  - `p: 1.5` $\rightarrow$ `12px`
  - `p: 2` $\rightarrow$ `16px`
  - `p: 3` $\rightarrow$ `24px`
  - `p: 4` $\rightarrow$ `32px`
- In pure CSS / CSS Variables, use modular math based on `--mui-spacing-unit: 8px;`.

---

## 3. Typography Hierarchy & DRY Principles
**Reference**: [MUI Typography Customization](https://mui.com/material-ui/customization/typography/)

- **DRY Font Family**: Declare `fontFamily` **once** at the root of the `typography` configuration object. Child variants (`h1` through `h6`, `body1`, `body2`, etc.) inherit it automatically. NEVER repeat `fontFamily` in individual variant sub-objects unless a specific variant intentionally uses a different display/monospace font.
- **Strict Variant Usage**: Use semantic `<Typography variant="...">` components instead of arbitrary font sizes:
  - `h1` through `h6` for structural headings.
  - `subtitle1` (16px, regular) and `subtitle2` (14px, medium) for lead texts and section subheadings.
  - `body1` (16px) and `body2` (14px) for reading content.
  - `button` (14px, uppercase, 500 weight, `letter-spacing: 0.02857em`) for actions.
  - `caption` (12px, regular) for helper texts and badges.
- **Font Stack**: Default to Roboto / System UI stack:
  `"Roboto", -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif`.

---

## 4. Shape & Borders
**Reference**: [MUI Shape Customization](https://mui.com/material-ui/customization/shape/)

- Default `theme.shape.borderRadius` is `4px`.
- Maintain proportional radii across related components:
  - Small / Inputs / Buttons: `4px` (`--shape-sm`)
  - Menus / Cards / Dialogs: `8px` (`--shape-lg`)
  - Badges / Pill Chips / Avatars: `9999px` (`--shape-full`)

---

## 5. Transitions & Motion
**Reference**: [MUI Transitions Customization](https://mui.com/material-ui/customization/transitions/)

- Use Material Design easing curves:
  - **Standard (easeInOut)**: `cubic-bezier(0.4, 0, 0.2, 1)` (default for interactive feedback).
  - **Deceleration (easeOut)**: `cubic-bezier(0.0, 0, 0.2, 1)` (entering elements).
  - **Acceleration (easeIn)**: `cubic-bezier(0.4, 0, 1, 1)` (leaving elements).
- Use canonical durations:
  - `shortest`: `150ms` (hover, active transforms, small toggles)
  - `shorter`: `200ms` (fade, tooltips)
  - `short`: `250ms` (standard button color and elevation changes)
  - `standard`: `300ms` (drawers, modals, card expansions)
- In TypeScript/JSX, use:
  ```typescript
  transition: theme.transitions.create(['background-color', 'box-shadow'], {
    duration: theme.transitions.duration.short,
    easing: theme.transitions.easing.easeInOut,
  })
  ```

---

## 6. Composition & Polymorphism
**Reference**: [MUI Composition Guide](https://mui.com/material-ui/guides/composition/)

### 6.1. The `component` Prop & Routing Integration
Never wrap clickable components in unstyled `<a>` tags or nest interactive elements. Use the `component` prop with routing libraries (Next.js, React Router):

```tsx
import NextLink from 'next/link';
import Button from '@mui/material/Button';

// Correct: Polymorphic composition preserves theme styling, ripple, and keyboard a11y
<Button component={NextLink} href="/dashboard" variant="contained">
  Ir para Dashboard
</Button>
```

### 6.2. Mandatory `React.forwardRef`
Any custom component that wraps an HTML element or replaces an MUI component MUST forward its ref:

```tsx
export const CustomCard = React.forwardRef<HTMLDivElement, CustomCardProps>(
  function CustomCard(props, ref) {
    const { children, className, ...rest } = props;
    return (
      <div ref={ref} className={`custom-card ${className}`} {...rest}>
        {children}
      </div>
    );
  }
);
```

### 6.3. The `slots` and `slotProps` Pattern
When configuring complex components (DataGrid, Autocomplete, Pickers, Base UI), use `slots` and `slotProps` rather than overwriting deep class names with `!important`.

---

## 7. Strict TypeScript & Module Augmentation
**Reference**: [MUI TypeScript Guide](https://mui.com/material-ui/guides/typescript/)

- **Zero `any`**: Never bypass typing in theme overrides, event handlers, or custom props.
- **Extend Themes via Module Augmentation**: Place declarations in `src/theme/theme.d.ts`:

```typescript
import '@mui/material/styles';

declare module '@mui/material/styles' {
  interface Palette {
    neutral?: Palette['primary'];
  }
  interface PaletteOptions {
    neutral?: PaletteOptions['primary'];
  }
  interface Shape {
    full: number | string;
  }
}

declare module '@mui/material/Button' {
  interface ButtonPropsColorOverrides {
    neutral: true;
  }
}
```

---

## 8. Minimizing Bundle Size & Performance
**Reference**: [MUI Bundle Size Optimization](https://mui.com/material-ui/guides/minimizing-bundle-size/)

- **Direct Imports (Path Imports)**: In projects without automatic tree-shaking plugins (Babel/SWC transform imports), avoid top-level destructuring:
  ```typescript
  // Preferred for minimal bundle size and fast cold-start builds:
  import Button from '@mui/material/Button';
  import TextField from '@mui/material/TextField';
  import Box from '@mui/material/Box';

  // Avoid if tree-shaking is unconfigured:
  // import { Button, TextField, Box } from '@mui/material';
  ```
- **Zero-Runtime with CSS Theme Variables**: Prefer `cssVariables: true` over runtime theme providers that recalculate styles in JS on every theme toggle. Theme switching should only modify a DOM attribute (`data-mui-color-scheme="dark"`).

---

## 9. Quick Anti-Patterns Checklist

| ❌ Anti-Pattern | ✅ MUI Recommended Standard |
| :--- | :--- |
| `sx={{ p: '14px', m: '7px' }}` | `sx={{ p: 1.75, m: 1 }}` (Multipliers of the 8px grid) |
| `sx={{ color: '#1976d2' }}` | `sx={{ color: 'primary.main' }}` |
| Duplicating `--primary-50` in `index.css` | Let MUI generate `--mui-palette-*` via `cssVariables: true` |
| Static `rgba(0,0,0,0.87)` in palette | `alpha(colors.black, 0.87)` via `@mui/material/styles` |
| Repeating `fontFamily` in `h1`-`h6` | Declare `fontFamily` once on `typography` root (inherits automatically) |
| `!important` in CSS selectors | Theme overrides via `createTheme({ components: { ... } })` or `slotProps` |
| `<a href="/"><Button>...</Button></a>` | `<Button component={Link} href="...">...</Button>` |
| Casting with `(theme as any)` | Module augmentation via `declare module '@mui/material/styles'` |
| White text on Light Blue in Dark Mode | Dark text (`alpha(colors.black, 0.87)`) via `contrastText` for AAA accessibility |
