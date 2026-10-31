#!/usr/bin/env bash
set -e

ARGO_PORT=${ARGO_PORT:-8443}
FRONTEND_PORT=${FRONTEND_PORT:-5173}
BACKEND_PORT=${BACKEND_PORT:-3333}

echo "=========================================================="
echo "🚀 SCI-LaTeX Full Stack & ArgoCD Port-Forward Helper"
echo "=========================================================="

# 1. Recuperar credenciais do ArgoCD
if ! kubectl get secret argocd-initial-admin-secret -n argocd &>/dev/null; then
  echo "⚠️  Secret argocd-initial-admin-secret não encontrado (senha pode ter sido alterada)."
else
  ADMIN_PASS=$(kubectl -n argocd get secret argocd-initial-admin-secret -o jsonpath="{.data.password}" | base64 -d)
  echo "🔑 ArgoCD Usuário : admin"
  echo "🔑 ArgoCD Senha   : ${ADMIN_PASS}"
fi

echo "----------------------------------------------------------"
echo "🌐 1. ArgoCD Web UI   : https://localhost:${ARGO_PORT}"
echo "🌐 2. Frontend (App)  : http://localhost:${FRONTEND_PORT}"
echo "🌐 3. Swagger API Docs: http://localhost:${BACKEND_PORT}/docs (ou http://localhost:30080/docs)"
echo "=========================================================="
echo "Iniciando túneis de port-forward (pressione Ctrl+C para encerrar todos)..."

# Trap para encerrar todos os processos em segundo plano ao sair
cleanup() {
  echo ""
  echo "🛑 Encerrando todos os túneis de port-forward..."
  kill $(jobs -p) 2>/dev/null || true
  wait 2>/dev/null || true
  echo "✅ Túneis encerrados com sucesso."
}
trap cleanup SIGINT SIGTERM EXIT

# Inicia os port-forwards em background
kubectl port-forward svc/argocd-server -n argocd "${ARGO_PORT}:443" > /dev/null 2>&1 &
kubectl port-forward svc/sci-latex-frontend-service -n default "${FRONTEND_PORT}:80" > /dev/null 2>&1 &
kubectl port-forward svc/sci-latex-backend-service -n default "${BACKEND_PORT}:3333" > /dev/null 2>&1 &

echo "🚀 Todos os serviços estão acessíveis!"
wait
