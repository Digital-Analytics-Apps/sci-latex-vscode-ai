# Plano de Implementação: Evolução Visual e Design Editorial do SCIA
## De Dashboard Genérico a Workstation Acadêmica de Alta Precisão

- **Data**: 20 de Novembro de 2026
- **Status**: Proposto / Pronto para Execução
- **Diretriz**: Baseado na skill `frontend-design` e alinhado ao TRD [TRD_MATERIAL_UI_DESIGN_SYSTEM.md](file:///mnt/c0b6217c-c2f3-4c1f-8ba2-c8d177f718a9/development/professional/sci-latex-vscode/docs/TRD_MATERIAL_UI_DESIGN_SYSTEM.md)
- **Branch de Trabalho**: `dev`

---

## 1. Visão e Direção Conceitual

Transformar o **SCIA** de um dashboard CRUD administrativo genérico (MUI azul padrão, fonte Roboto, layouts simétricos repetitivos) para uma **Workstation Científica e Editorial de Alta Precisão**:
- Estética inspirada em ferramentas como **Linear**, **Raycast** e revistas científicas de ponta (**Nature / IEEE**).
- Aproveitamento das dependências já instaladas no projeto: `@fontsource/plus-jakarta-sans`, `@fontsource/jetbrains-mono`, `framer-motion` e `lucide-react`.

---

## 2. Fases de Execução

```
+-----------------------------------------------------------------------------------+
| FASE 1: Tipografia & Paleta Proprietária                                          |
| -> Importar Plus Jakarta Sans & JetBrains Mono                                    |
| -> Atualizar theme/typography.ts e tokens de cores com personalidade científica    |
+-----------------------------------------------------------------------------------+
                                         |
                                         v
+-----------------------------------------------------------------------------------+
| FASE 2: Superfícies, Profundidade & Atmosfera                                    |
| -> Dark mode em Deep Obsidian (#0B0F17) com bordas luminescentes sutis            |
| -> Gradiente radial de luz ambiente sutil em PageContainer e Login                |
+-----------------------------------------------------------------------------------+
                                         |
                                         v
+-----------------------------------------------------------------------------------+
| FASE 3: Composição Espacial & Bento Grid dos Dashboards                          |
| -> Evoluir AuthorArticlesPage & ManagerDashboard com Bento Grid Assimétrico       |
| -> Card Hero de "Artigo em Destaque / Próximo Deadline"                           |
+-----------------------------------------------------------------------------------+
                                         |
                                         v
+-----------------------------------------------------------------------------------+
| FASE 4: Micro-interações & Sensação de Sistema Vivo                              |
| -> Staggered animations com framer-motion no carregamento                        |
| -> Efeito vivo de pulso na sincronização SSE e status de compilação               |
+-----------------------------------------------------------------------------------+
                                         |
                                         v
+-----------------------------------------------------------------------------------+
| FASE 5: Validação Rigorosa & Testes                                              |
| -> tsc -b, vitest run, npm run build (zero erros)                                 |
+-----------------------------------------------------------------------------------+
```

---

## 3. Detalhamento das Tarefas

### Fase 1: Tipografia & Paleta Proprietária
- [ ] Importar `@fontsource/plus-jakarta-sans` e `@fontsource/jetbrains-mono` no `frontend/src/main.tsx`.
- [ ] Atualizar `frontend/src/theme/typography.ts` para adotar `Plus Jakarta Sans` como fonte principal e definir a variante monospace com `JetBrains Mono`.
- [ ] Refinar a paleta em `tokens.ts` e `palette.ts`:
  - **Light**: Base em ardósia refinada com acento de precisão (Azul Cobalto Profundo ou Verde Esmeralda Acadêmico).
  - **Dark**: Fundo `#0B0F17` (Deep Obsidian) com cartões em `#111622` para eliminar o visual cinza chapado do padrão `#121212`.
  - Contrastes calculados dinamicamente via `alpha()`.

### Fase 2: Superfícies, Profundidade & Atmosfera
- [ ] Atualizar `frontend/src/theme/components.ts` para elevar a qualidade visual dos componentes `MuiCard`, `MuiPaper`, `MuiButton` e `MuiChip`:
  - Bordas de 1px com sutil contraste (`rgba(255, 255, 255, 0.08)` no escuro).
  - Sombras suaves personalizadas em vez de sombras pesadas e turvas.
- [ ] Introduzir iluminação ambiente sutil no `PageContainer` e refinamento na tela de login.

### Fase 3: Composição Espacial & Bento Grid
- [ ] Refatorar a área de métricas da visão do Autor (`AuthorArticlesPage.tsx`) e Gestor para uma composição no formato **Bento Grid**:
  - Destaque para o artigo ativo / prazo crítico com progresso e ações imediatas.
  - Cartões de status e volume de submissões dispostos assimetricamente com mini indicadores visuais.
- [ ] Aperfeiçoar o `WelcomeHeader` com tags de ciclo acadêmico integradas e ações diretas.

### Fase 4: Micro-interações & Movimento
- [ ] Adicionar transições de entrada orquestradas (*staggered reveal*) nas telas principais utilizando `framer-motion`.
- [ ] Implementar indicador de atividade pulsante sutil no `AppHeaderBar` (SSE status) e na barra de status do editor LaTeX.
- [ ] Micro-interações táteis nos botões principais (hover sutil e feedback ao pressionar).

### Fase 5: Validação e Testes
- [ ] Executar checagem estrita de tipos com `npx tsc -b`.
- [ ] Executar suite de testes unitários com `npm run test` (Vitest).
- [ ] Realizar build de produção com `npm run build`.
- [ ] Validar acessibilidade e contraste das novas paletas (WCAG AAA).
