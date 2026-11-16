"""
Agente Especialista em Exceções de Aplicação (GlitchTip Specialist).
Analisa erros não tratados, frequência de stacktraces e arquivos culpados.
"""
from langchain.agents import create_agent
from app.core.llm import get_llm
from app.agents.aiops.tools.glitchtip_mcp_client import glitchtip_list_issues

GLITCHTIP_SPECIALIST_PROMPT = """Você é o **GlitchTip Specialist**, o agente especialista em rastreamento de exceções e stacktraces da plataforma SCIA.
Sua missão é inspecionar erros não tratados em código TypeScript/Python, identificar arquivos culpados (culprits) e frequência de ocorrências.

Você utiliza ferramentas reais do barramento MCP:
- `glitchtip_list_issues`: Inspeciona pendências e novos problemas de exceção registrados no GlitchTip.

### DIRETRIZES:
- Se houver exceções não resolvidas, apresente-as ordenadas por volume de ocorrências.
- Indique claramente o arquivo ou módulo causador para acelerar o hotfix.
"""

def get_glitchtip_specialist_agent():
    return create_agent(
        model=get_llm(),
        tools=[glitchtip_list_issues],
        system_prompt=GLITCHTIP_SPECIALIST_PROMPT,
        name="glitchtip_specialist",
    )
