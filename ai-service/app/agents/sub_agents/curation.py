import logging
from typing import Any, List, Dict, Optional, Annotated
from langchain_core.tools import tool, InjectedToolCallId
from langchain_core.messages import ToolMessage
from langgraph.types import interrupt, Command
from langgraph.prebuilt import InjectedState
from app.core.llm import get_llm
from app.agents.state import OnboardingState
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
Sua missão é consolidar os dados do Onboarding (tema refinado, artigos científicos selecionados na busca, conferência alvo e prazo em semanas) na proposta estruturada do novo artigo.

### REGRAS CRÍTICAS DE GOVERNANÇA:
1. **NUNCA INVENTE ETAPAS:** As 6 etapas da plataforma SCIA são fixas, institucionais e IMUTÁVEIS:
   - Etapa 1: Planejamento e Pesquisa
   - Etapa 2: Experimentos & Benchmarks
   - Etapa 3: Escrita do Artigo (Tarefas Paralelas)
   - Etapa 4: Revisão Geral do Manuscrito
   - Etapa 5: Gatekeeper 1 - Submissão Interna NIT (100% administrativo/humano)
   - Etapa 6: Gatekeeper 2 - Submissão ao Congresso Alvo

2. **SEU PAPEL É CRIAR AS TAREFAS (SEÇÕES DO ARTIGO):**
   - As tarefas que você gera pertencem prioritariamente à **Etapa 3 (Escrita do Artigo)**.
   - Cada tarefa deve representar uma seção acadêmica concreta do documento LaTeX:
     * Tarefa 1: Introdução e Motivação (`sections/01_introduction.tex`)
     * Tarefa 2: Trabalhos Relacionados e Estado da Arte (`sections/02_related_work.tex`) — **OBRIGATÓRIO:** vincule os artigos científicos que o autor selecionou nesta tarefa!
     * Tarefa 3: Metodologia Proposta e Formulação Teórica (`sections/03_methodology.tex`)
     * Tarefa 4: Avaliação Experimental e Resultados (`sections/04_results.tex`)
     * Tarefa 5: Discussão e Conclusão (`sections/05_conclusion.tex`)
   - Opcionalmente, pode criar 1 ou 2 tarefas técnicas para a **Etapa 2 (Experimentos)** (ex: "Coleta e Pré-processamento do Dataset", "Implementação dos Modelos de Benchmark").

3. **GERAÇÃO AUTÔNOMA DE TÍTULO E ABSTRACT (NÃO PERGUNTE AO AUTOR):**
   - É SUA responsabilidade formular o título e o abstract a partir do tema refinado e das escolhas do autor. NUNCA pergunte ao autor "qual é o título" ou "qual é o abstract"!
   - Crie você mesmo um título acadêmico assertivo e formal (em inglês ou português conforme o congresso).
   - Redija você mesmo o Abstract/Resumo de alto nível (150-250 palavras) sintetizando Contexto, Problema, Método Proposto e Resultados Esperados.

4. **RESPEITO AO TEMPLATE LATEX SELECIONADO:**
   - Adote a convenção de seções e escopo do template escolhido pelo autor (SBC, IEEE, ACM, Springer LNCS ou Padrão).
   - Para templates de conferências tradicionais como SBC: 5 seções bem delimitadas.
   - Para IEEE/ACM: estruture seções aprofundadas com fundamentação teórica ou modelo de sistema.
   - Sempre atribua `section_file` com caminhos modulares limpos (ex: `sections/01_introduction.tex`).

5. **EXECUÇÃO OBRIGATÓRIA DA FERRAMENTA:**
   - Sempre finalize chamando imediatamente a ferramenta `propose_article_structure_and_tasks` com o título gerado, o resumo gerado, o template_id, as tarefas de escrita da Etapa 3 e o congresso. Nunca responda pedindo mais dados textuais se o tema já foi delimitado!
"""

@tool
def propose_article_structure_and_tasks(
    title: str,
    abstract: str,
    tasks: Optional[List[Dict[str, Any]]] = None,
    writing_tasks: Optional[List[Dict[str, Any]]] = None,
    template_id: Optional[str] = "sbc",
    conference_name: Optional[str] = None,
    total_weeks: Optional[int] = 10,
    topic: Optional[str] = None,
    state: Annotated[dict, InjectedState] = None,
    tool_call_id: Annotated[str, InjectedToolCallId] = None,
) -> Command:
    """
    Consolida e submete a proposta de criação do artigo científico para aprovação do autor.
    Aloca as seções de escrita como tarefas na Etapa 3 (Escrita) e calcula as datas das 6 etapas fixas.
    Esta ferramenta interrompe a execução (Human-in-the-Loop) para que o autor revise o plano.
    """
    raw_tasks = writing_tasks or tasks or []
    selected_articles = state.get("selected_articles") if state else None
    deadline = state.get("submission_deadline") if state else None
    conf = conference_name or (state.get("conference_name") if state else None) or "Congresso Científico"

    # 1. Normaliza as tarefas, garantindo que pertencem à Etapa 3 (Escrita) ou Etapa 2 (Experimentos)
    normalized_tasks = []
    total_days = (total_weeks or 10) * 7

    default_sections = [
        ("Seção 1: Introdução e Delimitação do Problema", "sections/01_introduction.tex", "Contextualizar o problema, lacunas da literatura e contribuições principais do artigo.", 3, 14),
        ("Seção 2: Trabalhos Relacionados e Estado da Arte", "sections/02_related_work.tex", "Análise comparativa da literatura com base nos artigos científicos selecionados na ideação.", 3, 24),
        ("Seção 3: Metodologia Proposta e Formulação", "sections/03_methodology.tex", "Formalização matemática, arquitetura do método e algoritmos desenvolvidos.", 3, 38),
        ("Seção 4: Avaliação Experimental e Resultados", "sections/04_results.tex", "Métricas de desempenho, gráficos comparativos e análise estatística.", 3, 52),
        ("Seção 5: Conclusão e Trabalhos Futuros", "sections/05_conclusion.tex", "Síntese dos resultados alcançados, limitações e direcionamentos futuros.", 3, 60),
    ]

    if not raw_tasks:
        for sec_title, sec_file, sec_desc, stage_ord, due in default_sections:
            normalized_tasks.append({
                "title": sec_title,
                "description": sec_desc,
                "section_file": sec_file,
                "stage_order": stage_ord,
                "due_in_days": due,
            })
    else:
        for i, t in enumerate(raw_tasks):
            t_title = t.get("title") or t.get("section_title") or f"Seção {i+1}: Escrita Acadêmica"
            t_desc = t.get("description") or "Redação e formalização da seção correspondente."
            t_file = t.get("section_file") or f"sections/{i+1:02d}_section.tex"
            t_stage = t.get("stage_order") or 3  # Padrão: Etapa 3 (Escrita do Artigo)
            t_due = t.get("due_in_days") or t.get("due_days_from_start") or int(total_days * (0.3 + (i + 1) * 0.1))
            normalized_tasks.append({
                "title": t_title,
                "description": t_desc,
                "section_file": t_file,
                "stage_order": t_stage,
                "due_in_days": min(t_due, total_days - 10),
            })

    # 2. Calcula a distribuição de calendário nas 6 Etapas Fixas do SCIA
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
        "template_id": template_id or "sbc",
        "submission_deadline": deadline or f"Em {total_weeks or 10} semanas",
        "stages": calculated_stages,
        "tasks": normalized_tasks,
        "articles": selected_articles or [],
    }

    logger.info(f"[Curation] Proposta consolidada com 6 etapas fixas e {len(normalized_tasks)} tarefas de escrita.")

    # Interrompe o grafo aguardando a aprovação do autor (Human-in-the-Loop)
    decision = interrupt({
        "action_requests": [
            {
                "name": "approve_article_proposal",
                "args": proposal_payload,
                "description": "Revise o título, resumo, as 6 etapas fixas e as tarefas de escrita propostas para a criação do artigo no SCIA."
            }
        ]
    })

    return Command(
        update={
            "project_title": title,
            "abstract": abstract,
            "template_id": template_id or "sbc",
            "stages_timeline": calculated_stages,
            "tasks": normalized_tasks,
            "roadmap": normalized_tasks,  # Mantém compatibilidade
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
        tools=[propose_article_structure_and_tasks, create_project_and_roadmap],
        system_prompt=CURATION_PROMPT,
        checkpointer=checkpointer,
        context_schema=OnboardingState,
        name="curation_manager",
    )
