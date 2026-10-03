# 🎨 SCI-LaTeX Design System

> **Versão:** 1.0.0  
> **Filosofia:** Ergonomia Visual, Alta Produtividade & Zero Fadiga (Soft UI + Modern SaaS Clean)  
> **Aplicações:** Frontend SCI-LaTeX Web & VSCode Suite

---

## 📋 1. Visão Geral & Filosofia de Design

O **SCI-LaTeX Design System** foi projetado para ambientes de trabalho prolongado (editores de documentos, compiladores, dashboards analíticos e ferramentas científicas). Sua diretriz principal é garantir **máximo conforto visual e clareza de dados** para usuários que passam horas ininterruptas utilizando a plataforma.

### 🌟 Princípios Norteadores

1. **Zero Fadiga Visual (Ergonomia):** Substituição de pretos/brancos absolutos por tintas neutras balanceadas (Slate/Off-White) e uso de badges em tons pastel.
2. **Superfícies Flutuantes (Soft Elevation):** Eliminação de bordas secas de 1px em favor de tridimensionalidade suave via sombras difusas de baixa opacidade.
3. **Respiro & Espaçamento (Whitespace):** Hierarquia e agrupamento visual promovidos pelo espaço em branco, e não por divisórias pretas rígidas.
4. **Foco Direcionado (Regra 85/15):** 85% da interface permanece neutra e descansada, enquanto 15% (botões principais, ícones ativos e badges) recebem toques de cor vibrante (Azul Cobalto / Gradiente Soft).

---

## 🎨 2. Design Tokens

### 2.1. Paleta de Cores (Color Palette)

#### 🔹 Cores Primárias e Neutras (Light & Dark)

| Token | Light Mode | Dark Mode | Aplicação |
| :--- | :--- | :--- | :--- |
| `background.default` | `#F8FAFC` (Slate 50) | `#0F172A` (Slate 900) | Fundo geral da aplicação |
| `background.paper` | `#FFFFFF` (Puro Branco) | `#1E293B` (Slate 800) | Cartões, Modais, Painéis |
| `primary.main` | `#2563EB` (Blue 600) | `#3B82F6` (Blue 500) | Ações primárias, links, destaques |
| `primary.gradient` | `linear-gradient(310deg, #2563EB, #4F46E5)` | `linear-gradient(310deg, #3B82F6, #6366F1)` | Botões de destaque e badges ativos |
| `text.primary` | `#1E293B` (Slate 800) | `#F8FAFC` (Slate 50) | Títulos e textos principais |
| `text.secondary` | `#64748B` (Slate 500) | `#94A3B8` (Slate 400) | Subtítulos, metadados e descrições |
| `border.default` | `rgba(226, 232, 240, 0.8)` | `rgba(51, 65, 85, 0.6)` | Linhas de suporte sutis |

#### 🏷️ Sistema de Status Pastel (Zero Cansaço Visual)

| Categoria | Background | Texto / Ícone | Utilização |
| :--- | :--- | :--- | :--- |
| **Sucesso / Concluído** | `#ECFDF5` (Emerald 50) | `#047857` (Emerald 700) | Compilação com sucesso, salvo |
| **Em Progresso / Info** | `#EFF6FF` (Blue 50) | `#1D4ED8` (Blue 700) | Processando, sincronizando |
| **Atenção / Warning** | `#FFFBEB` (Amber 50) | `#B45309` (Amber 700) | Alertas, avisos de sintaxe |
| **Erro / Erro LaTeX** | `#FEF2F2` (Red 50) | `#B91C1C` (Red 700) | Falha de compilação, erro grave |
| **Planejamento / Draft** | `#F3E8FF` (Purple 50) | `#7E22CE` (Purple 700) | Rascunhos, revisões |

---

### 2.2. Tipografia (Typography)

* **UI Sans-Serif:** `Inter`, `Plus Jakarta Sans`, system-ui
* **Code / LaTeX Mono:** `JetBrains Mono`, `ui-monospace`, monospace

| Nível | Tamanho | Peso | Line Height | Aplicação |
| :--- | :--- | :--- | :--- | :--- |
| **H1** | `1.75rem` (28px) | Bold (700) | 1.2 | Títulos principais de páginas |
| **H2** | `1.375rem` (22px) | SemiBold (600) | 1.3 | Títulos de seções / Modais |
| **H3** | `1.125rem` (18px) | SemiBold (600) | 1.4 | Títulos de cards / Painéis |
| **Body1** | `0.9375rem` (15px) | Regular (400) | 1.5 | Texto principal |
| **Body2** | `0.8438rem` (13.5px)| Regular (400) | 1.5 | Rótulos de formulário, tabelas |
| **Caption** | `0.75rem` (12px) | Medium (500) | 1.4 | Timestamps, metadados |
| **Code** | `0.8438rem` (13.5px)| Regular (400) | 1.6 | Código LaTeX, logs, terminal |

---

### 2.3. Tridimensionalidade & Sombras (Elevation System)

Em vez de sombras pesadas ou bordas secas, utilizamos **Soft Elevation**:

```css
/* Sombras dos Tokens */
--shadow-soft-sm: 0px 2px 4px rgba(0, 0, 0, 0.03);
--shadow-soft-md: 0px 10px 20px -3px rgba(0, 0, 0, 0.04), 0px 4px 6px -2px rgba(0, 0, 0, 0.02);
--shadow-soft-lg: 0px 20px 27px 0px rgba(0, 0, 0, 0.05); /* Padrão dos Cards */
--shadow-soft-hover: 0px 24px 32px 0px rgba(0, 0, 0, 0.08); /* Hover de Cards */
```

---

### 2.4. Cantos Arredondados (Border Radius)

```css
--radius-sm: 6px;    /* Chips pequeninos, tooltips */
--radius-md: 10px;   /* Botões, Inputs, Selects */
--radius-lg: 16px;   /* Cartões principais, Modais, Papeis */
--radius-pill: 9999px; /* Badges de status, Avatares */
```

---

## 🧩 3. Guia de Componentes (UI Guidelines)

### 📦 3.1. Cards (`MuiCard` / `MuiPaper`)
- **Aparência:** Fundo `#FFFFFF` (Light) ou `#1E293B` (Dark), sem bordas visíveis pesadas, canto de `16px`.
- **Efeito Hover:** Elevação sutil com `transform: translateY(-2px)` e transição suave de `0.2s ease`.

### 🔘 3.2. Botões (`MuiButton`)
- **Contained (Primário):** Fundo em gradiente suave ou Azul Cobalto sólido, cantos de `10px`, sombra suave.
- **Outlined (Secundário):** Borda suave `rgba(226,232,240,0.8)`, sem fundo, texto `text.primary`.
- **Text (Ghost):** Sem borda ou fundo, apenas hover em cinza muito claro (`rgba(0,0,0,0.04)`).

### 🏷️ 3.3. Badges e Chips (`MuiChip`)
- **Estilo:** Cantos pílula (`9999px`), altura reduzida (`24px`), fonte em peso `600` (SemiBold).
- **Cores:** Utilizar sempre a escala Pastel de Status.

### 📝 3.4. Formulários & Inputs (`MuiOutlinedInput`)
- **Altura:** Compacto e elegante (`size="small"` como padrão).
- **Borda Normal:** Cinza neutro sutil (`#E2E8F0`).
- **Borda no Foco:** Azul Cobalto (`#2563EB`) com anel de brilho suave de `3px` (`rgba(37, 99, 235, 0.15)`).

---

## 💻 4. Mapeamento no Código do Projeto

Os valores deste Design System devem estar espelhados nos seguintes arquivos no código do frontend:

* 📄 [`frontend/src/theme/tokens.ts`](file:///home/gilson-russo/development/professional/sci-latex-vscode/frontend/src/theme/tokens.ts) – Definição das tabelas de cores, raios e sombras.
* 📄 [`frontend/src/theme/palette.ts`](file:///home/gilson-russo/development/professional/sci-latex-vscode/frontend/src/theme/palette.ts) – Mapeamento do tema Light/Dark no MUI.
* 📄 [`frontend/src/theme/components.ts`](file:///home/gilson-russo/development/professional/sci-latex-vscode/frontend/src/theme/components.ts) – Overrides dos componentes Material-UI (`MuiCard`, `MuiButton`, etc.).

---

*Documentação mantida pela equipe SCI-LaTeX. Atualizado em Outubro de 2026.*
