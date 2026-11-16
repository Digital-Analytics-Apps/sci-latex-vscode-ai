# 🛠️ Scripts Utilitários de Automação (`scripts/`)

Este diretório contém scripts em Bash projetados para facilitar o dia a dia de desenvolvimento e testes da plataforma SCIA no Kubernetes local.

---

## 📁 Arquivos Deste Diretório e Como Usar

### 1. `argocd-ui.sh` — O Helper de Acesso aos Serviços (Recomendado!)
* **O que faz:** Cria túneis temporários seguros (`kubectl port-forward`) conectando as portas da sua máquina aos pods e serviços do cluster.
* **O que ele abre:**
  * **ArgoCD Web UI:** `https://localhost:8443` (usuário: `admin`, senha impressa no terminal)
  * **Frontend SCIA:** `http://localhost:5173`
  * **Backend Fastify & Swagger:** `http://localhost:3333/docs`
  * **Grafana Dashboards:** `http://localhost:3001` (quando a observabilidade estiver instalada)
  * **Prometheus:** `http://localhost:9090`
* **Como usar:**
  ```bash
  ./scripts/argocd-ui.sh
  ```
  *(Para fechar todos os acessos, basta pressionar `Ctrl+C` no terminal).*

---

### 2. `setup-kind.sh` — Criação do Cluster Local
* **O que faz:** Valida se você tem o Docker, KinD e Kubectl instalados e inicializa o cluster KinD com o arquivo `k8s/kind/kind-config.yaml`.
* **Como usar:**
  ```bash
  ./scripts/setup-kind.sh
  ```

---

### 3. `test-scaling.sh` — Teste de Carga e HPA
* **O que faz:** Dispara um gerador de carga artificial de CPU nos pods do backend e compilador para demonstrar o `HorizontalPodAutoscaler` (HPA) criando novas réplicas de pods em tempo real.
* **Como usar:**
  ```bash
  ./scripts/test-scaling.sh
  ```
