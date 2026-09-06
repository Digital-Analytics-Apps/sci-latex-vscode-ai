# ADR 001: Modelo de Controle de Acesso de Usuários aos Repositórios do GitHub

**Data:** 2026-09-06  
**Status:** APROVADO (Opção A - Abstração por Conta de Serviço)  
**Domínio:** Autenticação, Permissões e Integração Git/GitHub  

---

## 1. Contexto & Questionamento

Ao migrar a gestão de repositórios para o GitHub (repositórios remotos na conta/organização da plataforma), surgiu a necessidade de definir como os usuários da plataforma (Autores, Revisores, Coordenadores) têm seu acesso controlado em relação ao repositório no GitHub:

* **Os usuários devem ser adicionados individualmente como colaboradores na aba *Settings -> Collaborators* do repositório no GitHub?**
* **Ou a plataforma deve abstrair esse acesso e gerenciar as permissões 100% internamente via JWT + banco de dados?**

---

## 2. Decisão Arquitetural Adotada: **Opção A (Abstração por Conta de Serviço)**

Ficou decidido utilizar a **Opção A (Abstração por Conta de Serviço)**:

1. **Gestão Interna de Permissões:**
   - O controle de quem pode visualizar, editar, revisar ou aprovar merges de cada artigo é feito **exclusivamente pela plataforma SCI-LaTeX** (via JWT + tabela `ProjectMember` no PostgreSQL).

2. **Uso de Token de Serviço do Sistema:**
   - As chamadas à API do GitHub (criação de repositório, clone, push) utilizam o `GITHUB_TOKEN` central da plataforma.
   - Os commits são efetuados pelo backend assinando os metadados do autor real (`git config user.name` e `git config user.email`), mantendo o histórico legível no GitHub.

3. **Independência de Contas no GitHub:**
   - Os usuários da plataforma (alunos, pesquisadores) **não precisam ter uma conta cadastrada no GitHub** e **não são adicionados individualmente à lista de membros/colaboradores do repositório no GitHub**.

---

## 3. Alternativas Futuras Registradas (Evolução em Sprints Futuras)

Caso futuramente haja a necessidade de permitir que o usuário acesse o repositório diretamente pela interface web do GitHub (`github.com/org/repo`) ou clone via terminal na sua máquina pessoal, a arquitetura poderá evoluir para:

* **Opção B (Convite Automático de Colaborador via API):**
  - Adicionar o campo `githubUsername` ao modelo `User` do Prisma.
  - Ao adicionar um membro ao projeto (`POST /api/v1/projects/:id/members`), fazer um `PUT https://api.github.com/repos/{owner}/{repo}/collaborators/{github_username}`.

* **Opção C (Modelo Híbrido sob Demanda):**
  - O projeto utiliza a Opção A por padrão.
  - Disponibilizar um botão no painel de configurações do artigo: *"Convidar meu usuário do GitHub para este repositório"*.

---

## 4. Consequências e Impacto

- **Positivo:** Não consome limites/licenças de colaboradores na conta do GitHub; experiência de uso simplificada para usuários sem conhecimento em Git/GitHub; controle fino de permissões RBAC centralizado no backend Fastify.
- **Neutro:** Histórico de commits no GitHub permanece 100% atribuído ao e-mail do autor real do artigo.
