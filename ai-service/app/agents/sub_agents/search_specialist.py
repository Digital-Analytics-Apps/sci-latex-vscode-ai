import logging
from typing import List, Dict, Any, Annotated
from deepagents import create_deep_agent
from app.core.llm import get_llm
from app.agents.state import OnboardingState
from app.agents.tools.academic_search import execute_academic_search
from app.agents.tools.tavily_search import execute_web_search
from langchain_core.tools import tool, InjectedToolCallId
from langchain_core.messages import ToolMessage
from langgraph.types import Command, interrupt

logger = logging.getLogger(__name__)


@tool
def present_articles_to_user_for_selection(
    articles: List[Dict[str, Any]], 
    tool_call_id: Annotated[str, InjectedToolCallId] = None
):
    """
    ENTREGA OBRIGATÓRIA: Exibe os artigos científicos encontrados para que o autor selecione quais deseja incluir.
    Esta ferramenta interrompe temporariamente a execução (Human-in-the-Loop) e aguarda a decisão do autor.
    """
    selection_request = {
        "action_requests": [
            {
                "name": "present_articles_to_user_for_selection",
                "args": {"articles": articles},
                "description": "Selecione os artigos que deseja utilizar como base referencial no seu projeto."
            }
        ]
    }
    
    # Interrompe o grafo e aguarda resposta do frontend
    decision = interrupt(selection_request)
    
    selected_articles = []
    if isinstance(decision, dict) and "decisions" in decision:
        for d in decision["decisions"]:
            if d.get("type") in ("approve", "selected"):
                selected_articles = d.get("args", {}).get("selected_articles", [])
    elif isinstance(decision, dict) and "selected_articles" in decision:
        selected_articles = decision.get("selected_articles", [])
    
    return Command(
        update={
            "suggested_articles": articles,
            "selected_articles": selected_articles,
            "messages": [
                ToolMessage(
                    content=f"O autor selecionou {len(selected_articles)} artigos com sucesso.",
                    tool_call_id=tool_call_id,
                )
            ]
        }
    )


SEARCH_SPECIALIST_PROMPT = """Você é o **Search Specialist (Especialista de Busca)** do SCIA.
Sua função é traduzir o tema delimitado em queries acadêmicas precisas em inglês e português.

### REGRAS:
1. **UMA BUSCA POR VEZ**: Nunca acione `execute_academic_search` mais de uma vez na mesma resposta.
2. **QUALIDADE SOBRE QUANTIDADE**: Extraia os 5 artigos mais relevantes e pertinentes ao tema proposto.
3. **EXIBIÇÃO OBRIGATÓRIA**: Sempre finalize chamando `present_articles_to_user_for_selection` com a lista de artigos encontrados para que o autor faça a seleção."""


def get_search_specialist_agent(checkpointer=None):
    return create_deep_agent(
        model=get_llm(),
        tools=[execute_academic_search, present_articles_to_user_for_selection],
        system_prompt=SEARCH_SPECIALIST_PROMPT,
        checkpointer=checkpointer,
        context_schema=OnboardingState,
        name="search_specialist_subagent",
    )
