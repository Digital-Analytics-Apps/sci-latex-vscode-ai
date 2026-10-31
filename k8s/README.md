# ☸️ Guia de Infraestrutura Kubernetes & GitOps com ArgoCD

Este documento é o guia prático passo a passo de toda a infraestrutura Kubernetes local do projeto **SCI-LaTeX-VSCode**. Aqui você aprenderá como subir o cluster local com KinD, construir e carregar as imagens Docker, gerenciar segredos de forma segura fora do Git, configurar a reconciliação contínua com o ArgoCD e diagnosticar o ambiente.

---

## 📑 Sumário

1. [Visão Geral da Arquitetura](#1-visão-geral-da-arquitetura)
2. [Estrutura de Pastas de Infraestrutura](#2-estrutura-de-pastas-de-infraestrutura)
3. [Passo 1: Criar o Cluster Kubernetes Local (KinD)](#3-passo-1-criar-o-cluster-kubernetes-local-kind)
4. [Passo 2: Ativar e Inicializar o ArgoCD](#4-passo-2-ativar-e-inicializar-o-argocd)
5. [Passo 3: Construir as Imagens Docker e Carregar no Cluster](#5-passo-3-construir-as-imagens-docker-e-carregar-no-cluster)
6. [Passo 4: Configurar os Segredos (Kubernetes Secret)](#6-passo-4-configurar-os-segredos-kubernetes-secret)
7. [Passo 5: Conectar o ArgoCD ao Repositório (Application)](#7-passo-5-conectar-o-argocd-ao-repositório-application)
8. [Passo 6: Acessar a Interface Gráfica (Web UI) do ArgoCD](#8-passo-6-acessar-a-interface-gráfica-web-ui-do-argocd)
9. [Passo 7: Comandos Essenciais de Verificação e Diagnóstico](#9-passo-7-comandos-essenciais-de-verificação-e-diagnóstico)
10. [Como Funciona o Ciclo GitOps no Dia a Dia](#10-como-funciona-o-ciclo-gitops-no-dia-a-dia)

---

## 1. Visão Geral da Arquitetura

O ecossistema utiliza o padrão **GitOps (Pull-based)**:

```mermaid
flowchart TD
    subgraph Git [Repositório Git (GitHub)]
        Manifests[k8s/manifests/\nBackend + Compiler + Frontend + HPA]
        AppCRD[k8s/argocd/application.yaml]
    end

    subgraph KinD [Cluster Kubernetes Local - KinD]
        subgraph NamespaceArgo [Namespace: argocd]
            ArgoController[argocd-application-controller\nLoop de Reconciliação Contínua]
            ArgoServer[argocd-server\nAPI & Painel Web :8443]
            ArgoRepo[argocd-repo-server\nClonagem e Parser de YAMLs]
        end

        subgraph NamespaceDefault [Namespace: default]
            SecretLocal[(Secret: sci-latex-secret\nCriado fora do Git)]
            BackendPods[sci-latex-backend Pods\nNodePort: 30080]
            CompilerPods[sci-latex-compiler Pods\nClusterIP: 4000]
            FrontendPods[sci-latex-frontend Pods\nNginx + SPA :80]
            HPAs[Autoscalers HPA\nEscala CPU/RAM Dinâmica]
        end
    end

    AppCRD -->|Aplica Application| ArgoController
    ArgoRepo -->|1. Polling contínuo da branch dev| Manifests
    ArgoController -->|2. Compara Desired vs Live State| BackendPods & CompilerPods & FrontendPods
    SecretLocal -.->|3. Injeção de credenciais via envFrom| BackendPods & FrontendPods
```

* **Repositório Git:** É a **única fonte da verdade** (*Single Source of Truth*) para a infraestrutura declarativa.
* **Segredos Sensíveis:** Permanecem **fora do Git**, criados diretamente no cluster local ou gerenciados via ferramentas como *Sealed Secrets* ou *External Secrets*.
* **ArgoCD:** Um controlador dentro do cluster que monitora o repositório Git e aplica automaticamente qualquer alteração, garantindo auto-recuperação contínua (*Self-Healing*).

---

## 2. Estrutura de Pastas de Infraestrutura

```
k8s/
├── argocd/
│   └── application.yaml       # CRD Application do ArgoCD (conecta Git ao Cluster)
├── kind/
│   └── kind-config.yaml       # Configuração do nó do cluster KinD e mapeamento de portas
├── manifests/
│   ├── backend-cluster.yaml   # Deployment e Service NodePort (porta 30080) da API Fastify
│   ├── compiler.yaml          # Deployment e Service ClusterIP (porta 4000) do TeX Live
│   ├── frontend.yaml          # Deployment e Service ClusterIP (porta 80) do Nginx
│   ├── hpa.yaml               # Autoscaling horizontal dinâmico para Backend e Compiler
│   └── secret.example.yaml    # Modelo declarativo de segredos (NÃO contém dados reais)
└── README.md                  # Este guia
```

---

## 3. Passo 1: Criar o Cluster Kubernetes Local (KinD)

O KinD (*Kubernetes in Docker*) roda um cluster Kubernetes completo dentro de um container Docker na sua máquina.

### 1.1 Verificar se as ferramentas estão instaladas
```bash
docker --version     # Motor de containers
kind --version       # Gerenciador de clusters locais
kubectl version --client  # CLI de interação com o Kubernetes
```

### 1.2 Criar o cluster com portas mapeadas para o Host
O arquivo `k8s/kind/kind-config.yaml` expõe as portas `80`, `443` e a porta `30080` (NodePort do backend Fastify) diretamente na sua máquina local:

```bash
# Cria o cluster com o nome definido na configuração (sci-latex-kind)
kind create cluster --config k8s/kind/kind-config.yaml
```

*Se o cluster já existir, você verá a mensagem `Cluster 'sci-latex-kind' already exists`.*

### 1.3 Validar a conexão do kubectl
```bash
# Define o contexto ativo para o cluster recém-criado
kubectl cluster-info --context kind-sci-latex-kind

# Lista os nós em execução (deve exibir sci-latex-kind-control-plane em Ready)
kubectl get nodes
```

---

## 4. Passo 2: Ativar e Inicializar o ArgoCD

### 4.1 Instalar o ArgoCD no cluster (se for a primeira vez)
```bash
# 1. Cria um namespace isolado para o ArgoCD
kubectl create namespace argocd || true

# 2. Aplica o manifesto de instalação oficial estável do ArgoCD
kubectl apply -n argocd --server-side --force-conflicts -f https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml
```

### 4.2 Reativar pods caso o ArgoCD esteja com réplicas zeradas
Se o ArgoCD já estiver instalado no cluster mas escalado para 0 réplicas (para economizar recursos quando parado):

```bash
# Escala todos os deployments do namespace argocd de volta para 1 réplica
kubectl scale deploy -n argocd --all --replicas=1

# Escala o statefulset do application-controller para 1 réplica
kubectl scale statefulset -n argocd --all --replicas=1
```

### 4.3 Aguardar todos os pods do ArgoCD ficarem prontos (Ready)
```bash
# Bloqueia o terminal até que todos os pods estejam 1/1 Running
kubectl wait --for=condition=ready pod --all -n argocd --timeout=120s

# Confere o status de cada pod do ArgoCD
kubectl get pods -n argocd
```

*Componentes essenciais esperados em `Running`:*
* `argocd-server` (Painel Web e API)
* `argocd-application-controller` (Loop de sincronização)
* `argocd-repo-server` (Clonagem e leitura de manifestos Git)
* `argocd-redis` (Cache de estado)

---

## 5. Passo 3: Construir as Imagens Docker e Carregar no Cluster

Como estamos usando um cluster local KinD sem um registro público de containers, o KinD precisa receber as imagens Docker diretamente da máquina host com o comando `kind load docker-image`.

### 5.1 Backend (Fastify + Prisma + WebSocket)
```bash
# 1. Constrói a imagem local do backend
docker build -t sci-latex-backend:latest ./backend

# 2. Injeta a imagem para dentro dos nós do KinD
kind load docker-image sci-latex-backend:latest --name sci-latex-kind
```

### 5.2 Compilador LaTeX (TeX Live + Microserviço)
```bash
# 1. Constrói a imagem do compilador isolado
docker build -t sci-latex-vscode-compiler:latest ./compiler

# 2. Carrega a imagem no cluster KinD
kind load docker-image sci-latex-vscode-compiler:latest --name sci-latex-kind
```

### 5.3 Frontend de Produção (React + Vite + Nginx)
O Dockerfile de produção (`frontend/Dockerfile.prod`) usa build multi-stage e **não possui URLs hardcoded**. Ele gera um pacote estático limpo e usa um script de entrada (`docker-entrypoint.sh`) para injetar as variáveis de ambiente no Nginx em tempo de execução:

```bash
# 1. Constrói a imagem de produção com Nginx
docker build -f frontend/Dockerfile.prod -t sci-latex-frontend:latest ./frontend

# 2. Carrega a imagem no cluster KinD
kind load docker-image sci-latex-frontend:latest --name sci-latex-kind
```

---

## 6. Passo 4: Configurar os Segredos (Kubernetes Secret)

> ⚠️ **Princípio Fundamental de Segurança em GitOps:**  
> **NUNCA commite senhas, tokens ou dados sensíveis no Git**, mesmo que codificados em Base64. No Git versionamos apenas o modelo (`secret.example.yaml`), e criamos o segredo real diretamente no cluster.

### 6.1 Criar o Secret no cluster local via comando
Execute o comando abaixo para provisionar o segredo `sci-latex-secret` no namespace `default`:

```bash
kubectl create secret generic sci-latex-secret \
  --from-literal=DATABASE_URL="postgresql://postgres:postgres@postgres:5432/sci_latex_db?schema=public" \
  --from-literal=JWT_SECRET="super-secret-jwt-key-change-in-production" \
  --from-literal=MINIO_ACCESS_KEY="minioadmin" \
  --from-literal=MINIO_SECRET_KEY="minioadmin123" \
  --from-literal=VITE_API_URL="http://localhost:30080/api/v1" \
  --from-literal=VITE_WS_URL="ws://localhost:30080" \
  --dry-run=client -o yaml | kubectl apply -f -
```

### 6.2 O que cada chave faz:
* `DATABASE_URL`: String de conexão com o banco PostgreSQL.
* `JWT_SECRET`: Chave simétrica utilizada pelo Fastify para emitir e assinar tokens JWT.
* `MINIO_ACCESS_KEY` / `MINIO_SECRET_KEY`: Credenciais de acesso ao storage S3 de arquivos.
* `VITE_API_URL` / `VITE_WS_URL`: URLs dinâmicas injetadas no container do Frontend para o navegador saber onde chamar a API REST e o WebSocket.

### 6.3 Validar que o Secret foi criado com sucesso
```bash
# Confere se o recurso existe
kubectl get secret sci-latex-secret

# Valida se os valores foram decodificados corretamente (exemplo: VITE_API_URL)
kubectl get secret sci-latex-secret -o jsonpath='{.data.VITE_API_URL}' | base64 -d; echo
```

---

## 7. Passo 5: Conectar o ArgoCD ao Repositório (Application)

O manifesto `k8s/argocd/application.yaml` declara o objeto `Application` do ArgoCD que conecta o repositório GitHub ao cluster.

### 7.1 O que o arquivo `k8s/argocd/application.yaml` faz:
* **`spec.source`**: Aponta para o repositório `Digital-Analytics-Apps/sci-latex-vscode-ai`, branch `dev`, na pasta `k8s/manifests`.
* **`directory.include`**: Sincroniza apenas os manifestos ativos (`backend-cluster.yaml`, `compiler.yaml`, `frontend.yaml`, `hpa.yaml`).
* **`ignoreDifferences`**: Informa ao ArgoCD para **ignorar a contagem de réplicas** (`/spec/replicas`) do Backend e do Compiler, permitindo que o Horizontal Pod Autoscaler (**HPA**) aumente ou reduza os pods livremente sem marcar a aplicação como `OutOfSync`.
* **`syncPolicy.automated`**:
  * `selfHeal: true`: Se alguém tentar alterar ou deletar um pod manualmente fora do Git, o ArgoCD detecta a divergência e restaura o estado do Git.
  * `prune: true`: Se um arquivo for deletado do Git, o ArgoCD deleta o recurso do cluster.

### 7.2 Aplicar a Application no cluster:
```bash
# Registra a Application no ArgoCD
kubectl apply -f k8s/argocd/application.yaml
```

### 7.3 Verificar o status da sincronização
```bash
# Verifica se o Sync Status é Synced e Health Status é Healthy
kubectl get application -n argocd sci-latex-vscode
```

---

## 8. Passo 6: Acessar a Interface Gráfica (Web UI) do ArgoCD

### 8.1 Método Rápido (Script Automático)
Criamos um script que já busca a senha de admin e inicia o túnel seguro:

```bash
# Executa o script auxiliar
./scripts/argocd-ui.sh
```

### 8.2 Método Manual

#### 1. Obter a senha inicial do usuário `admin`:
O ArgoCD armazena a senha inicial do administrador em um Secret interno:

```bash
# Busca e decodifica a senha do admin
kubectl -n argocd get secret argocd-initial-admin-secret -o jsonpath="{.data.password}" | base64 -d; echo
```

#### 2. Iniciar o Port-Forward para a porta 8443:
```bash
# Cria um túnel da sua máquina para o serviço Web do ArgoCD
kubectl port-forward svc/argocd-server -n argocd 8443:443
```

#### 3. Fazer login no navegador:
1. Abra no navegador: **`https://localhost:8443`**
2. Como o certificado TLS é autoassinado no cluster local, clique em **Avançado $\to$ Continuar para localhost (inseguro)**.
3. Insira as credenciais:
   * **Username:** `admin`
   * **Password:** *(a senha obtida no comando anterior)*
4. Você verá a aplicação `sci-latex-vscode` com todos os pods, services e HPAs em formato de árvore visual em tempo real.

---

## 9. Passo 7: Comandos Essenciais de Verificação e Diagnóstico

### 9.1 Inspecionar a Aplicação no ArgoCD
```bash
# Ver resumo da aplicação
kubectl get application -n argocd sci-latex-vscode

# Ver cada recurso individual e seu status no ArgoCD
kubectl get application -n argocd sci-latex-vscode -o jsonpath='{range .status.resources[*]}{.kind}{"/"}{.name}{" - Status: "}{.status}{" | Health: "}{.health.status}{"\n"}{end}'

# Forçar o ArgoCD a verificar o repositório Git imediatamente (Hard Refresh)
kubectl annotate application -n argocd sci-latex-vscode argocd.argoproj.io/refresh=hard --overwrite
```

### 9.2 Inspecionar os Pods e Serviços
```bash
# Listar todos os pods da aplicação
kubectl get pods -n default

# Listar todos os serviços e portas expostas
kubectl get svc -n default

# Listar o status do Horizontal Pod Autoscaler (HPA)
kubectl get hpa -n default
```

### 9.3 Inspecionar Logs dos Serviços
```bash
# Logs em tempo real do Backend Fastify
kubectl logs -f deployment/sci-latex-backend -n default

# Logs do Frontend Nginx
kubectl logs -f deployment/sci-latex-frontend -n default

# Logs do Controlador do ArgoCD (para entender decisões de sincronização)
kubectl logs -f statefulset/argocd-application-controller -n argocd
```

### 9.4 Validar se o Frontend está gerando as variáveis dinâmicas de runtime
```bash
# Confere o arquivo gerado pelo docker-entrypoint.sh no pod do frontend
kubectl exec -n default deploy/sci-latex-frontend -- cat /usr/share/nginx/html/env-config.js
```
*Saída esperada:*
```javascript
window.__ENV__ = {
  VITE_API_URL: "http://localhost:30080/api/v1",
  VITE_WS_URL: "ws://localhost:30080"
};
```

### 9.5 Validar se o Backend está recebendo os segredos
```bash
# Consulta as variáveis de ambiente dentro do pod do backend
kubectl exec -n default deploy/sci-latex-backend -- printenv DATABASE_URL JWT_SECRET MINIO_ACCESS_KEY
```

---

## 10. Como Funciona o Ciclo GitOps no Dia a Dia

Uma vez configurado o ArgoCD, o seu fluxo de trabalho de deploy muda:

### O Fluxo Correto:
1. **Você faz uma alteração no código:**
   * Exemplo: Altera o número mínimo de réplicas no arquivo `k8s/manifests/hpa.yaml` ou ajusta os limites de memória no `backend-cluster.yaml`.
2. **Você commita e sobe para o Git:**
   ```bash
   git add k8s/manifests/
   git commit -m "chore(k8s): ajusta limites de memoria do backend"
   git push origin dev
   ```
3. **O ArgoCD faz o resto automaticamente:**
   * Ele detecta o commit no GitHub.
   * Compara o estado do Git com o cluster.
   * Aplica a mudança sem você precisar rodar `kubectl apply`.

### O Que Acontece se Alguém Mexer Manualmente no Cluster? (Self-Healing)
Se alguém rodar um comando manual tentando alterar o cluster:
```bash
kubectl scale deployment sci-latex-frontend --replicas=10
```
O ArgoCD detectará que o Git define apenas 2 réplicas. Graças ao `selfHeal: true`, o ArgoCD reverterá o deployment de volta para 2 réplicas em poucos segundos, garantindo que o cluster nunca sofra desvios não autorizados (*Configuration Drift*).
