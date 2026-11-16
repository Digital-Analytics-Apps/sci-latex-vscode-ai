"""
SRE Supervisor Agent — Orquestrador Central de AIOps da Plataforma SCIA.
Coordena os especialistas de telemetria e o barramento MCP via Tool Calling nativo de LLM (Zero Regex).
"""
import logging
from typing import List, Dict, Any, Optional
from langchain.agents import create_agent
from langchain_core.messages import HumanMessage, AIMessage, SystemMessage, BaseMessage
from app.core.llm import get_llm
from app.agents.aiops.tools.k8s_mcp_client import k8s_inspect_environment, k8s_get_node_status
from app.agents.aiops.tools.prometheus_mcp_client import (
    promql_instant_query,
    promql_range_query,
    promql_list_targets,
    promql_get_active_alerts,
    promql_cluster_health,
)
from app.agents.aiops.tools.loki_mcp_client import loki_query_logs
from app.agents.aiops.tools.glitchtip_mcp_client import glitchtip_list_issues
from app.agents.aiops.tools.opik_mcp_client import opik_list_entities, opik_read_entity, opik_read_skill
from app.agents.aiops.tools.postgres_mcp_client import (
    postgres_inspect_health,
    postgres_check_slow_queries_and_locks,
    pgbouncer_inspect_pools,
)
from app.agents.aiops.skills.loader import read_operational_skill

logger = logging.getLogger(__name__)

SRE_SUPERVISOR_PROMPT = """Você é o **SRE Supervisor Agent**, o copiloto de engenharia de confiabilidade (Site Reliability Engineering & AIOps) da plataforma SCIA.
Sua missão é coordenar a investigação de incidentes, diagnosticar anomalias de infraestrutura vs. aplicação e guiar o operador humano de forma assertiva e técnica.

Você é respaldado pelas Skills oficiais do projeto:
- **Kubernetes Operations Skill** (`.agents/skills/kubernetes-operations/SKILL.md` baseada em `kubernetes.io`)
- **Opik LLMOps Skills** (`.agents/skills/opik*` — diagnose, explain, evaluate)

Você possui acesso direto a ferramentas de inspeção (Tools Nativas e Conectores MCP) dos 6 pilares de observabilidade e infraestrutura:
1. ☸️ **Kubernetes & Contêineres (Tools Nativas):** `k8s_inspect_environment`, `k8s_get_node_status`
2. 📈 **Prometheus (Tools Nativas REST):** `promql_instant_query`, `promql_range_query`, `promql_list_targets`, `promql_get_active_alerts`, `promql_cluster_health`
3. 📜 **Loki (Tools Nativas LogQL):** `loki_query_logs`
4. 🐛 **GlitchTip (Servidor MCP Nativo :8005/mcp & Tool):** `glitchtip_list_issues`
5. 🧠 **Opik (Servidor MCP Oficial Comet ML & Skills):** `opik_list_entities`, `opik_read_entity`, `opik_read_skill`
6. 🐘 **PostgreSQL 16 & PgBouncer (Tools Nativas DB/Pool):** `postgres_inspect_health`, `postgres_check_slow_queries_and_locks`, `pgbouncer_inspect_pools`
7. 📚 **Runtime Skills (Playbooks embutidos):** `read_operational_skill`

### PRINCÍPIOS OPERACIONAIS E DIRETRIZES:
1. **TOOL CALLING NATIVO OBRIGATÓRIO:**
   - Sempre que o usuário perguntar sobre o estado do sistema, nós, pods, métricas, logs, erros ou traces, VOCÊ DEVE invocar a Tool ou conector correspondente.
   - NUNCA invente dados de telemetria. Se uma ferramenta retornar que o cluster KinD não está ativo, relate que o ambiente está operando em Docker Compose local com os contêineres detectados.

2. **ACOLHIMENTO E GUIA OPERACIONAL:**
   - Caso o usuário faça apenas uma saudação genérica ("olá", "ajuda", "o que você faz?"), apresente as capacidades dos 5 pilares e sugira investigações práticas ou mostre o panorama geral.

3. **GOVERNANÇA HUMAN-IN-THE-LOOP (HITL):**
   - Você é um agente estritamente Read-Only. NUNCA execute alterações ou reinicializações diretamente.
   - Quando identificar uma ação corretiva necessária (ex: rollout restart, ajuste de limite de cgroup, liberação de cache), sugira a ação com clareza para que o administrador aprove manualmente.

4. **FORMATO DA RESPOSTA:**
   - Utilize Markdown profissional com tabelas GFM, seções organizadas e alertas (> [!NOTE], > [!WARNING], > [!TIP]).
"""

ALL_AIOPS_TOOLS = [
    k8s_inspect_environment,
    k8s_get_node_status,
    promql_instant_query,
    promql_range_query,
    promql_list_targets,
    promql_get_active_alerts,
    promql_cluster_health,
    loki_query_logs,
    glitchtip_list_issues,
    opik_list_entities,
    opik_read_entity,
    opik_read_skill,
    postgres_inspect_health,
    postgres_check_slow_queries_and_locks,
    pgbouncer_inspect_pools,
    read_operational_skill,
]

def get_sre_supervisor_agent():
    return create_agent(
        model=get_llm(),
        tools=ALL_AIOPS_TOOLS,
        system_prompt=SRE_SUPERVISOR_PROMPT,
        name="sre_supervisor",
    )

async def run_aiops_chat(
    user_prompt: str,
    history: Optional[List[Dict[str, str]]] = None,
    service_context: Optional[str] = None,
    incident_id: Optional[str] = None,
) -> Dict[str, Any]:
    """Executa um turno de conversação com o SRE Supervisor Agent, mantendo o histórico de turnos anteriores."""
    agent = get_sre_supervisor_agent()
    
    messages: List[BaseMessage] = []
    
    # Injeta contexto operacional se disponível
    if service_context or incident_id:
        context_msg = f"[Contexto Operacional: Serviço Afetado='{service_context or 'Geral'}', Incidente ID='{incident_id or 'Nenhum'}']"
        messages.append(SystemMessage(content=context_msg))

    # Injeta histórico prévio da conversa
    if history:
        for turn in history[-10:]:  # Limita aos 10 últimos turnos para controle de contexto
            role = turn.get("role")
            content = turn.get("content", "")
            if role == "user":
                messages.append(HumanMessage(content=content))
            elif role == "assistant":
                messages.append(AIMessage(content=content))

    # Adiciona a mensagem atual do usuário
    messages.append(HumanMessage(content=user_prompt))

    logger.info(f"[AIOps Supervisor] Processando prompt de SRE: {user_prompt[:80]}...")
    
    result = await agent.ainvoke({"messages": messages})
    
    # Extrai o conteúdo final do agente
    final_messages = result.get("messages", [])
    response_text = ""
    for msg in reversed(final_messages):
        if isinstance(msg, AIMessage) and msg.content:
            if isinstance(msg.content, list):
                text_parts = []
                for part in msg.content:
                    if isinstance(part, dict) and "text" in part:
                        text_parts.append(part["text"])
                    elif isinstance(part, str):
                        text_parts.append(part)
                response_text = "\n".join(text_parts)
            elif isinstance(msg.content, str):
                response_text = msg.content
            else:
                response_text = str(msg.content)
            break

    return {
        "message": response_text or "Processamento concluído pelo SRE Supervisor.",
        "incidentId": incident_id,
        "serviceContext": service_context,
    }
