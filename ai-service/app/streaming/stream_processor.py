import json
import logging
from typing import Any, AsyncGenerator, Dict

logger = logging.getLogger(__name__)


class StreamProcessor:
    """
    Processador enxuto de streaming que converte chunks brutos do LangGraph
    em eventos estruturados Server-Sent Events (SSE) para o frontend React.
    """

    AGENT_DISPLAY_NAMES = {
        "supervisor_agent": "Supervisor",
        "idea_refiner_subagent": "Guia de Exploração",
        "search_specialist_subagent": "Especialista de Busca",
        "curation_manager": "Gerente de Curadoria",
    }

    async def process_stream(
        self, graph_stream: AsyncGenerator[Dict[str, Any], None]
    ) -> AsyncGenerator[str, None]:
        """
        Consome `graph.astream(...)` e produz chunks formatados em SSE (data: {...}\n\n).
        """
        async for chunk in graph_stream:
            for node_name, state_update in chunk.items():
                if node_name == "__interrupt__":
                    payload = {
                        "type": "interrupt",
                        "node": node_name,
                        "data": state_update,
                    }
                    yield f"data: {json.dumps(payload, ensure_ascii=False)}\n\n"
                    continue

                if not isinstance(state_update, dict):
                    continue

                # Extrai mensagens
                messages = state_update.get("messages", [])
                if not isinstance(messages, list):
                    messages = [messages]

                for msg in messages:
                    content = getattr(msg, "content", "")
                    if content and isinstance(content, str):
                        payload = {
                            "type": "token",
                            "agent": self.AGENT_DISPLAY_NAMES.get(node_name, node_name),
                            "content": content,
                        }
                        yield f"data: {json.dumps(payload, ensure_ascii=False)}\n\n"

                # Extrai atualizações de estado relevantes
                if "suggested_articles" in state_update:
                    payload = {
                        "type": "articles_found",
                        "articles": state_update["suggested_articles"],
                    }
                    yield f"data: {json.dumps(payload, ensure_ascii=False)}\n\n"

                if "roadmap" in state_update:
                    payload = {
                        "type": "roadmap_generated",
                        "roadmap": state_update["roadmap"],
                        "title": state_update.get("project_title"),
                        "abstract": state_update.get("abstract"),
                    }
                    yield f"data: {json.dumps(payload, ensure_ascii=False)}\n\n"
