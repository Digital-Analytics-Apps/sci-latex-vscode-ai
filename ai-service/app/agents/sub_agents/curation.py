import logging
from typing import Any, List, Dict, Optional, Annotated
from langchain_core.tools import tool
from langgraph.types import interrupt, Command
from langgraph.prebuilt import InjectedState
from app.core.llm import get_llm
from app.agents.state import OnboardingState
from deepagents import create_deep_agent

logger = logging.getLogger(__name__)

CURATION_PROMPT = """Você é o **Gerente de Curadoria e Planejamento** do SCIA.
Sua missão é consolidar os dados do Onboarding (tema refinado, artigos selecionados, conferência e prazo em semanas) em uma proposta formal de projeto e cronograma de trabalho.

### DIRETRIZES:
1. **Consolidação Técnica**: Formule um título acadêmico assertivo e um resumo executivo sintetizando objetivo, método e escopo.
2. **Roadmap de Etapas**: Distribua as tarefas proporcionalmente às semanas disponíveis até o prazo de submissão.
3. **Solicitação de Aprovação**: Chame a ferramenta `create_project_and_roadmap` para submeter a proposta para a aprovação final do autor.
"""


@tool
def create_project_and_roadmap(
    title: str,
    abstract: str,
    tasks: List[Dict[str, Any]],
    state: Annotated[dict, InjectedState] = None,
    topic: Optional[str] = None,
) -> Command:
    """
    Consolida e submete a proposta de projeto e o cronograma para aprovação do autor.
    Esta ferramenta interrompe a execução para que o autor revise o cronograma antes da criação definitiva.
    """
    user_id = state.get("user_id") if state else None
    selected_articles = state.get("selected_articles") if state else None
    deadline = state.get("submission_deadline") if state else None
    conference = state.get("conference_name") if state else None

    normalized_tasks = []
    for i, t in enumerate(tasks or []):
        desc = t.get("description") or f"Atividade da semana {i+1}"
        due = t.get("due_in_days") or (i + 1) * 7
        normalized_tasks.append({
            "title": t.get("title") or f"Etapa {i+1}",
            "description": desc,
            "due_in_days": due,
        })

    proposal_payload = {
        "title": title,
        "abstract": abstract,
        "tasks": normalized_tasks,
        "topic": topic or title,
        "conference": conference,
        "deadline": deadline,
        "articles": selected_articles or [],
    }

    logger.info(f"[Curation] Proposta montada: '{title}' ({len(normalized_tasks)} tarefas)")

    # Interrompe o grafo para aguardar o aceite do autor na interface
    decision = interrupt({
        "action_requests": [
            {
                "name": "approve_project_creation",
                "args": proposal_payload,
                "description": "Revise o título, resumo e etapas propostas para a criação do projeto no SCIA."
            }
        ]
    })

    return Command(
        update={
            "project_title": title,
            "abstract": abstract,
            "roadmap": normalized_tasks,
            "current_step": "confirm",
        }
    )


def get_curation_agent(checkpointer=None):
    return create_deep_agent(
        model=get_llm(),
        tools=[create_project_and_roadmap],
        system_prompt=CURATION_PROMPT,
        checkpointer=checkpointer,
        context_schema=OnboardingState,
        name="curation_manager",
    )
