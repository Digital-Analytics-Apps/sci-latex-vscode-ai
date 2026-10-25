from typing import Annotated, Any, Dict, List, Optional, TypedDict
from langchain_core.messages import BaseMessage
from langgraph.graph.message import add_messages


class Article(TypedDict, total=False):
    title: str
    authors: List[str]
    year: Optional[int]
    url: str
    snippet: str
    citation_count: int
    doi: Optional[str]
    venue: Optional[str]


class TaskItem(TypedDict, total=False):
    title: str
    description: str
    section_file: Optional[str]  # Ex: "sections/03_methodology.tex"
    stage_order: int             # Etapa a que pertence (3 = Escrita do Artigo, 2 = Experimentos)
    due_in_days: int


class FixedStage(TypedDict, total=False):
    order: int
    title: str
    planned_days: int
    is_gatekeeper: bool
    gatekeeper_type: Optional[str]
class OnboardingState(TypedDict, total=False):
    # Contexto e Identificação
    conversation_id: str
    user_id: Optional[str]
    project_id: Optional[str]

    # Histórico de Mensagens do Chat
    messages: Annotated[List[BaseMessage], add_messages]

    # Metadados de Pesquisa Delimitados
    topic: Optional[str]
    refined_topic: Optional[str]
    problem_statement: Optional[str]
    conference_name: Optional[str]
    submission_deadline: Optional[str]
    template_id: Optional[str]

    # Dados de Busca Bibliográfica
    suggested_articles: Optional[List[Article]]
    selected_articles: Optional[List[Article]]

    # Proposta Estruturada Final
    # Proposta Estruturada Final (Régua Fixa + Tarefas de Escrita)
    stages_timeline: Optional[List[FixedStage]]
    tasks: Optional[List[TaskItem]]
    roadmap: Optional[List[TaskItem]]  # Compatibilidade com visualizadores anteriores
    project_title: Optional[str]
    abstract: Optional[str]
    project_structure: Optional[Dict[str, str]]
    # Controle de Etapa e Flags
    current_step: str  # 'clarify', 'search', 'roadmap', 'confirm'
    has_searched: bool
