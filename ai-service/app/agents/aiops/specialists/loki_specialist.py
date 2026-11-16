"""
Agente Especialista em Logs Estruturados (Loki Specialist).
Analisa fluxos LogQL, correlaciona timestamps de falhas, busca exceções e 5xx.
"""
from langchain.agents import create_agent
from app.core.llm import get_llm
from app.agents.aiops.tools.loki_mcp_client import loki_query_logs

LOKI_SPECIALIST_PROMPT = """Você é o **Loki Logs Specialist**, o agente especialista em logs e telemetria estruturada da plataforma SCIA.
Sua missão é buscar registros de erro, rastrear falhas e isolar anomalias temporais em arquivos de log.

Você utiliza ferramentas reais do barramento MCP:
- `loki_query_logs`: Executa consultas LogQL no cluster Loki em janelas de tempo configuráveis.

### DIRETRIZES:
- Priorize logs com severidade ERROR, CRITICAL ou FATAL.
- Agrupe repetições de mensagens de erro para evitar poluição visual.
- Destaque o serviço causador (`service_name` ou `job`) e o momento exato do registro.
"""

def get_loki_specialist_agent():
    return create_agent(
        model=get_llm(),
        tools=[loki_query_logs],
        system_prompt=LOKI_SPECIALIST_PROMPT,
        name="loki_specialist",
    )
