import logging
from typing import Any, List, Dict, Optional, Annotated
from langchain_core.tools import tool, InjectedToolCallId
from langchain_core.messages import ToolMessage
from langgraph.types import interrupt, Command
from langgraph.prebuilt import InjectedState
from app.core.llm import get_llm
from app.agents.state import OnboardingState
from app.agents.tools.calendar_tool import calculate_deadline_and_stages
from deepagents import create_deep_agent

logger = logging.getLogger(__name__)

# As 6 Etapas Institucionais da Plataforma SCIA (ADR 008 - Imutáveis)
OFFICIAL_SCIA_STAGES = [
    {
        "order": 1,
        "title": "Planejamento e Pesquisa",
        "description": "Definição do tema, pergunta de pesquisa e revisão bibliográfica inicial.",
        "weight": 0.10,
        "is_gatekeeper": False,
    },
    {
        "order": 2,
        "title": "Experimentos & Benchmarks",
        "description": "Execução de experimentos, coleta de dados e preparação de gráficos e tabelas.",
        "weight": 0.25,
        "is_gatekeeper": False,
    },
    {
        "order": 3,
        "title": "Escrita do Artigo (Tarefas Paralelas)",
        "description": "Redação das seções acadêmicas do manuscrito LaTeX em tarefas paralelas.",
        "weight": 0.40,
        "is_gatekeeper": False,
    },
    {
        "order": 4,
        "title": "Revisão Geral do Manuscrito",
        "description": "Leitura consolidada pelo orientador e co-autores antes de gatekeepers institucionais.",
        "weight": 0.15,
        "is_gatekeeper": False,
    },
    {
        "order": 5,
        "title": "Gatekeeper 1 - Submissão Interna NIT",
        "description": "Acompanhamento administrativo e parecer institucional do Núcleo de Inovação.",
        "weight": 0.05,
        "is_gatekeeper": True,
        "gatekeeper_type": "NIT",
    },
    {
        "order": 6,
        "title": "Gatekeeper 2 - Submissão ao Congresso Alvo",
        "description": "Validação de versão final Camera-Ready e envio ao sistema do congresso.",
        "weight": 0.05,
        "is_gatekeeper": True,
        "gatekeeper_type": "TARGET_CONFERENCE",
    },
]

CURATION_PROMPT = """Você é o **Gerente de Curadoria e Estruturação de Artigos** da plataforma SCIA.
Sua missão é consolidar os dados do Onboarding (tema refinado, artigos científicos selecionados na busca, conferência alvo, prazo em semanas e template escolhido) na proposta estruturada do novo artigo.

### REGRAS CRÍTICAS DE GOVERNANÇA:
1. **AS 6 ETAPAS SÃO FIXAS E IMUTÁVEIS (ADR 008):**
   - Etapa 1: Planejamento e Pesquisa (10% do tempo)
   - Etapa 2: Experimentos & Benchmarks (25% do tempo)
   - Etapa 3: Escrita do Artigo (40% do tempo)
   - Etapa 4: Revisão Geral do Manuscrito (15% do tempo)
   - Etapa 5: Gatekeeper 1 - Submissão Interna NIT (5% do tempo)
   - Etapa 6: Gatekeeper 2 - Submissão ao Congresso Alvo (5% do tempo)

2. **CÁLCULO E SUGESTÃO DE DATAS DAS ETAPAS:**
   - Calcule e proponha a distribuição dos dias e prazos em cada uma das 6 etapas a partir do total de semanas informado pelo autor (ou data do congresso).
   - A IA NÃO deve criar nem sugerir tarefas/atividades (a criação e divisão de tarefas é 100% responsabilidade dos autores humanos).

3. **GERAÇÃO AUTÔNOMA DE TÍTULO E ABSTRACT (NÃO PERGUNTE AO AUTOR):**
   - Formule você mesmo um título acadêmico assertivo e formal (em inglês ou português conforme o congresso).
   - Redija você mesmo o Abstract/Resumo de alto nível (150-250 palavras) sintetizando Contexto, Problema, Método Proposto e Resultados Esperados.

4. **RESPEITO AO TEMPLATE DO MINIO:**
   - Registre o `template_id` escolhido (SBC, IEEE, ACM, Springer LNCS ou Padrão) para que a plataforma copie os arquivos originais do pacote do MinIO sem alteração de estrutura.

5. **EXECUÇÃO OBRIGATÓRIA DA FERRAMENTA:**
   - Finalize chamando imediatamente a ferramenta `propose_article_structure_and_tasks` com o título gerado, o resumo gerado, o template_id, a conferência e o cálculo das datas das 6 etapas."""
@tool
def propose_article_structure_and_tasks(
    title: str,
    abstract: str,
    template_id: Optional[str] = "tpl-system-sbc",
    conference_name: Optional[str] = None,
    coordinator_id: Optional[str] = None,
    manager_id: Optional[str] = None,
    coordinator_name: Optional[str] = None,
    manager_name: Optional[str] = None,
    reviewer_id: Optional[str] = None,
    reviewer_name: Optional[str] = None,
    total_weeks: Optional[int] = 10,
    topic: Optional[str] = None,
    tasks: Optional[List[Dict[str, Any]]] = None,
    state: Annotated[dict, InjectedState] = None,
    tool_call_id: Annotated[str, InjectedToolCallId] = None,
) -> Command:
    """
    Consolida e submete a proposta de criação do artigo científico para aprovação do autor.
    Calcula a distribuição de datas nas 6 etapas fixas institucionais e formata os metadados do projeto.
    Esta ferramenta interrompe a execução (Human-in-the-Loop) para que o autor revise o plano.
    """
    selected_articles = state.get("selected_articles") if state else None
    deadline = state.get("submission_deadline") if state else None
    conf = conference_name or (state.get("conference_name") if state else None) or "Congresso Científico"
    total_days = (total_weeks or 10) * 7

    # 1. Calcula a distribuição de calendário nas 6 Etapas Fixas do SCIA
    calculated_stages = []
    cumulative_days = 0
    for stg in OFFICIAL_SCIA_STAGES:
        stg_days = max(1, int(total_days * stg["weight"]))
        cumulative_days += stg_days
        calculated_stages.append({
            "order": stg["order"],
            "title": stg["title"],
            "description": stg["description"],
            "planned_days": stg_days,
            "cumulative_day": cumulative_days,
            "is_gatekeeper": stg["is_gatekeeper"],
            "gatekeeper_type": stg.get("gatekeeper_type"),
        })

    proposal_payload = {
        "title": title,
        "abstract": abstract,
        "topic": topic or title,
        "conference": conf,
        "template_id": template_id or "tpl-system-sbc",
        "coordinator_id": coordinator_id,
        "manager_id": manager_id,
        "coordinator_name": coordinator_name,
        "manager_name": manager_name,
        "reviewer_id": reviewer_id,
        "reviewer_name": reviewer_name,
        "submission_deadline": deadline or f"Em {total_weeks or 10} semanas",
        "stages": calculated_stages,
        "tasks": [],
        "articles": selected_articles or [],
    }

    logger.info("[Curation] Proposta consolidada com 6 etapas fixas (sem tarefas de IA).")

    # Interrompe o grafo aguardando a aprovação do autor (Human-in-the-Loop)
    decision = interrupt({
        "action_requests": [
            {
                "name": "approve_article_proposal",
                "args": proposal_payload,
                "description": "Revise o título, resumo e a distribuição de datas nas 6 etapas fixas do projeto no SCIA.",
            }
        ]
    })
    return Command(
        update={
            "project_title": title,
            "abstract": abstract,
            "template_id": template_id or "sbc",
            "stages_timeline": calculated_stages,
            "tasks": [],
            "roadmap": [],
            "current_step": "confirm",
            "messages": [
                ToolMessage(
                    content=f"Proposta do artigo '{title}' (template: {template_id or 'sbc'}) estruturada com sucesso nas 6 etapas fixas.",
                    tool_call_id=tool_call_id,
                )
            ],
        }
    )


# Alias para retrocompatibilidade
create_project_and_roadmap = propose_article_structure_and_tasks


def get_curation_agent(checkpointer=None):
    return create_deep_agent(
        model=get_llm(),
        tools=[
            propose_article_structure_and_tasks,
            create_project_and_roadmap,
            calculate_deadline_and_stages,
        ],
        checkpointer=checkpointer,
        context_schema=OnboardingState,
        name="curation_manager",
    )
