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
    @staticmethod
    def _extract_text(content: Any) -> str:
        if isinstance(content, str):
            return content
        if isinstance(content, list):
            parts = []
            for p in content:
                if isinstance(p, str):
                    parts.append(p)
                elif isinstance(p, dict) and "text" in p:
                    parts.append(p["text"])
            return "".join(parts)
        if isinstance(content, dict) and "text" in content:
            return content["text"]
        return ""

    async def process_stream(
        self, graph_stream: AsyncGenerator[Dict[str, Any], None]
    ) -> AsyncGenerator[str, None]:
        """
        Consome `graph.astream(...)` e produz chunks formatados em SSE (data: {...}\n\n).
        """
        async for chunk in graph_stream:
            for node_name, state_update in chunk.items():
                if node_name == "__interrupt__":
                    interrupts_data = []
                    items = state_update if isinstance(state_update, (list, tuple)) else [state_update]
                    for item in items:
                        if hasattr(item, "value"):
                            interrupts_data.append({"value": item.value, "id": getattr(item, "id", None)})
                        elif isinstance(item, dict):
                            interrupts_data.append(item)
                        else:
                            interrupts_data.append(str(item))

                    payload = {
                        "type": "interrupt",
                        "node": node_name,
                        "data": interrupts_data,
                    }
                    yield f"data: {json.dumps(payload, ensure_ascii=False, default=str)}\n\n"
                    continue

                if not isinstance(state_update, dict):
                    continue

                # Extrai mensagens
                messages = state_update.get("messages", [])
                if not isinstance(messages, list):
                    messages = [messages]

                from langchain_core.messages import ToolMessage

                for msg in messages:
                    # ToolMessages são retornos internos para o LLM, não devem duplicar no chat do usuário
                    if isinstance(msg, ToolMessage):
                        continue

                    raw_content = getattr(msg, "content", "")
                    content = self._extract_text(raw_content)
                    if content:
                        agent_key = getattr(msg, "name", None) or node_name
                        if agent_key in ("model", "agent"):
                            agent_key = "supervisor_agent"
                        display_name = self.AGENT_DISPLAY_NAMES.get(agent_key, "Supervisor")
                        payload = {
                            "type": "token",
                            "agent": display_name,
                            "content": content,
                        }
                        yield f"data: {json.dumps(payload, ensure_ascii=False, default=str)}\n\n"

                # Extrai atualizações de estado relevantes
                if "suggested_articles" in state_update:
                    payload = {
                        "type": "articles_found",
                        "articles": state_update["suggested_articles"],
                    }
                    yield f"data: {json.dumps(payload, ensure_ascii=False, default=str)}\n\n"

                if "roadmap" in state_update or "tasks" in state_update:
                    payload = {
                        "type": "roadmap_generated",
                        "title": state_update.get("project_title"),
                        "abstract": state_update.get("abstract"),
                        "stages": state_update.get("stages_timeline", []),
                        "tasks": state_update.get("tasks", state_update.get("roadmap", [])),
                        "roadmap": state_update.get("roadmap", state_update.get("tasks", [])),
                    }
                    yield f"data: {json.dumps(payload, ensure_ascii=False, default=str)}\n\n"
