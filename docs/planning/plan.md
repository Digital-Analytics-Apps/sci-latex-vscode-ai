### Planejamento de Arquitetura: Plataforma de Escrita Científica Self-Hosted

Este documento estabelece as diretrizes técnicas, arquitetura de infraestrutura e a lógica de fluxo de trabalho (workflow) para o desenvolvimento da plataforma web de escrita de artigos científicos baseada em um ambiente VS Code embutido e seguro.

Para especificações detalhadas do esquema de banco de dados, provisionamento Git por Token de Serviço, fluxo do NIT, auditoria (`AuditLog`), decisões pós-submissão e permissões, consulte o arquivo de especificações oficiais: [`specs.md`](file:///home/gilson-russo/development/professional/sci-latex-vscode/specs.md).

---

### 1. Visão Geral do Sistema

O objetivo do sistema é fornecer um ambiente web controlado, **100% self-hosted**, focado para pesquisadores escreverem artigos científicos utilizando **LaTeX**. A plataforma gerencia o ciclo de vida dos arquivos integrando um frontend dinâmico ao controle de versão robusto baseado em **Git**, com provisionamento automático de repositórios através de uma **Conta de Serviço do Sistema (Token de Serviço)** e autenticação por **JWT**.

---

### 2. Provisionamento Git Remoto no GitHub & Controle de Acesso

O usuário **não precisa criar chaves SSH ou gerenciar credenciais de Git manualmente**.

* **Autenticação Segura (OWASP):** O usuário autentica no sistema web via e-mail/senha e recebe um **Cookie HTTP-Only (`accessToken`)** e **JWT**, sem exposição de tokens sensíveis na URL (`?token=...`).
* **Provisionamento de Repositório no GitHub:** Ao criar um artigo científico, o backend Fastify utiliza a REST API do GitHub com o **Token de Serviço (`GITHUB_TOKEN`)** para criar obrigatoriamente um repositório remoto privado na conta/organização do GitHub.
* **Padrão de Nomeação Amigável:** O repositório no GitHub recebe um nome amigável composto pelo **slug do título** e um sufixo hash de 8 caracteres do UUID (ex: `sci-paper-otimizacao-de-compiladores-tex-isolados-5550a24e`).
* **Autorização de Acesso:** O backend autoriza o acesso ao editor `code-server` e aos arquivos consultando o modelo `ProjectMember` no PostgreSQL com base na sessão autenticada.
* **Assinatura de Commits e Progresso:** Commits silenciosos (disparados via `POST /api/v1/projects/:id/sections/:sectionId/commit`) gravam a identidade real do autor (`--author="Nome <email>"`), garantindo auditabilidade no `AuditLog` sem expor credenciais Git ao navegador.

---

### 3. As 7 Fases do Ciclo de Vida do Artigo

```
[Fase 1: Cadastro & Prazos] ──> [Fase 2: Escrita & Commits] ──> [Fase 3: Revisão Acadêmica]
                                                                        │
                                                               [Fase 4: Validação NIT]
                                                                        │
[Fase 7: Pós-Submissão & Decisão dos Autores] <── [Fase 6: Submissão] <── [Fase 5: Merge pelo Autor]
    │
    ├── [Cenário A: ACEITO] ───────────> Metadados Finais (DOI, Links, Camera-Ready) ──> [CONCLUÍDO]
    │
    ├── [Cenário B: REVISÃO SOLICITADA] ──> Correções no Mesmo Congresso ─────────────> [Reenvio Mesma Conferência]
    │
    └── [Cenário C: REJEITADO] ─────────> Autores Decidem: Congresso Backup ou Novo ──> [Ajustes v2]
```

---

### 4. Personas do Sistema e Atribuições

#### 4.1 Autor
* **Ações:** Cria o paper, define congressos e prazos iniciais, escreve no editor, **executa o Merge**, toma a decisão pós-submissão (mesmo congresso, backup ou novo congresso se rejeitado) e atua nas correções v2.

#### 4.2 Revisor
* **Ações:** Avalia o diff/PDF do paper e **gerencia manualmente o registro do NIT** (`AGUARDANDO_NIT`, `APROVADO_NIT`, `REJEITADO_NIT`).

#### 4.3 Coordenador
* **Ações:** Visão macro da equipe, prazos e congressos. É a autoridade que pode **alterar prazos de etapas** pós-cadastro do autor.

#### 4.4 Gerente
* **Ações:** Visão executiva por **Período Acadêmico** (ex: *Ciclo 2026/2027*), relatórios de aprovação nos congressos alvos e backups, papers finalizados com DOI e taxa de sucesso das equipes.

---

### 5. Decisões de Arquitetura e Justificativas

| Componente Escolhido | Função Principal | Justificativa Técnica |
| :--- | :--- | :--- |
| **VS Code (`code-server`) em `<iframe>`** | Ambiente de Edição | Segurança e Sigilo Absoluto. Nenhum dado sai do servidor self-hosted. |
| **Fastify + Node.js** | Backend API & Proxy | Gerencia a **Conta de Serviço Git**, autoriza acessos por JWT e expõe rotas REST. |
| **Prisma + PostgreSQL** | Persistência & Auditoria | Armazena a associação `ProjectMember`, `AcademicPeriod`, `PullRequest` e `AuditLog`. |
| **RabbitMQ** | Filas Assíncronas | Filas para `git.operations` (assinadas pela conta de serviço em nome do autor), `latex.compilation` e `deadlines.checker`. |
| **Containers Docker + TeX Live** | Compilação Isolada | Compilações isoladas sem acesso a rede (`--network none`). |

---

### 6. Configuração da Interface Limpa (`settings.json`)

Injetado automaticamente pelo container de cada usuário:

```json
{
  "workbench.activityBar.location": "hidden",
  "workbench.statusBar.visible": false,
  "editor.minimap.enabled": false,
  "workbench.tips.enabled": false,
  "editor.lightbulb.enabled": "onCodeAction",
  "latex-workshop.view.pdf.viewer": "tab",
  "editor.wordWrap": "on"
}
```