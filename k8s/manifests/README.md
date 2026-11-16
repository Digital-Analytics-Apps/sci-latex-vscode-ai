# 📄 Manifestos da Aplicação SCIA (`k8s/manifests`)

Este diretório contém os manifestos declarativos oficiais do Kubernetes para rodar os microsserviços de negócio da **Plataforma SCIA** no namespace `default` (ou `scia-system`).

---

## 📁 Arquivos Deste Diretório e Seus Papéis

| Arquivo | Objetos K8s | O que faz na arquitetura |
| :--- | :--- | :--- |
| **[`backend-cluster.yaml`](backend-cluster.yaml)** | `Deployment`, `Service` (NodePort) | Gerencia os pods do **Backend Fastify** com 2 réplicas, injeta segredos via Secret, monitora a saúde via `/health` e mantém afinidade de sessão (`sessionAffinity: ClientIP`) para WebSockets estáveis na porta `30080`. |
| **[`compiler.yaml`](compiler.yaml)** | `Deployment`, `Service` (ClusterIP) | Gerencia o worker de **Compilação TeX Live**. Serviço estritamente interno na porta `4000`, com limites de 1 CPU e 1GB de RAM para compilações pesadas de PDFs. |
| **[`frontend.yaml`](frontend.yaml)** | `Deployment`, `Service` (ClusterIP) | Servidor web NGINX que entrega a aplicação **React 19** compilada na porta `80`. Consome pouquíssima memória (16MB). |
| **[`hpa.yaml`](hpa.yaml)** | `HorizontalPodAutoscaler` (HPA) | Automação que monitora uso de CPU/RAM e cria réplicas extras dinamicamente (Backend de 2 a 6 pods; Compiler de 1 a 4 pods). |
| **[`secret.example.yaml`](secret.example.yaml)** | `Secret` (Template) | Modelo de credenciais confidenciais (Banco de dados, MinIO, JWT e chave M2M). |

---

## 🚀 Como Aplicar Manualmente no Cluster

Se você estiver testando localmente com o KinD ou em um cluster sem ArgoCD, siga esta ordem:

### 1. Criar o arquivo de senhas e segredos:
```bash
# Copia o modelo para o arquivo real
cp k8s/manifests/secret.example.yaml k8s/manifests/secret.yaml

# Aplica o segredo no cluster
kubectl apply -f k8s/manifests/secret.yaml
```

### 2. Aplicar os microsserviços e o balanceamento:
```bash
kubectl apply -f k8s/manifests/backend-cluster.yaml
kubectl apply -f k8s/manifests/compiler.yaml
kubectl apply -f k8s/manifests/frontend.yaml
kubectl apply -f k8s/manifests/hpa.yaml
```

---

## 🔍 Comandos Úteis para Diagnóstico

```bash
# Ver todos os pods rodando e seu status (Running, Pending, CrashLoop):
kubectl get pods

# Ver os serviços e portas expostas:
kubectl get svc

# Ver logs em tempo real do Backend Fastify:
kubectl logs -l app=sci-latex-backend -f

# Ver logs do Compilador LaTeX:
kubectl logs -l app=sci-latex-compiler -f

# Ver o HPA e a porcentagem atual de CPU dos pods:
kubectl get hpa
```
