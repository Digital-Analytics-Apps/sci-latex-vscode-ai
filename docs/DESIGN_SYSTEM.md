# 🎨 SCIA Design System (SCI-LaTeX)

> **Versão:** 2.0.0  
> **Status:** Ativo / Produção  
> **Filosofia:** Ergonomia Visual, Alta Produtividade Científica & Zero Fadiga (Soft UI + Modern Clean SaaS)  
> **Aplicações:** Frontend Web SCIA (`sci-latex-vscode`) & Suíte IDE VS Code  

---

## 📑 Sumário Executivo

1. [Visão Geral & Princípios Norteadores](#1-visão-geral--princípios-norteadores)
2. [Arquitetura em Camadas do Design System](#2-arquitetura-em-camadas-do-design-system)
3. [Design Tokens (Fundamentos Visuais)](#3-design-tokens-fundamentos-visuais)
   - 3.1. [Cores e Superfícies (Light & Dark)](#31-cores-e-superfícies-light--dark)
   - 3.2. [Sistema de Cores Determinístico de Usuários (DJB2)](#32-sistema-de-cores-determinístico-de-usuários-djb2)
   - 3.3. [Tipografia & Fontes Self-Hosted](#33-tipografia--fontes-self-hosted)
   - 3.4. [Espaçamento, Grid & Breakpoints](#34-espaçamento-grid--breakpoints)
   - 3.5. [Cantos Arredondados (Border Radius)](#35-cantos-arredondados-border-radius)
   - 3.6. [Tridimensionalidade, Sombras & Soft Elevation](#36-tridimensionalidade-sombras--soft-elevation)
   - 3.7. [Anéis de Foco & Acessibilidade](#37-anéis-de-foco--acessibilidade)
4. [Sistema Semântico de Estados Acadêmicos](#4-sistema-semântico-de-estados-acadêmicos)
5. [Catálogo de Componentes Padronizados](#5-catálogo-de-componentes-padronizados)
   - 5.1. [Layout & Casca da Aplicação (`AppHeaderBar`, `PageContainer`)](#51-layout--casca-da-aplicação)
   - 5.2. [Cartões & Superfícies (`MuiCard`, `MetricCard`)](#52-cartões--superfícies)
   - 5.3. [Modais Padronizados (`StandardModal`)](#53-modais-padronizados)
   - 5.4. [Tabelas de Dados (`GenericDataGrid` & `dataGridColumns`)](#54-tabelas-de-dados-genericdatagrid--datagridcolumns)
   - 5.5. [Barra de Filtros & Controles (`TableFilters`)](#55-barra-de-filtros--controles)
   - 5.6. [Avatares & Identidade (`UserAvatar`, `UserAvatarStack`, `SciLatexAnimatedLogo`)](#56-avatares--identidade)
   - 5.7. [Governança Editorial & Linha do Tempo (`ArticleTimelineHeader`, `GatekeeperLockBadge`)](#57-governança-editorial--linha-do-tempo)
   - 5.8. [Ambiente de Escrita Web-Nativo & Revisão Ancorada (`CodeMirrorEditor`, `ReviewSidebar`, `PdfPreview`)](#58-ambiente-de-escrita-web-nativo--revisão-ancorada)
6. [Padrões de Interação, UX & Estado](#6-padrões-de-interação-ux--estado)
   - 6.1. [URL-First Filter Pattern](#61-url-first-filter-pattern)
   - 6.2. [Zero-Flicker UX com TanStack Query](#62-zero-flicker-ux-com-tanstack-query)
   - 6.3. [Governança por Estado de Domínio](#63-governança-por-estado-de-domínio)
   - 6.4. [Presença & Concorrência Visual](#64-presença--concorrência-visual)
7. [Diretrizes de Acessibilidade & Ergonomia](#7-diretrizes-de-acessibilidade--ergonomia)
8. [Mapeamento Técnico de Arquivos no Repositório](#8-mapeamento-técnico-de-arquivos-no-repositório)

---

## 1. Visão Geral & Princípios Norteadores

O **SCIA Design System** foi concebido especificamente para ambientes de alta densidade cognitiva e jornadas prolongadas de trabalho (escrita em LaTeX, compilação de PDFs, avaliação por pares, acompanhamento de cronogramas acadêmicos e auditoria pelo NIT).

```
┌────────────────────────────────────────────────────────────────────────┐
│                   SCIA DESIGN SYSTEM ARCHITECTURE                      │
├─────────────────┬───────────────────┬──────────────────┬───────────────┤
│ 1. Zero Eye     │ 2. Soft           │ 3. 85/15 Chromatic│ 4. Air-Gapped │
│    Strain       │    Elevation      │    Rule          │    Typography │
│ (Slate & Neutrals│ (Diffused Shadows│ (Calm Neutrals + │ (100% Offline │
│  sem #000/#FFF) │  sem bordas duras)│  Cobalt Blue)    │  Self-Hosted) │
└─────────────────┴───────────────────┴──────────────────┴───────────────┘
```

### 🌟 Os Cinco Pilares

1. **Zero Fadiga Visual (Ergonomia Contínua):**
   - Eliminação de pretos absolutos (`#000000`) e brancos puros ofuscantes (`#FFFFFF` em áreas de fundo extenso).
   - O modo claro adota o fundo descansado `Slate 50` (`#F8FAFC`) com texto `Slate 800` (`#1E293B`).
   - O modo escuro adota o fundo `Slate 900` (`#0F172A`) com superfícies em `Slate 800` (`#1E293B`) e texto `Slate 50` (`#F8FAFC`).
2. **Superfícies Flutuantes (Soft Elevation):**
   - Substituição de linhas pretas duras de 1px por tridimensionalidade suave via sombras difusas de baixa opacidade combinadas com bordas semi-transparentes (`rgba(226, 232, 240, 0.8)` no modo claro e `rgba(51, 65, 85, 0.6)` no modo escuro).
3. **Regra Cromática 85/15 (Foco Guiado):**
   - **85% da interface:** Neutros relaxantes (Slate/Off-White/Dark Slate) para evitar cansaço sensorial.
   - **15% da interface:** Toques focais cromáticos de alto contraste (Azul Cobalto `#2563EB` / `#3B82F6` para ações primárias, anéis de foco e badges de estado em tons pastel).
4. **Espaçamento Funcional & Hierarquia (Whitespace-First):**
   - A hierarquia visual decorre prioritariamente do ritmo de espaçamento e contrastes tipográficos estruturados, evitando o excesso de caixas e divisórias redundantes.
5. **Autonomia & Privacidade (Offline-First / Air-Gapped Ready):**
   - Tipografia 100% auto-hospedada via pacotes `@fontsource`, garantindo operação plena e sem vazamento de telemetria em servidores acadêmicos isolados da internet.

---

## 2. Arquitetura em Camadas do Design System

A infraestrutura de estilo do frontend do SCIA é composta por 4 camadas integradas:

```
┌────────────────────────────────────────────────────────┐
│  4. Feature & Layout Layer                             │
│     (AuthorLayout, ReviewerLayout, ManagerLayout)     │
├────────────────────────────────────────────────────────┤
│  3. Standardized Shared Components                     │
│     (GenericDataGrid, StandardModal, MetricCard, etc.) │
├────────────────────────────────────────────────────────┤
│  2. MUI Engine Overrides & Theme Context               │
│     (theme/index.tsx, components.ts, palette.ts)       │
├────────────────────────────────────────────────────────┤
│  1. Pure Design Tokens & CSS Variables                 │
│     (theme/tokens.ts, typography.ts, index.css)        │
└────────────────────────────────────────────────────────┘
```

---

## 3. Design Tokens (Fundamentos Visuais)

### 3.1. Cores e Superfícies (Light & Dark)

A paleta central baseia-se na escala **Tailwind CSS v3/v4** combinada com a camada semântica customizada para o ecossistema acadêmico.

#### 🔹 Superfícies e Textos

| Token | Light Mode | Dark Mode | Função / Aplicação |
| :--- | :--- | :--- | :--- |
| `background.default` | `#F8FAFC` (`slate.50`) | `#0F172A` (`slate.900`) | Fundo principal da aplicação |
| `background.paper` | `#FFFFFF` (`white`) | `#1E293B` (`slate.800`) | Superfícies flutuantes (Cards, Modais, Painéis) |
| `background.subtle` | `#F1F5F9` (`slate.100`) | `#1E293B` (`slate.800`) | Fundos de seções secundárias e cabeçalhos |
| `background.muted` | `#E2E8F0` (`slate.200`) | `#334155` (`slate.700`) | Caixas de entrada desativadas / divisores |
| `text.primary` | `#1E293B` (`slate.800`) | `#F8FAFC` (`slate.50`) | Tipografia de leitura prioritária e títulos |
| `text.secondary` | `#64748B` (`slate.500`) | `#94A3B8` (`slate.400`) | Metadados, legendas, subtítulos |
| `text.muted` | `#94A3B8` (`slate.400`) | `#64748B` (`slate.500`) | Textos desativados e placeholders |
| `border.default` | `rgba(226, 232, 240, 0.8)` | `rgba(51, 65, 85, 0.6)` | Bordas suaves de cartões e inputs |
| `border.strong` | `#CBD5E1` (`slate.300`) | `#334155` (`slate.700`) | Divisões de alta ênfase |

#### 🔹 Cores de Marca e Ações (Cobalt Blue & Indigo)

| Token | Light Mode | Dark Mode | Função / Aplicação |
| :--- | :--- | :--- | :--- |
| `primary.main` | `#2563EB` (`blue.600`) | `#3B82F6` (`blue.500`) | Ações primárias, links, botões principais |
| `primary.hover` | `#1D4ED8` (`blue.700`) | `#60A5FA` (`blue.400`) | Estado de hover primário |
| `primary.active` | `#1E40AF` (`blue.800`) | `#93C5FD` (`blue.300`) | Estado pressionado / ativo |
| `primary.light` | `#EFF6FF` (`blue.50`) | `#172554` (`blue.950`) | Fundo sutil de destaque / seleção |
| `primary.contrast`| `#FFFFFF` | `#FFFFFF` | Texto sobre superfícies primárias |
| `secondary.main` | `#4F46E5` (`indigo.600`)| `#818CF8` (`indigo.400`)| Ações secundárias, filtros e controles |
| `secondary.light`| `#EEF2FF` (`indigo.50`) | `#1E1B4B` (`indigo.950`)| Fundos sutis secundários |

#### 🔹 Cores Semânticas de Status

| Canal | Light Mode (`main` / `light`) | Dark Mode (`main` / `light`) | Significado no SCIA |
| :--- | :--- | :--- | :--- |
| **Success** | `#059669` / `#ECFDF5` (`emerald`) | `#34D399` / `#022C22` (`emerald`) | Concluído, Aprovado pelo NIT, Merged, No Prazo |
| **Warning** | `#D97706` / `#FFFBEB` (`amber`) | `#FBBF24` / `#451A03` (`amber`) | Em Avaliação, Alerta de Prazo, Gatekeeper Ativo |
| **Error** | `#DC2626` / `#FEF2F2` (`red`) | `#F87171` / `#450A0A` (`red`) | Parecer Rejeitado, Atrasado, Ajustes Solicitados |
| **Info** | `#0284C7` / `#F0F9FF` (`sky`) | `#38BDF8` / `#082F49` (`sky`) | Tarefa em andamento, informativo de diff |

---

### 3.2. Sistema de Cores Determinístico de Usuários (DJB2)

Para garantir identidade visual imediata nos artigos e cronogramas, todo autor, revisor ou gestor recebe uma cor permanente e determinística em seus avatares baseada no algoritmo **DJB2 hash**.

```
Input (ID / Nome / Email) ──► DJB2 Hash ──► Index % 16 ──► Cor Fixa Consistente
```

A paleta é composta por **16 cores vibrantes e contrastantes** (`frontend/src/utils/memberUtils.ts`):

| Índice | Cor | Hexadecimal | Identificador |
| :---: | :--- | :--- | :--- |
| `0` | Cobalt Blue | `#2563EB` | `colors.blue[600]` |
| `1` | Indigo | `#4F46E5` | `colors.indigo[600]` |
| `2` | Violet | `#7C3AED` | `colors.violet[600]` |
| `3` | Emerald | `#059669` | `colors.emerald[600]` |
| `4` | Rose | `#E11D48` | `colors.rose[600]` |
| `5` | Cyan | `#0891B2` | `colors.cyan[600]` |
| `6` | Amber | `#D97706` | `colors.amber[600]` |
| `7` | Teal | `#0D9488` | `colors.teal[600]` |
| `8` | Fuchsia | `#C026D3` | `colors.fuchsia[600]` |
| `9` | Purple | `#9333EA` | `colors.purple[600]` |
| `10` | Sky Blue | `#0284C7` | `colors.sky[600]` |
| `11` | Orange | `#EA580C` | `colors.orange[600]` |
| `12` | Bright Red | `#DC2626` | `colors.red[600]` |
| `13` | Pink | `#DB2777` | `colors.pink[600]` |
| `14` | Lime Green | `#65A30D` | `colors.lime[600]` |
| `15` | Slate Dark | `#475569` | `colors.slate[600]` |

---

### 3.3. Tipografia & Fontes Self-Hosted

O sistema utiliza exclusivamente fontes locais auto-hospedadas:

1. **Sans-Serif Principal:** `"Inter"`, `"Plus Jakarta Sans"`, `system-ui`, `-apple-system`, `sans-serif`
2. **Monoespaçada (Código & LaTeX):** `"JetBrains Mono"`, `ui-monospace`, `Menlo`, `Monaco`, `monospace`
3. **Serifada (Textos Acadêmicos):** `ui-serif`, `Georgia`, `Cambria`, `"Times New Roman"`, `serif`

#### 📏 Escala Tipográfica Padronizada (`frontend/src/theme/typography.ts`)

| Variante MUI | Font Size | Peso | Line Height | Letter Spacing | Utilização Primária |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **`h1`** | `1.85rem` (~30px) | `700` (Bold) | `1.2` | `-0.035em` | Títulos principais de páginas |
| **`h2`** | `1.45rem` (~23px) | `700` (Bold) | `1.25` | `-0.03em` | Títulos de grandes seções / Dashboards |
| **`h3`** | `1.22rem` (~20px) | `650` (SemiBold) | `1.3` | `-0.025em` | Títulos de Modais e Painéis Centrais |
| **`h4`** | `1.05rem` (~17px) | `600` (SemiBold) | `1.35` | `-0.015em` | Cabeçalhos de Cards e Agrupamentos |
| **`h5`** | `0.95rem` (~15px) | `600` (SemiBold) | `1.4` | `normal` | Sub-seções de formulários |
| **`h6`** | `0.875rem` (~14px) | `600` (SemiBold) | `1.4` | `normal` | Títulos de tabelas e listas |
| **`subtitle1`** | `0.875rem` (~14px) | `500` (Medium) | `1.4` | `normal` | Texto de apoio e introduções |
| **`subtitle2`** | `0.8125rem` (~13px)| `500` (Medium) | `1.4` | `normal` | Rótulos de células destacadas |
| **`body1`** | `0.8125rem` (~13px)| `400` (Regular) | `1.5` | `normal` | Texto padrão de leitura contínua |
| **`body2`** | `0.75rem` (~12px) | `400` (Regular) | `1.45` | `normal` | Conteúdo secundário de células e listas |
| **`button`** | `0.8125rem` (~13px)| `600` (SemiBold) | `1.0` | `0.01em` | Rótulo de botões (`textTransform: none`) |
| **`caption`** | `0.70rem` (~11px) | `400` (Regular) | `1.3` | `normal` | Timestamps, metadados, contadores |
| **`overline`** | `0.65rem` (~10px) | `700` (Bold) | `1.0` | `0.08em` | Badges em caixa-alta / Etapas |

---

### 3.4. Espaçamento, Grid & Breakpoints

O SCIA adota a escala de espaçamento com **módulo base de 4px (0.25rem)** e incrementos de 8px:

```
0: 0px   | 1: 4px   | 2: 8px   | 3: 12px  | 4: 16px  
5: 20px  | 6: 24px  | 8: 32px  | 10: 40px | 12: 48px
```

- **Padding Padrão de Páginas (`PageContainer`):**
  - Mobile (`xs`): `16px` (`p: 2`)
  - Tablet (`sm`): `24px` (`p: 3`)
  - Desktop (`md+`): `32px` (`p: 4`)
- **Breakpoints Responsivos (MUI):**
  - `xs`: `0px`
  - `sm`: `600px`
  - `md`: `900px`
  - `lg`: `1200px`
  - `xl`: `1536px`

---

### 3.5. Cantos Arredondados (Border Radius)

| Token | Valor | Aplicação no Sistema |
| :--- | :--- | :--- |
| `radius.none` | `0px` | Barras de navegação de largura total (`AppHeaderBar`), dividers |
| `radius.sm` | `2px` (`0.125rem`) | Marcadores de progresso internos, barras finas |
| `radius.default` | `4px` (`0.25rem`) | Blocos inline de código (`<code>`, `<pre>`), badges compactas |
| `radius.md` | `6px` (`0.375rem`) | Caixas de seleção secundárias, sub-menus |
| `radius.lg` | `8px` (`0.5rem`) | Tooltips, menus suspensos, barras de filtro |
| `radius.xl` | `10px` (`0.625rem`) | **Botões (`MuiButton`), Campos de Entrada (`MuiOutlinedInput`)** |
| `radius.2xl` | `16px` (`1.0rem`) | **Cartões (`MuiCard`), Modais (`StandardModal`), Gavetas** |
| `radius.3xl` | `24px` (`1.5rem`) | Caixas de diálogo destacadas |
| `radius.full` | `9999px` | **Badges e Chips de Status (`MuiChip`), Avatares circulares** |

---

### 3.6. Tridimensionalidade, Sombras & Soft Elevation

O sistema rejeita sombras pretas pesadas de interfaces antigas. Utiliza camadas difusas e suaves:

```css
/* Elevação Suave Padrão (Cards e Painéis) */
--shadow-soft-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
--shadow-soft-md: 0 4px 6px -1px rgba(0, 0, 0, 0.07), 0 2px 4px -2px rgba(0, 0, 0, 0.05);
--shadow-soft-lg: 0px 10px 20px -3px rgba(0, 0, 0, 0.04), 0px 4px 6px -2px rgba(0, 0, 0, 0.02);

/* Elevação de Interação (Hover em Cards Interativos) */
--shadow-soft-hover: 0px 20px 27px 0px rgba(0, 0, 0, 0.08);

/* Sombra de Botão Primário no Hover */
--shadow-primary-hover: 0px 4px 12px rgba(37, 99, 235, 0.18);
```

#### Efeito de Elevação Dinâmica
- Cartões estáticos **NÃO** flutuam no hover.
- Apenas elementos explicitamente interativos (`.MuiCard-interactive`, `[role='button']` ou com `CardActionArea`) executam:
  ```css
  transform: translateY(-2px);
  box-shadow: 0px 20px 27px 0px rgba(0, 0, 0, 0.08);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
  ```

---

### 3.7. Anéis de Foco & Acessibilidade

Para conformidade estrita com o critério **WCAG 2.1 AA** (Foco Visível):
- Todo componente de entrada (`MuiOutlinedInput`) focado recebe um anel de realce translúcido de 3px:
  ```css
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.15);
  border-color: #2563EB;
  ```

---

## 4. Sistema Semântico de Estados Acadêmicos

A plataforma organiza fluxos de trabalho através de enumerações rígidas (`src/constants/status.ts`), cada qual associada a representações visuais unificadas:

### 4.1. Pull Request Status (`PRStatus`)

| Status | Rótulo PT-BR | Cor / Variante | Componente |
| :--- | :--- | :--- | :--- |
| `DRAFT` | Rascunho | Cinza (`default` / outlined) | `<PRStatusChip />` |
| `UNDER_REVIEW` | Em Avaliação | Amarelo (`warning` / outlined) | `<PRStatusChip />` |
| `CHANGES_REQUESTED` | Ajustes Solicitados | Vermelho (`error` / outlined) | `<PRStatusChip />` |
| `APPROVED` | Aprovado | Verde (`success` / outlined) | `<PRStatusChip />` |
| `MERGED` | Mesclado (Merged) | Azul/Ciano (`info` / outlined) | `<PRStatusChip />` |
| `CANCELLED` | Cancelado | Cinza Muted (`default` / outlined) | `<PRStatusChip />` |

### 4.2. Parecer do NIT (`NITStatus`)

| Status | Rótulo PT-BR | Significado Visual |
| :--- | :--- | :--- |
| `WAITING_NIT` | Aguardando Parecer NIT | Badge âmbar indicando retenção na governança |
| `APPROVED_NIT` | NIT Aprovado | Badge verde esmeralda liberando submissão à conferência |
| `REJECTED_NIT` | NIT Rejeitado | Badge vermelha exigindo revisão de propriedade intelectual |
| `NOT_REQUIRED` | Não Exigido | Badge cinza discreta para artigos dispensados |

### 4.3. Prazos e Deadlines (`DeadlineStatus`)

| Status | Indicador Visual | Condição |
| :--- | :--- | :--- |
| `ON_TIME` | 🟢 Verde (`success`) | Prazo superior a 7 dias da entrega |
| `WARNING_SOON` | 🟡 Âmbar (`warning`) | Prazo crítico (≤ 7 dias restantes) |
| `OVERDUE` | 🔴 Vermelho (`error`) | Prazo estourado (data no passado) |

### 4.4. Etapas do Artigo (`StageStatus`) & Travas Gatekeeper

| Status | Símbolo Visual | Descrição |
| :--- | :---: | :--- |
| `NOT_STARTED` | `○` Slate | Etapa cadastrada, sem início de trabalho |
| `IN_PROGRESS` | `●` Azul Cobalto | Sub-tarefas ativas sendo editadas |
| `COMPLETED` | `✓` Verde Esmeralda | Todas as sub-tarefas concluídas e mescladas |
| `LOCKED` | `🔒` Âmbar / Cinza | Etapa retida por dependência ou trava de Gatekeeper |

---

## 5. Catálogo de Componentes Padronizados

### 5.1. Layout & Casca da Aplicação

#### `<AppHeaderBar />`
Barra de cabeçalho unificada presente em todas as personas (`AuthorLayout`, `ReviewerLayout`, `CoordinatorLayout`, `ManagerLayout`):
- **Identidade:** Exibe o logo animado interativo do SCIA (`SciLatexAnimatedLogo`) e título contextual da aplicação.
- **Conectividade em Tempo Real:** Indicador SSE com pulso visual (`SignalCellularAltIcon`) indicando status da conexão via `useSSEEventSource`.
- **Alternador de Tema:** Botão circular discreto com ícones `Brightness4Icon` / `Brightness7Icon` integrado ao `ThemeContextProvider`.
- **Perfil & Sessão:** Avatar do usuário autenticado com menu suspenso de logout seguro.

#### `<PageContainer />`
Envoltório padrão obrigatório de qualquer página com suporte anti-overflow para DataGrids responsivas:
```tsx
<PageContainer disablePadding={false}>
  {/* Conteúdo flexível com ajuste automático a 100% de largura e altura */}
</PageContainer>
```

---

### 5.2. Cartões & Superfícies

#### `<MetricCard />`
Cartão padronizado para dashboards de gerência, coordenação e visão geral do artigo:
- Exibe título em `subtitle2`, valor de destaque numérico formatado, ícone representativo com fundo suave e chips de prazo (`DeadlineStatusChip`).
- Suporte nativo a indicador de carregamento com esqueleto (`CircularProgress`).

---

### 5.3. Modais Padronizados (`StandardModal`)

Todas as caixas de diálogo da plataforma utilizam `<StandardModal />`, proibindo modais construídos do zero com `MuiDialog` sem os padrões de tamanho pré-calibrados:

#### Presets de Dimensão Fixa (`SIZE_PRESETS`)

| Tamanho | Largura (`width`) | Altura (`height`) | Uso Recomendado |
| :---: | :---: | :---: | :--- |
| **`sm`** | `560px` | `560px` | Confirmações, deleções, inputs simples (ex: `AddMemberModal`) |
| **`md`** | `740px` | `640px` | Formulários médios (ex: `CreateTaskModal`, `SaveProgressModal`) |
| **`lg`** | `920px` | `720px` | Gestão de etapas, formulários longos (ex: `ProjectSettingsModal`) |
| **`xl`** | `1140px` | `780px` | Pareceres complexos, diffs comparativos (ex: `NITParecerModal`) |

---

### 5.4. Tabelas de Dados (`GenericDataGrid` & `dataGridColumns`)

Todas as tabelas de listagem são implementadas através de `<GenericDataGrid<TData>>`, garantindo internacionalização nativa em Português (`ptBR`), paginação padronizada (`[5, 10, 25, 50]`) e zero reflows.

#### Helpers de Definição de Colunas (`dataGridColumns.tsx`)

Para garantir reutilização e conformidade tipográfica:

1. **`createBoldColumn<TRow>(config)`**: Coluna com `fontWeight: 700` para títulos e nomes principais.
2. **`createChipColumn<TRow>(config, getChipProps)`**: Renderiza Chips temáticos com peso semântico.
3. **`createDateColumn<TRow>(config)`**: Formata datas no padrão brasileiro (`DD/MM/YYYY`) com fallback amigável `—`.
4. **`createTitleSubtitleColumn<TRow>(config, getProps)`**: Apresenta título em destaque, subtítulo auxiliar em cinza suave e ícone contextual.
5. **`createProgressColumn<TRow>(config, getProgressProps)`**: Renderiza barra linear de progresso com porcentagem descritiva.
6. **`createAvatarStackColumn<TRow>(config, getMembers)`**: Renderiza pilha sobreposta de avatares com tooltips informativos de papéis.
7. **`createActionsColumn<TRow>(config, actionsOrRender)`**: Coluna de ações fixada e alinhada à direita com botões estilizados.

---

### 5.5. Barra de Filtros & Controles (`TableFilters`)

A busca e a filtragem de tabelas adotam o conjunto atômico:
- **`<TableSearchInput />`**: Campo de entrada com ícone de lupa e debounce de 400ms.
- **`<TableSelectFilter />`**: Seletor dropdown padronizado para status, membros ou ciclos acadêmicos.
- **`<ClearFiltersButton />`**: Botão com ícone `FilterListOffIcon` visível unicamente quando há filtros ativos.
- **`<TableHeaderFilterToolbar />`**: Grade responsiva que alinha busca, dropdowns e ações no cabeçalho do cartão.

---

### 5.6. Avatares & Identidade

#### `<UserAvatar />` & `<UserAvatarStack />`
- Exibe o avatar circular com as iniciais do pesquisador.
- Utiliza **cor determinística DJB2** permanente para cada membro.
- Em listas com múltiplos autores, `<UserAvatarStack />` sobrepõe os círculos com borda de respiro de 2px na cor de fundo do cartão (`background.paper`).

#### `<SciLatexAnimatedLogo />`
Logotipo vetorial interativo da plataforma com animação de traço em curvas Bézier, efeitos de glow nos modos escuro e claro, e transição suave no hover (`scale(1.03)`).

---

### 5.7. Governança Editorial & Linha do Tempo

#### `<ArticleTimelineHeader />`
Componente em formato **Régua Institucional das 6 Etapas Fixas (ADR-008)**:
- **Nós de Conexão Sequencial:** Exibe as 6 etapas imutáveis da pesquisa com seus respectivos status, datas planejadas (`plannedCompletionDate`) e percentual de avanço.
- **Imutabilidade Estrutural:** Sem exclusão ou reordenação arbitrária (remoção integral de `@dnd-kit`).
- **Travas Fixas de Gatekeeper:** A Etapa 5 (**NIT 🔒**) e a Etapa 6 (**Congresso Alvo 🔒**) possuem bloqueio sequencial rígido.

#### `<GatekeeperLockBadge />`
Badge de governança que protege a integridade do ciclo acadêmico:
- **Trava 1 (NIT):** Bloqueia a solicitação ao NIT até que a Etapa 4 (Revisão Geral) atinja status `COMPLETED`.
- **Trava 2 (Congresso Alvo):** Bloqueia a submissão final ao congresso até a homologação de parecer favorável (`APPROVED_NIT`).

---

### 5.8. Ambiente de Escrita Web-Nativo & Revisão Ancorada

#### `<CodeMirrorEditor />`
- Editor de alta performance baseado em **CodeMirror 6**, com Transformação Operacional em tempo real (`@codemirror/collab`), latência local zero (<16ms) e digitação fluida.
- Suporte nativo a extensões de LaTeX (syntax highlighting, autocompletion `\cite`/`\ref`, folding e linter).
- Proteção de integridade para a persona do Revisor via injeção dinâmica de `EditorState.readOnly.of(true)`.

#### `<ReviewSidebar />`
- Gaveta lateral retrátil de anotações inline ancoradas por offsets de caracteres (`from`, `to`), com algoritmo de cascata anti-sobreposição de cards.
- Permite inserção de apontamentos, respostas em thread (`replies`) e marcação de status (`open` / `resolved`).

#### `<PdfPreview />`
- Visualizador de PDF compilado sincronizado lado a lado com o editor TeX, acionado automaticamente ou sob demanda com feedback de compilação.

#### `<EditorDiffViewer />`
- Visualizador de diferenças de texto entre snapshots e versões consolidadas do artigo científico.

## 6. Padrões de Interação, UX & Estado

```
┌────────────────────────────────────────────────────────────────────────┐
│                        SCIA UX & STATE PATTERNS                        │
├────────────────────────────────────────────────────────────────────────┤
│  1. URL-First: Query string como fonte da verdade dos filtros          │
│  2. Zero-Flicker: placeholderData: keepPreviousData no TanStack Query   │
│  3. Domain-Driven Actions: Transições governadas pelo ciclo de tarefas e etapas  │
│  4. Collaborative Presence: Cursores remotos e barra de coautores em tempo real │
└────────────────────────────────────────────────────────────────────────┘
```

### 6.1. URL-First Filter Pattern
1. Todo parâmetro de pesquisa, status ou paginação **deve** ser espelhado na URL via `useUrlFilters`.
2. Permite compartilhamento direto de links filtrados entre co-autores e revisores.
3. Suporta histórico nativo do navegador (voltar e avançar sem perda de contexto).

### 6.2. Zero-Flicker UX com TanStack Query
Para prevenir oscilações visuais de layout durante buscas ou trocas de página:
```tsx
const { data, isLoading, isFetching } = useTasksQuery(projectId, {
  ...filters,
  placeholderData: keepPreviousData, // Mantém dados anteriores na tela
});

// A DataGrid exibe loading sem desmontar a estrutura
<GenericDataGrid loading={isLoading || isFetching} ... />
```

### 6.3. Governança por Estado de Domínio
As ações do usuário na plataforma são governadas estritamente pela máquina de estados acadêmica da ADR-008:
- **Solicitar Revisão de Tarefa:** Habilitado para autores quando a tarefa na Etapa 3 estiver `IN_PROGRESS`.
- **Emitir Parecer / Solicitar Ajustes:** Habilitado para o Revisor Técnico Oficial com tarefa em `IN_REVIEW` ou na Etapa 4.
- **Revisão Geral (Etapa 4):** Iterações em rodadas de apontamentos macro sem desarmar a conclusão da Etapa 3.

### 6.4. Presença & Colaboração em Tempo Real
O editor implementa coordenação multi-usuário transparente:
- **Barra de Colaboradores (`CollaboratorsBar`):** Exibe avatares com presença ativa na sala WebSocket.
- **Cursores Remotos (`remoteCursorsExtension`):** Identificação visual dos coautores com cores determinísticas (DJB2) e tags com seus respectivos nomes.
- **Modo Revisor Estrito:** Revisor opera em modo somente-leitura com capacidade total de comentários ancorados (`ReviewSidebar`), sem risco de corrupção acidental do LaTeX.

## 7. Diretrizes de Acessibilidade & Ergonomia

1. **Relação de Contraste (WCAG 2.1 AA):**
   - Mínimo de `4.5:1` para texto padrão contra superfícies (`#1E293B` em `#F8FAFC` atinge `11.5:1`).
   - Mínimo de `3.0:1` para elementos gráficos, ícones e estados de foco.
2. **Navegação por Teclado:**
   - Todo diálogo, menu suspenso e botão de ação possui ordem de tabulação lógica (`tabIndex`) e encerramento com `Escape`.
3. **Modo Escuro Não Agressivo:**
   - Evita fundos `#000000` em monitores OLED que causam aberrações cromáticas e cansaço em texto branco. Adota o azul-ardósia profundo `#0F172A`.
4. **Respeito a Preferências de Movimento (`prefers-reduced-motion`):**
   - Animações e transições no logo e modais respeitam durações curtas (≤ 200ms) ou desativação quando solicitado pelo sistema operacional.

---

## 8. Mapeamento Técnico de Arquivos no Repositório

| Módulo / Camada | Caminho no Repositório | Responsabilidade Principal |
| :--- | :--- | :--- |
| **Tokens Puros** | `frontend/src/theme/tokens.ts` | Definição das paletas Tailwind, sombras, fontes e raios |
| **Paleta MUI** | `frontend/src/theme/palette.ts` | Configuração das variantes Light e Dark no MUI |
| **Tipografia** | `frontend/src/theme/typography.ts` | Escala tipográfica completa (h1-h6, body, caption) |
| **Component Overrides** | `frontend/src/theme/components.ts` | Customização global de botões, cards, inputs e tabelas |
| **Theme Context** | `frontend/src/theme/index.tsx` | Provedor de tema, hook `useColorMode` e fontes `@fontsource` |
| **Estilos Globais** | `frontend/src/index.css` | Reset CSS, variáveis de fonte e estilização de código |
| **Componentes Comuns** | `frontend/src/components/common/` | `GenericDataGrid`, `StandardModal`, `MetricCard`, `TableFilters` |
| **Colunas DataGrid** | `frontend/src/components/common/dataGridColumns.tsx` | Fábrica de colunas padronizadas para MUI DataGrid |
| **Status Acadêmicos** | `frontend/src/constants/status.ts` | Constantes de status (`PRStatus`, `NITStatus`, etc.) |
| **Avatares & Membros** | `frontend/src/utils/memberUtils.ts` | Algoritmo DJB2 de cores determinísticas e formatação |

---

*Documento de especificação viva mantido pelo time de Engenharia e Design do SCIA / SCI-LaTeX.*  
*Última revisão formal: Outubro de 2026.*