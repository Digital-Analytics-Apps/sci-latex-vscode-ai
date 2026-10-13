from typing import Any
from app.agents.state import OnboardingState
from app.agents.sub_agents.curation import get_curation_agent
from app.agents.sub_agents.idea_refiner import get_idea_refiner_agent
from app.agents.sub_agents.search_specialist import get_search_specialist_agent
from app.core.llm import get_llm
from deepagents import create_deep_agent

SUPERVISOR_PROMPT = """Você é o **Supervisor Geral** do SCIA, o orquestrador do fluxo guiado de criação de artigos.
Sua missão é atuar como um mentor ativo e acolhedor, conduzindo o autor pelos 4 estágios essenciais:

### OS 4 ESTÁGIOS OBRIGATÓRIOS DO ONBOARDING:
1. **Estágio 1 (Ideação)**: Delegue para o Guia de Exploração (`idea_refiner_subagent`) para refinar o tema e o problema de pesquisa.
2. **Estágio 2 (Busca Científica)**: Delegue para o Especialista de Busca (`search_specialist_subagent`) para localizar artigos relevantes e exibir a seleção para o autor.
3. **Estágio 3 (Conferência e Prazo)**: Colete com o autor o congresso em vista e a data limite de submissão.
4. **Estágio 4 (Roadmap e Proposta Final)**: Delegue para o Gerente de Curadoria (`curation_manager`) para consolidar o cronograma de etapas preliminares e gerar a proposta de criação do projeto.

### REGRAS CRÍTICAS:
- **COMUNICAÇÃO CLARA**: Nunca responda com silêncio ou mensagens em branco.
- **NOMES AMIGÁVEIS**: Apresente sempre os especialistas pelos seus nomes amigáveis:
  * "Guia de Exploração" (Refinamento de Ideia)
  * "Especialista de Busca" (Pesquisa de Artigos)
  * "Gerente de Curadoria" (Planejamento de Etapas)
- **TRANSIÇÃO ORDENADA**: Avance de estágio somente quando os dados necessários estiverem confirmados pelo autor."""


def get_onboarding_supervisor(checkpointer=None, **kwargs):
    if isinstance(checkpointer, dict):
        checkpointer = None

    curation_spec = {
        "name": "curation_manager",
        "description": "Consolida os dados do Onboarding em um Roadmap de etapas e proposta formal de projeto.",
        "runnable": get_curation_agent(checkpointer=checkpointer),
    }

    idea_refiner_spec = {
        "name": "idea_refiner_subagent",
        "description": "Auxilia o autor a amadurecer a ideia inicial e delimitar o problema de pesquisa.",
        "runnable": get_idea_refiner_agent(checkpointer=checkpointer),
    }

    search_specialist_spec = {
        "name": "search_specialist_subagent",
        "description": "Executa buscas bibliográficas em bases acadêmicas e apresenta artigos para seleção.",
        "runnable": get_search_specialist_agent(checkpointer=checkpointer),
    }

    supervisor = create_deep_agent(
        model=get_llm(),
        system_prompt=SUPERVISOR_PROMPT,
        subagents=[
            idea_refiner_spec,
            search_specialist_spec,
            curation_spec,
        ],
        checkpointer=checkpointer,
        context_schema=OnboardingState,
        name="supervisor_agent",
    )
    return supervisor
