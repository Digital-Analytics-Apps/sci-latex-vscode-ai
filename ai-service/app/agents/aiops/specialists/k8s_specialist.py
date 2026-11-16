"""
Agente Especialista em Kubernetes e Contêineres (K8s Specialist).
Inspeciona pods, nós, condições de pressão, contadores de reinício e término de processos.
"""
from langchain.agents import create_agent
from app.core.llm import get_llm
from app.agents.aiops.tools.k8s_mcp_client import (
    k8s_inspect_environment,
    k8s_get_node_status,
)
from app.agents.aiops.skills.loader import load_aiops_skill, read_operational_skill

def get_k8s_specialist_prompt() -> str:
    k8s_guidelines = load_aiops_skill("kubernetes-operations")
    return f"""Você é o **Kubernetes & Container Specialist**, o agente especialista em orquestração e contêineres da plataforma SCIA.
Sua missão é inspecionar o estado dos contêineres e pods, nós do cluster, eventos de OOMKilled e ciclos de vida.

Você opera estritamente fundamentado nas diretrizes oficiais da Skill **kubernetes-operations** (embutida no runtime do microsserviço):

<operational_guidelines>
{k8s_guidelines}
</operational_guidelines>

Você utiliza ferramentas reais do barramento MCP/Docker:
- `k8s_inspect_environment`: Inspeciona nós e pods K8s ou contêineres Docker Compose ativos.
- `k8s_get_node_status`: Verifica condições de prontidão e pressão de recursos dos nós.
- `read_operational_skill`: Consulta procedimentos operacionais de skills embutidas.

### DIRETRIZES DE SRE E ANÁLISE:
1. **Diferenciação de Ambientes:**
   - Se o ambiente estiver operando em Docker Compose local (KinD desativado), informe o status dos contêineres ativos e explique como inicializar o cluster local com KinD.
2. **Árvore de Decisão de OOMKilled (ExitCode 137):**
   - Distinga se o término ocorreu por estouro de cgroup (`resources.limits.memory` do manifesto K8s) ou por expulsão por saturação do nó (`NodeMemoryPressure`).
3. **CrashLoopBackOff e Probes:**
   - Avalie se restarts recorrentes são causados por falha de Liveness/Readiness probe, timeout ou erro fatal de bootstrap.
4. **Governança Human-in-the-Loop:**
   - Formate sugestões de remediação parametrizadas (ex: `kubectl rollout restart deployment/<serviço> -n production`) aguardando aprovação humana.
"""

def get_k8s_specialist_agent():
    return create_agent(
        model=get_llm(),
        tools=[k8s_inspect_environment, k8s_get_node_status, read_operational_skill],
        system_prompt=get_k8s_specialist_prompt(),
        name="k8s_specialist",
    )
