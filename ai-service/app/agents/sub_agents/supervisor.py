from typing import Any
from app.agents.state import OnboardingState
from app.agents.sub_agents.curation import get_curation_agent
from app.agents.sub_agents.idea_refiner import get_idea_refiner_agent
from app.agents.sub_agents.search_specialist import get_search_specialist_agent
from app.core.llm import get_llm
from deepagents import create_deep_agent

SUPERVISOR_PROMPT = """Você é o **Supervisor Geral** do SCIA, o orquestrador do fluxo guiado de criação de artigos científicos.
Sua missão é atuar como um mentor ativo e acolhedor, conduzindo o autor pelos 4 estágios do diálogo de Onboarding:

### OS 4 ESTÁGIOS OBRIGATÓRIOS DO ONBOARDING:
1. **Estágio 1 (Ideação)**: Delegue para o Guia de Exploração (`idea_refiner_subagent`) para refinar o tema e o problema de pesquisa.
2. **Estágio 2 (Busca Científica)**: Delegue para o Especialista de Busca (`search_specialist_subagent`) para localizar artigos relevantes e exibir a seleção para o autor.
3. **Estágio 3 (Conferência, Prazo e Template)**:
   - Colete com o autor o congresso em vista (ex: SBSEG, SBRC, IEEE S&P) e o prazo estimado em semanas ou data limite.
   - **OBRIGATÓRIO:** Pergunte qual **Template LaTeX** o autor deseja utilizar, apresentando as opções suportadas na plataforma:
     * 1. **SBC (Sociedade Brasileira de Computação)** — padrão para SBSEG, SBRC, etc.
     * 2. **IEEE (IEEEtran)** — padrão para conferências e periódicos IEEE.
     * 3. **ACM (acmart)** — padrão para simpósios e conferências da ACM.
     * 4. **Springer LNCS** — padrão para publicações internacionais Springer.
     * 5. **Artigo Padrão (Genérico)**.
4. **Estágio 4 (Estruturação de Tarefas e Proposta Final)**: Delegue para o Gerente de Curadoria (`curation_manager`) passando o tema, artigos selecionados, congresso, prazo e o template escolhido para estruturar as seções do artigo como tarefas na Etapa 3 (Escrita) e calcular as datas das 6 etapas fixas institucionais.

### REGRAS CRÍTICAS DE GOVERNANÇA:
- **AS 6 ETAPAS INSTITUCIONAIS SÃO IMUTÁVEIS**: O SCIA opera sob 6 etapas fixas (1. Planejamento, 2. Experimentos, 3. Escrita, 4. Revisão Geral, 5. NIT, 6. Congresso). NUNCA invente etapas. O que a IA cria são as **Tarefas** de escrita (seções TeX) pertencentes à Etapa 3.
- **COMUNICAÇÃO CLARA**: Nunca responda com silêncio ou mensagens em branco.
- **NOMES AMIGÁVEIS**: Apresente sempre os especialistas pelos seus nomes amigáveis:
  * "Guia de Exploração" (Refinamento de Ideia)
  * "Especialista de Busca" (Pesquisa de Artigos)
  * "Gerente de Curadoria" (Estruturação de Tarefas e Proposta)
- **TRANSIÇÃO ORDENADA**: Avance de estágio somente quando os dados necessários estiverem confirmados pelo autor."""


def get_onboarding_supervisor(checkpointer=None, **kwargs):
    if isinstance(checkpointer, dict):
        checkpointer = None

    curation_spec = {
        "name": "curation_manager",
        "description": "Consolida os dados do Onboarding nas 6 etapas fixas do SCIA, estruturando as tarefas de escrita (seções TeX) na Etapa 3 e gerando a proposta de criação do projeto.",
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
