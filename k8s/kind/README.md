# 🐳 Ambiente Kubernetes Local com KinD (`k8s/kind`)

Este diretório contém a receita para inicializar um cluster Kubernetes completo na sua máquina local utilizando o **KinD (Kubernetes in Docker)**.

---

## 🎯 O Que é o KinD e Para Que Serve?

O KinD permite criar um cluster Kubernetes multi-pod ou multi-nó onde cada nó do Kubernetes é simplesmente um contêiner Docker.

Ele é ideal para:
* Validar manifestos Kubernetes (`Deployment`, `Service`, `HPA`) antes de mandar para o GitHub.
* Simular o balanceamento de carga real e alta disponibilidade.
* Testar como o backend se comporta com múltiplas réplicas e autoridade *Single-Writer* de edição colaborativa.

---

## 📁 Arquivos Deste Diretório

* **[`kind-config.yaml`](kind-config.yaml):** Define a topologia do cluster, redirecionamento das portas `80`, `443` e `30080` do seu computador para o cluster e montagem do volume local `./storage`.

---

## 🚀 Como Criar e Destruir o Cluster Local

### 1. Criar o cluster KinD:
```bash
kind create cluster --config k8s/kind/kind-config.yaml
```

### 2. Verificar se o cluster está ativo:
```bash
kubectl cluster-info --context kind-sci-latex-kind
kubectl get nodes
```

### 3. Destruir o cluster (quando terminar o dia de trabalho):
```bash
kind delete cluster --name sci-latex-kind
```
