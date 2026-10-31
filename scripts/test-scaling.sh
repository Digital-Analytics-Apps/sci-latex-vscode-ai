#!/usr/bin/env bash
set -e

PHASE=${1:-all}
PORT=${TARGET_PORT:-30080}

echo "=========================================================="
echo "🚀 SCI-LaTeX HPA Progressive Scaling Runner"
echo "=========================================================="
echo "🎯 Alvo KinD NodePort : ws://localhost:${PORT}"
echo "📊 Modo de Teste      : ${PHASE} (1 = Limite 2 pods | 2 = Sobe +1 pod | 3 = Teto 6 pods | all = Completo)"
echo "=========================================================="

# Confere se os pods do backend estão no cluster
if ! kubectl get deployment sci-latex-backend -n default &>/dev/null; then
  echo "❌ Deployment sci-latex-backend não encontrado no namespace default."
  exit 1
fi

echo -e "\n📋 Status Atual dos Pods do Backend:"
kubectl get pods -l app=sci-latex-backend -o wide

echo -e "\n📋 Status Atual do HPA:"
kubectl get hpa sci-latex-backend-hpa

if [ "${PHASE}" == "all" ]; then
  TARGET_PORT=${PORT} npm --prefix backend run benchmarks:progressive
else
  TARGET_PORT=${PORT} PHASE=${PHASE} npm --prefix backend run benchmarks:progressive
fi
