# Technical Requirements Document (TRD)
## Material UI (MUI) Design System & Theming Architecture

- **Documento**: TRD-MUI-THEME-001
- **Status**: Fase 1 Concluída | Fase 2 (Evolução Estética Editorial) em Planejamento
- **Autor**: Antigravity (com aprovação do Líder Técnico)
- **Data**: 20 de Novembro de 2026
- **Alvo**: `frontend/src/theme/` e componentes da aplicação

---

### 1. Contexto e Objetivos

O frontend do **SCI-LaTeX** continha uma arquitetura híbrida com sobreposição de definições:
1. Resíduos de paletas de utilitários do Tailwind CSS (`slate`, `zinc`, `stone`, `tailwindFonts`, `tailwindRadius`, etc.) que não faziam parte do design padrão do Material UI.
2. Definições duplicadas e concorrentes de tokens CSS no arquivo `index.css` (`--primary-50` até `--primary-900`, `--sans`, etc.), competindo com os tokens nativos do MUI.
3. Cores hardcoded no objeto de paleta (`#1976d2`, `#42a5f5`, etc.) e contrastes usando strings estáticas `rgba(...)` em vez da biblioteca matemática de cores do MUI.
4. Repetição desnecessária da propriedade `fontFamily` em cada cabeçalho (`h1` até `h6`) e variante tipográfica.

#### Objetivos deste TRD
- **Single Source of Truth (SSOT)**: Centralizar 100% dos tokens visuais em TypeScript (`src/theme/`), eliminando duplicações manuais em arquivos `.css`.
- **Adoção Canônica da MUI v6/v5 Modern**: Utilizar `createTheme` com suporte oficial a `cssVariables: true` e `colorSchemes: { light, dark }`.
- **Acessibilidade WCAG AAA**: Garantir taxas de contraste rigorosas, especialmente em fundos claros e no modo escuro (Dark Mode).
- **Zero Runtime Re-render Overhead**: A alternância entre temas (Light/Dark) ocorre sem re-renderizar a árvore React, operando via variáveis CSS dinâmicas (`data-mui-color-scheme`).

---

### 2. Princípios de Arquitetura

```
+-------------------------------------------------------------+
|                      @mui/material/colors                   |
|           (blue, grey, amber, green, purple, etc.)          |
+-------------------------------------------------------------+
                               |
                               v
+-------------------------------------------------------------+
|                     src/theme/tokens.ts                     |
|         (Mapeamento canônico puro de cores oficiais)        |
+-------------------------------------------------------------+
                               |
         +---------------------+---------------------+
         |                                           |
         v                                           v
+-----------------------+                 +--------------------+
|  src/theme/palette.ts |                 | src/theme/typo...  |
|  (lightPalette com    |                 | (fontFamily raiz   |
|   alpha() & Dark)     |                 |  + escala oficial) |
+-----------------------+                 +--------------------+
         |                                           |
         +---------------------+---------------------+
                               |
                               v
+-------------------------------------------------------------+
|                     src/theme/index.tsx                     |
|      createTheme({ cssVariables, colorSchemes, ... })       |
+-------------------------------------------------------------+
                               |
                               v
+-------------------------------------------------------------+
|                    Browser DOM (:root)                      |
|         --mui-palette-primary-main, --mui-palette-...       |
+-------------------------------------------------------------+
```

1. **DRY (Don't Repeat Yourself)**:
   - Fontes declaradas uma única vez na raiz do objeto `typography`.
   - Cores importadas de `tokens.ts`.
2. **Cálculo de Opacidade Seguro (`alpha`)**:
   - Nenhuma string arbitrária `rgba(0, 0, 0, 0.87)` estática. Uso exclusivo de `alpha(colors.black, 0.87)` ou `alpha(colors.white, 0.87)`.
3. **CSS Limpo e Desacoplado**:
   - `index.css` restrito apenas a resets de viewport (`html, body, #root`) e estilizações neutras de blocos `<code />`.

---

### 3. Especificação das Cores e Contrastes

#### 3.1. Light Mode (`lightPalette`)
| Propriedade | Token MUI | Valor Hex / Função | Propósito |
| :--- | :--- | :--- | :--- |
| `primary.main` | `colors.blue[700]` | `#1976d2` | Cor principal de botões e destaques |
| `primary.light` | `colors.blue[400]` | `#42a5f5` | Hover/foco de elementos interativos |
| `primary.dark` | `colors.blue[800]` | `#1565c0` | Estado ativo/pressionado |
| `primary.contrastText` | `colors.white` | `#ffffff` | Texto sobre o botão primário |
| `secondary.main` | `colors.purple[500]` | `#9c27b0` | Ações e tags secundárias |
| `background.default` | `colors.background.light`| `#ffffff` | Fundo principal da página |
| `background.paper` | `colors.background.light`| `#ffffff` | Superfície de cartões e modais |
| `text.primary` | `alpha(colors.black, 0.87)` | `rgba(0,0,0,0.87)` | Leitura principal (contraste AAA) |
| `text.secondary` | `alpha(colors.black, 0.60)` | `rgba(0,0,0,0.60)` | Legendas e subtítulos |
| `divider` | `alpha(colors.black, 0.12)` | `rgba(0,0,0,0.12)` | Linhas divisórias e bordas sutis |

#### 3.2. Dark Mode (`darkPalette`)
| Propriedade | Token MUI | Valor Hex / Função | Propósito |
| :--- | :--- | :--- | :--- |
| `primary.main` | `colors.blue[200]` | `#90caf9` | Azul desaturado com luminância adequada |
| `primary.light` | `colors.blue[50]` | `#e3f2fd` | Hover e seleções sutis |
| `primary.dark` | `colors.blue[400]` | `#42a5f5` | Estado ativo |
| `primary.contrastText` | `alpha(colors.black, 0.87)`| `rgba(0,0,0,0.87)` | **WCAG AAA**: Texto legível escuro sobre azul claro |
| `secondary.main` | `colors.purple[200]` | `#ce93d8` | Ações secundárias em dark mode |
| `background.default` | `colors.background.dark` | `#121212` | Fundo oficial Material Design |
| `background.paper` | `colors.background.dark` | `#121212` | Superfície base para elevações |
| `text.primary` | `colors.white` | `#ffffff` | Leitura principal no tema escuro |
| `text.secondary` | `alpha(colors.white, 0.70)`| `rgba(255,255,255,0.70)`| Subtítulos e metadados |
| `divider` | `alpha(colors.white, 0.12)`| `rgba(255,255,255,0.12)`| Divisores no escuro |

---

### 4. Especificação de Tipografia

- **Família de Fontes Principal**: `"Roboto", "Helvetica", "Arial", sans-serif`.
- **Tamanho Base**: 14px (`htmlFontSize: 16px`).
- **Pesos Oficiais**: Light (300), Regular (400), Medium (500), Bold (700).

```typescript
// Herança limpa e declarativa
export const typography: TypographyVariantsOptions = {
  fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
  fontSize: 14,
  htmlFontSize: 16,
  h1: { fontWeight: 300, fontSize: '6rem', lineHeight: 1.167, letterSpacing: '-0.01562em' },
  h2: { fontWeight: 300, fontSize: '3.75rem', lineHeight: 1.2, letterSpacing: '-0.00833em' },
  h3: { fontWeight: 400, fontSize: '3rem', lineHeight: 1.167, letterSpacing: '0em' },
  h4: { fontWeight: 400, fontSize: '2.125rem', lineHeight: 1.235, letterSpacing: '0.00735em' },
  h5: { fontWeight: 400, fontSize: '1.5rem', lineHeight: 1.334, letterSpacing: '0em' },
  h6: { fontWeight: 500, fontSize: '1.25rem', lineHeight: 1.6, letterSpacing: '0.0075em' },
  subtitle1: { fontWeight: 400, fontSize: '1rem', lineHeight: 1.75, letterSpacing: '0.00938em' },
  subtitle2: { fontWeight: 500, fontSize: '0.875rem', lineHeight: 1.57, letterSpacing: '0.00714em' },
  body1: { fontWeight: 400, fontSize: '1rem', lineHeight: 1.5, letterSpacing: '0.00938em' },
  body2: { fontWeight: 400, fontSize: '0.875rem', lineHeight: 1.43, letterSpacing: '0.01071em' },
  button: { fontWeight: 500, fontSize: '0.875rem', lineHeight: 1.75, letterSpacing: '0.02857em', textTransform: 'uppercase' },
  caption: { fontWeight: 400, fontSize: '0.75rem', lineHeight: 1.66, letterSpacing: '0.03333em' },
  overline: { fontWeight: 400, fontSize: '0.75rem', lineHeight: 2.66, letterSpacing: '0.08333em', textTransform: 'uppercase' },
};
```

---

### 5. Guia do Desenvolvedor (Como Usar no Código)

#### 5.1. No JSX com a prop `sx`
```tsx
// ✅ CORRETO: Consome tokens semânticos nativos
<Box sx={{
  bgcolor: 'background.paper',
  color: 'text.primary',
  p: 2, // 16px (fator de 8px)
  border: 1,
  borderColor: 'divider',
  borderRadius: 1, // 4px (shape.borderRadius)
}}>
  <Typography variant="h5">Título do Card</Typography>
</Box>

// ❌ PROIBIDO: Valores arbitrários hardcoded
<Box sx={{ bgcolor: '#ffffff', color: '#000', p: '15px' }} />
```

#### 5.2. Estilos Condicionais para Dark Mode com `applyStyles`
```tsx
<Card
  sx={[
    (theme) => ({
      backgroundColor: theme.vars.palette.background.default,
      border: `1px solid ${theme.vars.palette.divider}`,
    }),
    (theme) =>
      theme.applyStyles('dark', {
        backgroundColor: theme.vars.palette.grey[900],
      }),
  ]}
/>
```

#### 5.3. Integração com Ícones Lucide ou SVG Externos
```tsx
// ✅ CORRETO: Aponta para a variável gerada pelo MUI
<FileCode size={16} style={{ color: 'var(--mui-palette-primary-main)' }} />
<FileText size={16} style={{ color: 'var(--mui-palette-text-secondary)' }} />
```

---

### 6. Resultados e Verificação da Fase 1

- **Eliminação de Bundle Desnecessário**: Removidos mais de 450 linhas de tokens de Tailwind não utilizados e o arquivo órfão `App.css`.
- **Validação TypeScript**: `tsc -b` executado com **0 erros**.
- **Testes Unitários**: 12/12 testes do Vitest aprovados com **100% de sucesso**.
- **Build de Produção**: `vite build` gerando os artefatos com sucesso em tempo recorde.

---

### 7. Fase 2: Evolução Estética Editorial & Workstation Científica (Frontend-Design)

Seguindo as diretrizes de design distintivo da skill `frontend-design`, o design system do SCIA evolui para superar a estética de "dashboard corporativo genérico" (AI Slop) e se consolidar como uma **Workstation Científica de Alta Precisão (Editorial & Academic Workstation)**.

#### 7.1. Vetores de Evolução Estética

| Dimensão | Estado Atual (Fase 1) | Estado Alvo (Fase 2) | Benefício de Experiência |
| :--- | :--- | :--- | :--- |
| **Tipografia Principal** | Roboto / Helvetica genérico | **Plus Jakarta Sans** (já presente nas dependências) | Tipografia limpa, geométrica, com alta legibilidade em densidade |
| **Tipografia Técnica / LaTeX** | Monospace de sistema | **JetBrains Mono** (já instalado via `@fontsource`) | Precisão visual em blocos de código LaTeX, equações e métricas |
| **Paleta de Identidade** | Azul Material UI padrão (`#1976d2`) | **Scholarly Slate & Deep Emerald** / Indigo de Alta Precisão | Identidade proprietária inconfundível para plataforma de pesquisa |
| **Dark Mode Depth** | `#121212` neutro e plano | **Obsidian & Deep Slate** (`#0B0F17` / `#0E131F`) com bordas luminescentes sutis | Atmosfera imersiva de bancada de trabalho de pesquisa noturna |
| **Composição de Espaço** | Cards retangulares uniformes | **Bento Grid Científico** (Artigo em destaque + KPIs assimétricos) | Hierarquia focada: o pesquisador vê imediatamente o que importa |
| **Movimento e Micro-interações** | Quase estático (`translateY` pontual) | **Staggered reveal** e indicadores de sincronização vivos (`framer-motion`) | Sensação de software vivo, rápido e de alta qualidade |

#### 7.2. Arquitetura de Tipografia Fase 2
```typescript
// frontend/src/theme/typography.ts
export const typography: TypographyVariantsOptions = {
  fontFamily: '"Plus Jakarta Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  // Tokens de código e LaTeX
  // JetBrains Mono aplicado via classe ou componente especializado
};
```

#### 7.3. Superfícies e Profundidade (Layering)
- Cartões com bordas sutis translúcidas em Dark Mode: `border: '1px solid rgba(255, 255, 255, 0.08)'`.
- Suave gradiente de luz ambiente nas páginas principais para criar profundidade em vez de fundo chapado.
- Feedback tátil em elementos clicáveis com `framer-motion` e transições padrão de 150-200ms.
