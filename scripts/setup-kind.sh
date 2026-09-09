#!/usr/bin/env bash
set -e

CLUSTER_NAME="sci-latex-kind"
IMAGE_NAME="sci-latex-vscode-code-server:latest"

echo "🚀 Configurando ambiente de desenvolvimento Kubernetes local com KinD..."

# 1. Verificar se kind está instalado
if ! command -v kind &> /dev/null; then
    echo "❌ KinD (Kubernetes in Docker) não encontrado. Por favor, instale o kind: https://kind.sigs.k8s.io/docs/user/quick-start/#installation"
    exit 1
fi

# 2. Verificar se kubectl está instalado
if ! command -v kubectl &> /dev/null; then
    echo "⚠️ kubectl não encontrado. Instale o kubectl para interagir com o cluster: https://kubernetes.io/docs/tasks/tools/"
fi

# 3. Verificar se o cluster KinD já existe
if kind get clusters | grep -q "^${CLUSTER_NAME}$"; then
    echo "✅ Cluster KinD '${CLUSTER_NAME}' já está rodando."
else
    echo "📦 Criando cluster KinD '${CLUSTER_NAME}'..."
    kind create cluster --config k8s/kind/kind-config.yaml
fi

# 4. Reconstruir e carregar a imagem do code-server no KinD
echo "🐳 Reconstruindo imagem Docker '${IMAGE_NAME}'..."
docker build -t "${IMAGE_NAME}" ./docker/code-server

echo "🚚 Carregando a imagem '${IMAGE_NAME}' para dentro do cluster KinD..."
kind load docker-image "${IMAGE_NAME}" --name "${CLUSTER_NAME}"

echo "📜 Aplicando manifestos do code-server e NodePort Service..."
kubectl apply -f k8s/manifests/code-server-template.yaml

echo "🎉 Cluster KinD '${CLUSTER_NAME}' pronto para uso com a imagem '${IMAGE_NAME}'!"
