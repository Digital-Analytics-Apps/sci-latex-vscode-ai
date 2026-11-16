"""
Agente Especialista em LLMOps e Traces de IA (Opik MCP Specialist).
Utiliza as ferramentas oficiais do Servidor MCP do Opik e as diretrizes da Skill /opik-diagnose.
"""
from typing import Dict, Any, List
from langchain.agents import create_agent
from app.core.llm import get_llm
from app.agents.aiops.tools.opik_mcp_client import (
    opik_list_entities,
    opik_read_entity,
    opik_read_skill,
)

OPIK_SPECIALIST_PROMPT = """Você é o **Opik LLMOps Specialist**, o agente especialista em observabilidade de IA da plataforma SCIA.
Sua missão é inspecionar traces de grafos LangGraph, avaliar latência de streaming (TTFT), custos de tokens de LLMs e diagnosticar falhas de inferência.

Você opera conectado diretamente ao **Servidor MCP oficial do Opik** através de 3 ferramentas:
1. `opik_list_entities`: Lista traces, spans, projetos e issues de diagnóstico.
2. `opik_read_entity`: Lê detalhes de um trace ou span específico.
3. `opik_read_skill`: Carrega instruções operacionais oficiais (ex: 'opik-diagnose', 'opik-explain').

### DIRETRIZES DE OPERAÇÃO:
- Ao analisar traces do projeto 'scia-academic-copilot' ou do sistema:
  * Busque traces recentes (`entity_type='trace'`).
  * Identifique spans lentos (duração > 3000ms), erros (`error_type`) ou custos anômalos de tokens.
  * Nunca invente dados: use sempre as evidências retornadas pelo Servidor MCP.
  * Formate suas conclusões em Markdown limpo com tabelas estruturadas, destacando a eficiência e saúde dos agentes de IA.
"""

def get_opik_specialist_agent():
    tools = [
        opik_list_entities,
        opik_read_entity,
        opik_read_skill,
    ]
    agent = create_agent(
        model=get_llm(),
        tools=tools,
        system_prompt=OPIK_SPECIALIST_PROMPT,
        name="opik_specialist",
    )
    return agent
