#!/usr/bin/env bash
set -e

PORT=${1:-8443}

echo "=========================================================="
echo "🚀 ArgoCD Web UI Access Helper"
echo "=========================================================="

# Check if argocd namespace and secret exist
if ! kubectl get secret argocd-initial-admin-secret -n argocd &>/dev/null; then
  echo "❌ Secret argocd-initial-admin-secret not found in namespace argocd."
  echo "If you already changed the admin password, use your custom password."
else
  ADMIN_PASS=$(kubectl -n argocd get secret argocd-initial-admin-secret -o jsonpath="{.data.password}" | base64 -d)
  echo "🔑 Usuário : admin"
  echo "🔑 Senha   : ${ADMIN_PASS}"
fi

echo "🌐 URL     : https://localhost:${PORT}"
echo "⚠️  Nota   : Como o certificado é autoassinado no cluster local, aceite o aviso de segurança no navegador."
echo "=========================================================="
echo "Iniciando port-forward na porta ${PORT} (pressione Ctrl+C para encerrar)..."

kubectl port-forward svc/argocd-server -n argocd "${PORT}:443"
