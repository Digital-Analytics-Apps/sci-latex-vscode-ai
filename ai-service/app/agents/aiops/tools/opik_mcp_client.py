import os
import logging
from typing import Optional, Dict, Any
from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client
from langchain_core.tools import tool
from app.core.config import settings

logger = logging.getLogger(__name__)

OPIK_URL = os.environ.get(
    "OPIK_URL_OVERRIDE",
    settings.OPIK_URL_OVERRIDE or "http://localhost:5174/api",
)
if not OPIK_URL.endswith("/"):
    # Garante barra no final para o opik-mcp
    OPIK_URL = f"{OPIK_URL}/"

def get_server_parameters() -> StdioServerParameters:
    user_home = os.path.expanduser("~")
    local_bin = os.path.join(user_home, ".local", "bin")
    current_path = os.environ.get("PATH", "")
    full_path = f"{local_bin}:{current_path}"

    return StdioServerParameters(
        command="uvx",
        args=["opik-mcp"],
        env={
            **os.environ,
            "OPIK_URL": OPIK_URL,
            "OPIK_WORKSPACE": os.environ.get("OPIK_WORKSPACE", "default"),
            "PATH": full_path,
        },
    )

async def _call_opik_tool(tool_name: str, arguments: Dict[str, Any]) -> str:
    """Executa uma chamada JSON-RPC direta no Servidor MCP oficial do Opik via SDK."""
    params = get_server_parameters()
    try:
        async with stdio_client(params) as (read_stream, write_stream):
            async with ClientSession(read_stream, write_stream) as session:
                await session.initialize()
                result = await session.call_tool(tool_name, arguments)
                if not result.content:
                    return f"Servidor Opik MCP retornou resposta vazia para {tool_name}."
                
                texts = [c.text for c in result.content if hasattr(c, "text")]
                return "\n".join(texts)
    except Exception as exc:
        logger.error(f"[Opik MCP] Erro ao executar ferramenta {tool_name}: {exc}")
        return f"Falha na comunicação com o Servidor Opik MCP ({tool_name}): {str(exc)}"


@tool
async def opik_list_entities(
    entity_type: str,
    project_name: Optional[str] = "scia-academic-copilot",
    since: Optional[str] = None,
) -> str:
    """Consulta entidades do Opik (traces, spans, projects, agent_insights_issue) via Servidor MCP oficial.
    
    Args:
        entity_type: Tipo de entidade ('project', 'trace', 'span', 'agent_insights_issue', 'experiment').
        project_name: Nome do projeto no Opik (padrão: 'scia-academic-copilot').
        since: Janela temporal (ex: '7d', '24h', '30m').
    """
    args: Dict[str, Any] = {"entity_type": entity_type}
    if project_name and entity_type != "project":
        args["project_name"] = project_name
    if since:
        args["since"] = since
    
    return await _call_opik_tool("list", args)


@tool
async def opik_read_entity(
    entity_type: str,
    entity_id: str,
    project_name: Optional[str] = "scia-academic-copilot",
) -> str:
    """Lê detalhes completos de um trace, span ou issue de diagnóstico via Servidor MCP oficial do Opik.
    
    Args:
        entity_type: Tipo da entidade ('trace', 'span', 'agent_insights_issue', 'project').
        entity_id: ID (UUID) da entidade ou URI opik://.
        project_name: Nome do projeto associado.
    """
    args: Dict[str, Any] = {
        "entity_type": entity_type,
        "id": entity_id,
    }
    if project_name:
        args["project_name"] = project_name
        
    return await _call_opik_tool("read", args)


@tool
async def opik_read_skill(skill_name: str) -> str:
    """Carrega as instruções oficiais de uma Skill do Opik diretamente do Servidor MCP.
    
    Args:
        skill_name: Nome da skill (ex: 'opik-diagnose', 'opik-explain', 'opik-compare', 'opik-evaluate').
    """
    return await _call_opik_tool("read_skill", {"skill_name": skill_name})
