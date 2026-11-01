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
11. [Como Rodar o Seed do Banco de Dados](#11-como-rodar-o-seed-do-banco-de-dados)
12. [Dimensionamento de Recursos e Benchmark de Estresse](#12-dimensionamento-de-recursos-requestslimits-e-benchmark-de-estresse)
13. [Guia de Implantação On-Premises](#13-guia-de-implantação-on-premises)
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

# 3. Forcar o reinicio do pod para carregar a nova versao
kubectl rollout restart deployment sci-latex-backend
```

### 5.2 Compilador LaTeX (TeX Live + Microserviço)
```bash
# 1. Constrói a imagem do compilador isolado
docker build -t sci-latex-vscode-compiler:latest ./compiler

# 2. Carrega a imagem no cluster KinD
kind load docker-image sci-latex-vscode-compiler:latest --name sci-latex-kind

# 3. Forcar o reinicio do pod para carregar a nova versao
kubectl rollout restart deployment sci-latex-compiler
```

### 5.3 Frontend de Produção (React + Vite + Nginx)
O Dockerfile de produção (`frontend/Dockerfile.prod`) usa build multi-stage e **não possui URLs hardcoded**. Ele gera um pacote estático limpo e usa um script de entrada (`docker-entrypoint.sh`) para injetar as variáveis de ambiente no Nginx em tempo de execução:

```bash
# 1. Constrói a imagem de produção com Nginx
docker build -f frontend/Dockerfile.prod -t sci-latex-frontend:latest ./frontend

# 2. Carrega a imagem no cluster KinD
kind load docker-image sci-latex-frontend:latest --name sci-latex-kind

# 3. Forcar o reinicio do pod para carregar a nova versao
kubectl rollout restart deployment sci-latex-frontend
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

## 8. Passo 6: Acessar ArgoCD, Frontend e Swagger (Port-Forward Unificado)

### 8.1 Método Rápido (Script Unificado)
O script `scripts/argocd-ui.sh` abre simultaneamente os túneis de port-forward para todos os serviços essenciais e exibe as credenciais do ArgoCD:

```bash
# Inicia os túneis para ArgoCD (:8443), Frontend (:5173) e Swagger (:3333)
./scripts/argocd-ui.sh
```

**URLs disponíveis após rodar o script:**
* 🌐 **ArgoCD Web UI:** `https://localhost:8443` (Usuário: `admin`)
* 🌐 **Frontend (App):** `http://localhost:5173`
* 🌐 **Swagger API Docs:** `http://localhost:3333/docs` (ou `http://localhost:30080/docs`)

*(Pressione `Ctrl+C` no terminal para encerrar todos os túneis de uma só vez).*

### 8.2 Método Manual Individual
Se preferir rodar os comandos separadamente em abas distintas do terminal:

```bash
# 1. Senha do admin do ArgoCD
kubectl -n argocd get secret argocd-initial-admin-secret -o jsonpath="{.data.password}" | base64 -d; echo

# 2. ArgoCD Web UI
kubectl port-forward svc/argocd-server -n argocd 8443:443

# 3. Frontend Nginx
kubectl port-forward svc/sci-latex-frontend-service -n default 5173:80

# 4. Backend Fastify & Swagger Docs
kubectl port-forward svc/sci-latex-backend-service -n default 3333:3333
```
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

---

## 11. Como Rodar o Seed do Banco de Dados

O seed cria os usuários iniciais com perfis RBAC, ciclo acadêmico, artigo científico de demonstração, arquivos TeX iniciais e as 6 etapas do workflow científico.

### 11.1 Subir o Banco de Dados (PostgreSQL)
Certifique-se de que o container do PostgreSQL está em execução:
```bash
# Sobe PostgreSQL, Redis e MinIO via Docker Compose
docker compose up -d postgres redis minio
```

### 11.2 Sincronizar o Schema e Executar o Seed
No diretório `backend`:
```bash
cd backend

# 1. Aplica o schema do Prisma no PostgreSQL
npx prisma db push

# 2. Executa o script de seed
npm run db:seed
```

### 11.3 Credenciais Criadas pelo Seed (Senha padrão: `123456`)
* **Gilson Russo (ADMIN / Gestor):** `gilson.russo@example.com`
* **Roce Russo (COORDENADOR):** `roce.russo@example.com`
* **Bianca Russo (AUTOR):** `bianca.russo@example.com`
* **Elisa Russo (AUTOR):** `elisa.russo@example.com`
* **Carlos Lima (Membro / Revisor):** `carlos.revisor@example.com`
* **System Admin (ADMIN):** `admin@google.com`
* **Pesquisador Padrão (AUTOR):** `user@google.com`

---

## 12. Dimensionamento de Recursos (Requests/Limits) e Benchmark de Estresse

Para evitar superdimensionamento (*overprovisioning*) ou travamento de réplicas pelo HPA, realizamos testes empíricos de estresse contra o cluster KinD.

### 12.1 Como Executar a Simulação de Estresse
O script `backend/scripts/benchmark-kind-500-users.ts` simula **100 artigos simultâneos**, **500 autores concorrentes via WebSocket** (2.500 operações colaborativas de edição simultânea) e **15 compilações LaTeX intensivas**:

```bash
# Executa o benchmark diretamente contra o NodePort do cluster KinD
cd backend
TARGET_PORT=30080 npx tsx scripts/benchmark-kind-500-users.ts
```

### 12.2 Métricas Coletadas Durante o Teste

| Componente | CPU (Repouso) | CPU (Pico 500 users) | Memória (Repouso) | Memória (Pico) | Ação Observada no HPA |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Backend** (`sci-latex-backend`) | `2m` | **`134m`** | `93Mi – 95Mi` | **`135Mi – 150Mi`** | Escalou de 4 para **6 réplicas** por pico de CPU. |
| **Compiler** (`sci-latex-compiler`) | `1m` | **`304m`** | `40Mi` | **`553Mi`** | Escalou de 1 para **3 réplicas** por carga do `pdflatex`. |
| **Frontend** (`sci-latex-frontend`) | `1m` | `2m` | `7Mi` | **`7Mi`** | Estático, consumo desprezível. |

### 12.3 Racional de Engenharia para os Valores Definidos

#### 1. Backend Fastify (`k8s/manifests/backend-cluster.yaml` e `hpa.yaml`):
* **O Problema Anterior:** O request de memória estava em apenas `150Mi`. Como o Node.js/Prisma consome naturalmente ~`95Mi` em repouso (baseline), o uso ficava em $66\%$. Com a meta do HPA em $75\%$, se o cluster tentasse baixar para 3 ou 2 pods, o uso médio por pod subiria para $88\%$ e $132\%$, impedindo o scale-down e travando o cluster em 4 pods para sempre.
* **A Solução Calibrada:**
  * `requests`: `cpu: 100m`, `memory: 200Mi`. Com 200Mi, o repouso de 95Mi representa apenas **$47.5\%$**.
  * `limits`: `cpu: 500m`, `memory: 512Mi`. Amplo espaço para absorver rajadas de WebSocket e serialização de documentos.
  * `hpa.yaml`: Meta de CPU em **`70%`** e Memória em **`80%`**. Permite que o cluster reduza tranquilamente para o mínimo de **2 réplicas** em repouso e só escale sob tráfego real.

#### 2. Compilador TeX Live (`k8s/manifests/compiler.yaml` e `hpa.yaml`):
* **O Racional:** Compilação com `pdflatex` é um processo temporário e *CPU-bound*.
* **A Solução Calibrada:**
  * `requests`: `cpu: 200m`, `memory: 256Mi`.
  * `limits`: `cpu: 1000m` (1 núcleo inteiro liberado para compilar rápido), `memory: 1Gi` (o pico de 15 PDFs simultâneos consumiu 553Mi; 1Gi garante que nunca sofrerá *OOMKilled*).
  * `hpa.yaml`: `minReplicas: 1`, `maxReplicas: 4`, target de CPU em **`80%`**.

#### 3. Frontend Nginx (`k8s/manifests/frontend.yaml`):
* **A Solução Calibrada:**
  * `requests`: `cpu: 10m`, `memory: 16Mi`.
  * `limits`: `cpu: 100m`, `memory: 32Mi`.
  * `replicas`: **2 réplicas fixas** para Alta Disponibilidade (HA) sem desperdício de memória no nó.

### 12.4 Script de Teste Progressivo de Escalonamento (2 pods $\to$ +1 $\to$ 6 pods)

O script utiliza o modelo de **5 autores por documento** com artigos de tamanho médio completos:

```bash
# Executa a Fase 1: Carga Leve (6 artigos x 5 autores = 30 conexões; valida limite de 2 pods)
./scripts/test-scaling.sh 1

# Executa a Fase 2: Carga Moderada (35 artigos x 5 autores = 175 conexões + 15 compilações; sobe +1 a 2 pods)
./scripts/test-scaling.sh 2

# Executa a Fase 3: Carga Máxima (120 artigos x 5 autores = 600 conexões + 40 compilações; atinge 6 pods)
./scripts/test-scaling.sh 3

# Executa todas as 3 fases sequencialmente
./scripts/test-scaling.sh all
```

### 12.5 Tabela Oficial de Limites Empíricos (Ponto de Escalonamento e Capacidade Máxima)

Com a execução automatizada do script `backend/scripts/test-empirical-limits.ts`, medimos os seguintes limites comprovados:

#### 1. Limite Antes de Escalar (Capacidade de 1 e 2 Pods)

| Configuração | Artigos Simultâneos | Autores / Artigo | Conexões WebSocket | Status do HPA | Latência P95 | Veredito |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **1 Pod** (estimado simétrico) | **15 artigos** | 5 autores | **75 conexões** | Carga estável | ~400ms | **Limite de 1 pod sem escalar** |
| **2 Pods** (degrau 1) | 5 artigos | 5 autores | 25 conexões | 2 $\to$ 2 réplicas | 0ms | Folga total |
| **2 Pods** (degrau 2) | 10 artigos | 5 autores | 50 conexões | 2 $\to$ 2 réplicas | 294ms | Folga total |
| **2 Pods** (degrau 3) | 20 artigos | 5 autores | 100 conexões | 2 $\to$ 2 réplicas | 282ms | Estável |
| **2 Pods** (degrau máximo) | **30 artigos** | **5 autores** | **150 conexões** | **2 $\to$ 2 réplicas** | **543ms** | **LIMITE MÁXIMO DE 2 PODS** |
| **Inflexão (Gatilho de Escala)** | **40 artigos** | **5 autores** | **200 conexões** | **2 $\to$ 4 réplicas** | **1.145ms** | 🚨 **HPA dispara Scale-Up** |

#### 2. Capacidade Máxima da Infraestrutura Atual (Teto de 6 Pods Backend + 4 Compiler)

| Conexões Ativas | Artigos Concorrentes | Operações em Voo | Tempo Total | Pods Ativos | Status do Cluster | Latência P95 |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **400 conexões** | 80 artigos | 4.000 ops | 8.7s | 4 pods | ✅ Sucesso 100% | 1.350ms |
| **800 conexões** | 160 artigos | 12.000 ops | 12.9s | 4 pods | ✅ Sucesso 100% | 1.387ms |
| **1.250 conexões** | **250 artigos** | **25.000 ops** | **17.3s** | **6 pods** | **✅ Sucesso 100%** | **2.457ms** |
| **1.750 conexões** | 350 artigos | 35.000 ops | 20.4s | 6 pods | ❌ Ponto de Ruptura (*socket hang up*) | N/A |

> 📌 **Conclusão:**  
> • **Antes de escalar:** 2 pods suportam exatamente **150 conexões / 30 artigos**.  
> • **Teto sustentável da infraestrutura:** Suporta até **1.250 conexões / 250 artigos** simultâneos com 100% de integridade e zero quedas.

---

## 13. Guia de Implantação On-Premises

Para orientações completas de alinhamento com a equipe de infraestrutura local, consulte:
* 📖 **Documento de Referência:** [`docs/GUIA_INFRAESTRUTURA_ON_PREMISES.md`](file:///mnt/c0b6217c-c2f3-4c1f-8ba2-c8d177f718a9/development/professional/sci-latex-vscode/docs/GUIA_INFRAESTRUTURA_ON_PREMISES.md)
* Inclui o questionário técnico de hardware/CSI/Ingress, matriz de riscos e template pronto de mensagem para o time de SRE local.
