# Especificação Técnica: Governança de Templates LaTeX e Catálogo Institucional

- **Documento:** `latex-templates-governance-spec.md`
- **Referência:** ADR 017
- **Status:** APROVADO
- **Alvo:** Backend Fastify (`src/modules/templates/`), Frontend Admin Center (`src/features/admin/tabs/TemplatesTab.tsx`), Frontend Autor (`src/features/author/modals/CreateProjectModal.tsx`), Storage MinIO (`collab-assets`)

---

## 1. Visão Geral e Princípios Arquiteturais

Esta especificação detalha o ciclo de vida, persistência, contratos de API e interfaces de usuário para a **gestão de templates LaTeX de conferências e periódicos científicos** no SCIA:

1. **Governança Exclusiva de Administrador (RBAC):** Apenas usuários com `role === 'ADMIN'` podem cadastrar, sobrescrever ou excluir templates LaTeX. Pesquisadores e autores perdem a prerrogativa de upload arbitrário, escolhendo exclusivamente templates homologados via dropdown `<Select>` ao criar artigos.
2. **Templates Sempre Ativos:** Todos os templates registrados no catálogo global estão permanentemente ativos e elegíveis para criação de novos projetos. Não existe desativação lógica (`isActive`) ou estados inativos.
3. **Padrão Semântico de Slug Canônico:** Identificador determinístico no formato `[editora]-[tipo]` (ex.: `ieee-artigo`, `sbc-artigo`, `sbc-resumo`, `acm-artigo`, `springer-periodico`), sem inclusão de anos ou versões no slug.
4. **Política de Sobrescrita Mandatória:** Conferências e periódicos raramente alteram seus padrões estruturais. Qualquer novo upload para um slug existente sobrescreve o binário no MinIO e atualiza os metadados no PostgreSQL.
5. **Armazenamento Dinâmico no MinIO (Zero `bundle.zip` Chumbado):** O arquivo `.zip` enviado pelo administrador pode possuir qualquer nome de arquivo original. O sistema preserva o nome sanitizado e armazena sob `templates/{slug}/{sanitizedFileName}`, gravando o caminho dinamicamente no campo `storageKey`.
6. **Extração Autônoma e Direta:** Ao criar um novo artigo, o backend lê o pacote `.zip` do MinIO em memória, extraindo arquivos de texto diretamente para a tabela `ProjectFile` e arquivos binários (imagens/figuras) para o MinIO do projeto. O `.zip` nunca é copiado para o projeto.

---

## 2. Modelo de Dados PostgreSQL (`schema.prisma`)

```prisma
model Project {
  id               String          @id @default(uuid())
  name             String
  description      String?
  academicPeriodId String?
  coordinatorId    String?
  managerId        String?
  mainEntryPath    String          @default("main.tex") // Caminho TeX raiz autônomo (ex: "bare_conf.tex", "main.tex")

  templateId       String?
  template         LatexTemplate?  @relation(fields: [templateId], references: [id], onDelete: SetNull)
  files            ProjectFile[]
  // ... demais relações operacionais
}

model LatexTemplate {
  id               String    @id // Slug canônico único: ex. "ieee-artigo", "sbc-artigo"
  name             String    // Nome legível: "IEEE Conference Template"
  description      String?   // Instruções ou observações editoriais
  publisher        String    // Entidade: "IEEE", "SBC", "ACM", "Springer", "Elsevier"
  templateType     String    // Tipo documental: "artigo", "resumo", "periodico", "poster"
  storageKey       String    // Chave no MinIO: ex. "templates/ieee-artigo/ieee_conf_template.zip"
  originalFileName String    // Nome original do arquivo zip enviado pelo admin
  mainEntryPath    String    @default("main.tex") // Arquivo TeX raiz detectado na descompactação
  isSystem         Boolean   @default(true)
  uploadedById     String?
  uploadedBy       User?     @relation("UserUploadedTemplates", fields: [uploadedById], references: [id], onDelete: SetNull)
  createdAt        DateTime  @default(now())
  updatedAt        DateTime  @updatedAt

  projects         Project[]

  @@index([publisher])
  @@index([templateType])
}
```

---

## 3. Contratos de API (Backend Fastify)

Todas as rotas pertencem ao prefixo `/api/v1/templates` e exigem autenticação JWT com validação de role quando apropriado.

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                              ROTAS DE TEMPLATES LATEX                                  │
├──────────────────────────────┬───────────┬──────────────┬──────────────────────────────┤
│ Rota                         │ Método    │ Permissão    │ Finalidade                   │
├──────────────────────────────┼───────────┼──────────────┼──────────────────────────────┤
│ /api/v1/templates            │ GET       │ Autenticado  │ Listar todos os templates    │
│ /api/v1/templates/:id        │ GET       │ Autenticado  │ Obter detalhes do template   │
│ /api/v1/templates/:id/download│ GET      │ ADMIN        │ Download do arquivo .zip     │
│ /api/v1/templates/upload     │ POST      │ ADMIN        │ Upload / Sobrescrita de .zip │
│ /api/v1/templates/:id        │ DELETE    │ ADMIN        │ Excluir template             │
└──────────────────────────────┴───────────┴──────────────┴──────────────────────────────┘
```

### 3.1 `GET /api/v1/templates`
Retorna todos os templates cadastrados no catálogo para preenchimento de dropdowns na aplicação.

**Resposta (200 OK):**
```typescript
export interface ListTemplatesResponse {
  templates: Array<{
    id: string;               // "ieee-artigo"
    name: string;             // "IEEE Conference Template"
    description: string | null;
    publisher: string;        // "IEEE"
    templateType: string;     // "artigo"
    storageKey: string;
    originalFileName: string;
    mainEntryPath: string;    // "bare_conf.tex"
    isSystem: boolean;
    createdAt: string;
    updatedAt: string;
  }>;
}
```

### 3.2 `POST /api/v1/templates/upload` (Exclusivo ADMIN)
Recebe requisição `multipart/form-data` contendo o arquivo `.zip` e os metadados de classificação editorial.

**Form Data:**
- `file`: Arquivo binário `.zip` (obrigatório).
- `publisher`: Sigla da editora, sociedade ou evento (campo aberto de texto, obrigatório; ex: `IEEE`, `SBC`, `ACM`, `Elsevier`, `Springer`, `MDPI`, `SBPC`).
- `templateType`: Tipo do documento (ex: `artigo`, `resumo`, `periodico`) (obrigatório).
- `name`: Nome de exibição amigável (obrigatório). O nome é fornecido explicitamente pelo administrador (ex: "IEEE Conference Paper"). Fica expressamente vedado qualquer fallback de extração automática de `\title{...}` do código TeX para evitar títulos de artigos de exemplo como nome de template.
- `description`: Observações adicionais (opcional).

**Comportamento do Serviço:**
1. Valida se o usuário autenticado possui `role === 'ADMIN'`.
2. Valida se os campos obrigatórios foram fornecidos (`file`, `publisher`, `templateType`, `name`).
3. Normaliza o slug canônico: `slug = `${sanitize(publisher)}-${sanitize(templateType)}``.
4. Inspeciona o arquivo em memória via `parseLatexZip`:
   - Rejeita caso não encontre nenhum arquivo TeX com `\documentclass`.
   - Identifica o `mainEntryPath` original (preserva nome original sem forçar `main.tex`).
5. Higieniza o nome original do arquivo (ex.: `conference-template-letter.zip`).
6. Persiste o arquivo no MinIO em: `templates/${slug}/${sanitizedFileName}` (sobrescreve se já existir).
7. Executa `upsert` no PostgreSQL na tabela `LatexTemplate`.

### 3.3 `DELETE /api/v1/templates/:id` (Exclusivo ADMIN)
Permite a exclusão de um template pelo administrador:
- Remove o arquivo compactado do MinIO e o registro correspondente no PostgreSQL.
- **Autonomia Preservada e Desacoplamento:** Graças à persistência do `mainEntryPath` diretamente na tabela `Project` e à cláusula `onDelete: SetNull` configurada na relação entre `Project` e `LatexTemplate`, qualquer artigo existente que tenha sido criado a partir desse template tem seu atributo `templateId` automaticamente desvinculado (definido como `null`). Todos os arquivos `.tex` e binários já extraídos em `ProjectFile`, bem como as rotas de carregamento (`findById`, `findAll`), colaboração em tempo real (WebSocket) e compilação TeX Live continuam 100% funcionais e autônomos sem qualquer dependência em runtime com o template excluído.

---

## 4. Frontend: Especificação de Componentes

### 4.1 Painel Administrativo — `TemplatesTab.tsx`
Localizado em `frontend/src/features/admin/tabs/TemplatesTab.tsx`, registrado como a 7ª aba no menu vertical de `AdminCenterPage.tsx`:
- **Barra de Ações:**
  - Título e contador total de templates.
  - Botão principal: **"Novo Template LaTeX"** (abre a modal de upload).
- **Tabela de Dados (MUI DataGrid / GenericDataGrid):**
  - **Slug:** Badge em negrito (`ieee-artigo`).
  - **Nome:** Nome descritivo do template.
  - **Editora:** Chip temático (`IEEE`, `SBC`, `ACM`, etc.).
  - **Tipo:** Chip (`Artigo`, `Resumo`, `Periódico`).
  - **Arquivo Raiz:** Código em destaque (ex.: `bare_conf.tex`).
  - **Nome do Arquivo:** Nome do zip original.
  - **Data de Atualização:** Formatada via `date-fns`.
  - **Ações:**
    - Baixar pacote `.zip` original (`GET /templates/:id/download`).
    - Excluir template com confirmação.
- **Modal de Upload Administrativo:**
  - Dropdown com autocomplete para Editora (`IEEE`, `SBC`, `ACM`, `Springer`, `Elsevier` ou entrada livre).
  - Select para Tipo (`Artigo`, `Resumo Expandido`, `Periódico`, `Pôster`).
  - Input para Nome amigável (opcional).
  - Área de Drag & Drop para arquivo `.zip`.

### 4.2 Modal do Autor — `CreateProjectModal.tsx`
- **Eliminação de Upload Customizado:**
  - Remoção de `showUploadCustom`, inputs de upload e `useUploadTemplateMutation`.
- **Seleção Homologada:**
  - O campo de template passa a ser um `<Select>` alimentado por `useTemplatesQuery()`.
  - Renderização de cada item: `[Editora] Nome do Template (Tipo)`.
  - Pré-visualização com exibição do arquivo TeX de entrada e orientações da conferência.

---

## 5. Provisionamento na Criação do Artigo (`ProjectsService.create`)

1. Ao criar o projeto (`POST /api/v1/projects`), o backend valida se `templateId` foi fornecido.
2. Faz o download do pacote do MinIO a partir da `template.storageKey`.
3. Processa em memória com `parseLatexZip`:
   - Detecta o arquivo raiz do documento (`rootDoc.path`) e salva em `Project.mainEntryPath` no momento da criação.
   - Textos TeX (`.tex`, `.cls`, `.sty`, `.bib`): salvos como `ProjectFile` (tipo `text`).
   - Binários (figuras `.png`, `.jpg`, logos): enviados ao MinIO do projeto (`projects/${projectId}/files/...`) e referenciados como `ProjectFile` (tipo `binary`).
   - Injeta o título do artigo no TeX raiz substituindo `\title{...}` e `\begin{abstract}...`.
4. Nenhum `.zip` é duplicado dentro da pasta do projeto.
5. **Autonomia Permanente:** O template base é usado exclusivamente neste momento inicial como semente (seed). Todas as operações subsequentes de escrita, colaboração OT, salvamento e compilação TeX utilizam exclusivamente os dados próprios do `Project` (`mainEntryPath` e registros em `ProjectFile`), eliminando a necessidade de consulta ao template base em tempo de execução.
