# ☸️ Observabilidade no Kubernetes (Helm & Prometheus Operator)

Este diretório contém os manifestos de infraestrutura para o provisionamento e governança de telemetria no cluster Kubernetes via **Helm** e **GitOps (ArgoCD)**.

---

## 🏗️ Separação de Namespaces & Arquitetura

* **Namespace `default` (ou `scia-system`):** Onde rodam os pods de negócio (`backend`, `frontend`, `ai-service`, `compiler`, `postgres`, `redis`).
* **Namespace `monitoring`:** Onde rodam as ferramentas de telemetria (`prometheus`, `grafana`, `alertmanager`, `loki`, `tempo`).

---

## 🔒 Comunicação Segura Cross-Namespace (Zero-Trust)

### 1. Resolução de Nomes no CoreDNS
No Kubernetes, pods em namespaces diferentes se comunicam através do FQDN (*Fully Qualified Domain Name*) interno:
```
<service-name>.<namespace>.svc.cluster.local:<port>
```
* **Prometheus (`monitoring`) $\rightarrow$ Backend (`default`):**
  `http://sci-latex-backend-service.default.svc.cluster.local:3333/metrics`
* **Backend (`default`) $\rightarrow$ OTel Collector / Tempo (`monitoring`):**
  `http://scia-otel-collector.monitoring.svc.cluster.local:4318/v1/traces`

### 2. Blindagem de Rede com NetworkPolicy (`network-policy-monitoring.yaml`)
Por padrão, o Kubernetes permite comunicação entre pods. A `NetworkPolicy` restringe o acesso aos endpoints `/metrics` para que:
1. Apenas pods do mesmo namespace consigam conversar entre si.
2. Apenas pods do namespace com a label `kubernetes.io/metadata.name: monitoring` consigam raspar as portas `3333`, `4000` e `8000`.
3. Qualquer outro pod estranho ou externo tenha a conexão descartada a nível de kernel (IPTables / eBPF).

### 3. Segurança Machine-to-Machine (M2M) & Segredos
* **Chamadas de Negócio (ex: Backend $\rightarrow$ AI Service / Compiler):**
  Utilizam o cabeçalho `X-Internal-Service-Key` injetado via `Secret` do Kubernetes (`sci-latex-secret`), ou tokens JWT de curta duração assinados criptograficamente com RS256, conforme definido na **ADR-012**.
* **Chamadas de Telemetria (Prometheus $\rightarrow$ `/metrics`):**
  O endpoint `/metrics` expõe apenas números agregados (contadores, histogramas de latência, uso de RAM). Ele **não trafega** senhas, tokens, dados de usuários ou conteúdo de artigos. Caso uma política institucional exija token no `/metrics`, o `ServiceMonitor` permite injetar um `bearerTokenSecret` do Kubernetes nativamente.

---

## 🚀 Como Aplicar Manualmente via Helm

```bash
# 1. Adicionar o repositório oficial da comunidade Prometheus
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm repo update

# 2. Instalar a stack no namespace 'monitoring'
helm install scia-monitoring prometheus-community/kube-prometheus-stack \
  --namespace monitoring \
  --create-namespace \
  -f k8s/monitoring/values-kube-prometheus-stack.yaml

# 3. Aplicar os ServiceMonitors e a NetworkPolicy no namespace da aplicação
kubectl apply -f k8s/monitoring/service-monitors.yaml
kubectl apply -f k8s/monitoring/network-policy-monitoring.yaml
```

---

## 🐙 Deploy Automatizado via ArgoCD

Para sincronizar via GitOps, aplique a aplicação do ArgoCD:
```bash
kubectl apply -f k8s/argocd/application-monitoring.yaml
```
