# ADR 002: Orquestração de Workspaces Efêmeros via Kubernetes Pods sob Demanda em Produção

- **Status:** Aceito (Planejamento de Produção)
- **Data:** 2026-09-07
- **Autores:** Equipe de Arquitetura sci-latex-vscode

---

## 1. Contexto & Problema

Em ambiente de produção, manter uma instância fixa do `code-server` rodando para todos os usuários ou criar volumes locais estáticos no servidor gera os seguintes gargalos:
1. **Consumo de Recursos (CPU / RAM):** Centenas de instâncias ativas consumindo recursos sem uso real.
2. **Falta de Isolamento Multi-Tenant:** Múltiplos usuários compartilhando a mesma instância ou sistema de arquivos aumenta o risco de vazamento de segurança e colisões.
3. **Escalabilidade Limitada:** Ambientes baseados apenas em Docker Compose em servidor único não escalam horizontalmente.

---

## 2. Decisão de Arquitetura (Kubernetes Pods sob Demanda)

Para o ambiente de produção, a infraestrutura será orquestrada via **Kubernetes (K8s)** (EKS, GKE, AKS ou Kubernetes Self-Hosted):

### 🔄 Ciclo de Vida do Workspace Efêmero

1. **Abertura do Editor (`GET /api/v1/projects/:id/editor`):**
   - O Backend Fastify consome a API do Kubernetes (`@kubernetes/client-node`) para provisionar um **Pod Efêmero** com o nome `workspace-<projectId>-<userId>`.
   - O Pod contém o contêiner `code-server` pré-configurado com a extensão `LaTeX Workshop` e compilação TeX Live.

2. **Inicialização do Projeto (Init Container):**
   - Um `initContainer` de alta velocidade executa o `git clone` do repositório privado do artigo diretamente do GitHub (usando as credenciais seguras de sessão do usuário).

3. **Inspecção & Roteamento (K8s Ingress / Traefik):**
   - O Ingress/Reverse Proxy conecta a sessão do navegador do usuário diretamente à porta `8080` do Pod dedicado daquele artigo.

4. **Desconexão & Coleta de Lixo (TTL / Inactivity Terminator):**
   - Todas as alterações salvas são commitadas e enviadas para o repositório remoto no GitHub (**Single Source of Truth**).
   - Se o usuário fechar a aba ou ficar inativo por mais de 30 minutos, um Cron/Sidecar do Kubernetes finaliza e deleta o Pod (`kubectl delete pod`), liberando 100% da RAM e CPU para o cluster.

---

## 3. Comparativo de Ambientes

| Recurso | Desenvolvimento Local (Docker Compose) | Produção (Kubernetes Cluster) |
| :--- | :--- | :--- |
| **Orquestrador** | Docker Compose (`docker-compose.yml`) | Kubernetes (k8s API Client) |
| **Containers `code-server`** | 1 Container compartilhado (desenvolvimento ágil) | 1 Pod isolado sob demanda por sessão de usuário |
| **Persistência do Workspace** | Volume local (`./storage/projects`) | Efêmero (`emptyDir` / Git Sync com o GitHub) |
| **Fonte da Verdade** | GitHub Remote | GitHub Remote |
| **Escalabilidade** | Single-Node (Máquina do Dev) | Multi-Node com Auto-Scaling (HPA/Cluster Autoscaler) |

---

## 4. Consequências

- **Positivas:**
  - Isolamento total de segurança entre usuários e pesquisas (sandbox no nível do Pod).
  - Escalabilidade infinita na nuvem com baixo custo computacional (paga-se apenas pelo tempo de edição ativa).
  - Garantia de resiliência: falhas no Pod não corrompem os dados, pois o GitHub é a única fonte da verdade.
- **Pontos de Atenção:**
  - Necessidade de preparar os manifests de Deployment/Pod Template e usar o SDK `@kubernetes/client-node` no backend no ambiente de produção (`NODE_ENV=production`).
