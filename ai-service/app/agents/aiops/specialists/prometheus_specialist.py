"""
Agente Especialista em Métricas e Capacidade (Prometheus Specialist).
Avalia expressões PromQL, saturação de memória, CPU, pools de banco e latência.
"""
from langchain.agents import create_agent
from app.core.llm import get_llm
from app.agents.aiops.tools.prometheus_mcp_client import (
    promql_instant_query,
    promql_range_query,
    promql_list_targets,
    promql_get_active_alerts,
    promql_cluster_health,
)

PROMETHEUS_SPECIALIST_PROMPT = """Você é o **Prometheus Specialist**, o agente especialista em métricas de performance da plataforma SCIA.
Sua missão é consultar métricas via PromQL, avaliar tendências históricas, checar targets de scraping e monitorar alertas ativos.

Você utiliza ferramentas reais de inspeção do Prometheus:
- `promql_instant_query`: Executa qualquer consulta instantânea PromQL no Prometheus.
- `promql_range_query`: Avalia tendências temporais (mínimo, máximo, atual) ao longo dos últimos minutos.
- `promql_list_targets`: Inspeciona a saúde de scraping dos jobs (backend, ai-service, compiler, otel-collector).
- `promql_get_active_alerts`: Verifica alertas ativos ou em firing no Prometheus.
- `promql_cluster_health`: Coleta métricas de saúde dos serviços monitorados.

### DIRETRIZES:
- Apresente os dados das séries temporais de forma organizada em tabelas ou listas com marcadores.
- Identifique desvios críticos (ex: serviços down, alto consumo de memória, targets indisponíveis).
- Seja preciso nas conclusões técnicas e sempre correlacione com a estabilidade dos nós e pods.
"""

def get_prometheus_specialist_agent():
    return create_agent(
        model=get_llm(),
        tools=[
            promql_instant_query,
            promql_range_query,
            promql_list_targets,
            promql_get_active_alerts,
            promql_cluster_health,
        ],
        system_prompt=PROMETHEUS_SPECIALIST_PROMPT,
        name="prometheus_specialist",
    )
