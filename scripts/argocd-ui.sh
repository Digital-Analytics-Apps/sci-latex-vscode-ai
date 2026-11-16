#!/usr/bin/env bash
# ==============================================================================
# SCRIPT UTILITÁRIO: Túneis de Acesso Local (Port-Forward Helper)
# O que este script faz?
# Ele cria "túneis seguros" temporários entre o seu computador físico e os
# Services rodando dentro do Kubernetes (KinD), sem você precisar recriar o cluster!
# Pressione Ctrl+C para encerrar todos os túneis de uma vez.
# ==============================================================================
set -e

ARGO_PORT=${ARGO_PORT:-8443}
FRONTEND_PORT=${FRONTEND_PORT:-5173}
BACKEND_PORT=${BACKEND_PORT:-3333}
GRAFANA_PORT=${GRAFANA_PORT:-3001}
PROMETHEUS_PORT=${PROMETHEUS_PORT:-9090}

echo "=========================================================="
echo "🚀 SCI-LaTeX Full Stack, GitOps & Observability Helper"
echo "=========================================================="

# 1. Recuperar credenciais do ArgoCD (se instalado)
if kubectl get secret argocd-initial-admin-secret -n argocd &>/dev/null; then
  ADMIN_PASS=$(kubectl -n argocd get secret argocd-initial-admin-secret -o jsonpath="{.data.password}" | base64 -d)
  echo "🔑 ArgoCD Usuário : admin"
  echo "🔑 ArgoCD Senha   : ${ADMIN_PASS}"
fi

echo "----------------------------------------------------------"
echo "🌐 1. ArgoCD Web UI   : https://localhost:${ARGO_PORT}"
echo "🌐 2. Frontend (App)  : http://localhost:${FRONTEND_PORT}"
echo "🌐 3. Backend API/Docs: http://localhost:${BACKEND_PORT}/docs (ou http://localhost:30080)"

# Verifica se a stack de observabilidade está instalada no namespace 'monitoring'
HAS_GRAFANA=false
if kubectl get svc -n monitoring | grep -q "grafana"; then
  HAS_GRAFANA=true
  GRAFANA_SVC=$(kubectl get svc -n monitoring -o jsonpath='{.items[?(@.spec.ports[*].name=="http-web" || @.spec.ports[*].port==80)].metadata.name}' | awk '{print $1}')
  echo "📊 4. Grafana Dashboards: http://localhost:${GRAFANA_PORT} (admin / admin_scia_local)"
fi

HAS_PROM=false
if kubectl get svc -n monitoring | grep -q "prometheus"; then
  HAS_PROM=true
  echo "📈 5. Prometheus TSDB   : http://localhost:${PROMETHEUS_PORT}"
fi

echo "=========================================================="
echo "Iniciando túneis de port-forward (pressione Ctrl+C para encerrar todos)..."

# Função executada automaticamente ao fechar o script (Ctrl+C)
cleanup() {
  echo ""
  echo "🛑 Encerrando todos os túneis de port-forward..."
  kill $(jobs -p) 2>/dev/null || true
  wait 2>/dev/null || true
  echo "✅ Túneis encerrados com sucesso."
}
trap cleanup SIGINT SIGTERM EXIT

# 2. Inicia os port-forwards em segundo plano (&)
kubectl port-forward svc/argocd-server -n argocd "${ARGO_PORT}:443" > /dev/null 2>&1 &
kubectl port-forward svc/sci-latex-frontend-service -n default "${FRONTEND_PORT}:80" > /dev/null 2>&1 &
kubectl port-forward svc/sci-latex-backend-service -n default "${BACKEND_PORT}:3333" > /dev/null 2>&1 &

if [ "$HAS_GRAFANA" = true ]; then
  # Procura o service do Grafana no namespace monitoring
  kubectl port-forward svc/${GRAFANA_SVC:-scia-monitoring-grafana} -n monitoring "${GRAFANA_PORT}:80" > /dev/null 2>&1 &
fi

if [ "$HAS_PROM" = true ]; then
  # Procura o service do Prometheus no namespace monitoring
  kubectl port-forward svc/scia-monitoring-kube-p-prometheus -n monitoring "${PROMETHEUS_PORT}:9090" > /dev/null 2>&1 &
fi

echo "🚀 Todos os serviços disponíveis estão acessíveis!"
wait
