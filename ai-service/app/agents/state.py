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
    due_in_days: int


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
    roadmap: Optional[List[TaskItem]]
    project_title: Optional[str]
    abstract: Optional[str]
    project_structure: Optional[Dict[str, str]]

    # Controle de Etapa e Flags
    current_step: str  # 'clarify', 'search', 'roadmap', 'confirm'
    has_searched: bool
