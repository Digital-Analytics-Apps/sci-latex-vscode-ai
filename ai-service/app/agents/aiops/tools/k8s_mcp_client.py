import subprocess
import logging
from typing import Optional
from langchain_core.tools import tool

logger = logging.getLogger(__name__)

@tool
async def k8s_inspect_environment(
    namespace: str = "production",
    service_name: Optional[str] = None,
) -> str:
    """Inspeciona o cluster Kubernetes (pods, nós, restarts, OOMKilled) ou o ambiente de contêineres Docker locais.
    
    Args:
        namespace: Namespace do Kubernetes a ser inspecionado (padrão: 'production').
        service_name: Nome opcional de um serviço específico para filtrar (ex: 'backend', 'compiler', 'ai-service').
    """
    # 1. Tenta inspecionar o cluster Kubernetes via kubectl
    try:
        cmd = ["kubectl", "get", "nodes", "-o", "wide"]
        proc = subprocess.run(cmd, capture_output=True, text=True, timeout=3)
        if proc.returncode == 0 and "NAME" in proc.stdout:
            # Cluster K8s ativo!
            nodes_out = proc.stdout.strip()
            
            # Busca pods
            pod_cmd = ["kubectl", "get", "pods", "-n", namespace, "-o", "wide"]
            pod_proc = subprocess.run(pod_cmd, capture_output=True, text=True, timeout=3)
            pods_out = pod_proc.stdout.strip() if pod_proc.returncode == 0 else "Falha ao listar pods."
            
            return (
                f"### ☸️ Cluster Kubernetes Ativo\n\n"
                f"**Nós do Cluster:**\n```\n{nodes_out}\n```\n\n"
                f"**Pods (Namespace: `{namespace}`):**\n```\n{pods_out}\n```"
            )
    except Exception as exc:
        logger.debug(f"[K8s MCP] Cluster Kubernetes indisponível, verificando Docker: {exc}")

    # 2. Fallback gracioso: Inspeciona contêineres Docker locais em execução
    try:
        docker_cmd = [
            "docker", "ps",
            "--format", "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
        ]
        proc = subprocess.run(docker_cmd, capture_output=True, text=True, timeout=5)
        if proc.returncode == 0:
            lines = proc.stdout.strip().split("\n")
            if service_name:
                filtered = [lines[0]] + [l for l in lines[1:] if service_name.lower() in l.lower()]
                output = "\n".join(filtered)
            else:
                output = "\n".join(lines)
            
            count = max(0, len(lines) - 1)
            return (
                f"### 🖥️ Ambiente Local Docker Compose (Modo Local)\n\n"
                f"O cluster Kubernetes (KinD) não está ativo no momento. "
                f"O sistema está operando em **Docker Compose** com **{count} contêineres ativos**.\n\n"
                f"```\n{output}\n```\n\n"
                f"*(Para inicializar nós reais do Kubernetes localmente, execute `kind create cluster --config k8s/kind/kind-config.yaml`)*"
            )
    except Exception as exc:
        logger.error(f"[K8s MCP] Erro ao inspecionar contêineres Docker: {exc}")
        return f"Não foi possível inspecionar o ambiente de contêineres/K8s: {str(exc)}"


@tool
async def k8s_get_node_status() -> str:
    """Consulta especificamente a quantidade e saúde dos nós do cluster."""
    return await k8s_inspect_environment.ainvoke({})
