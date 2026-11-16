from functools import lru_cache
import logging
from pathlib import Path
from typing import Dict, List, Optional
from langchain_core.tools import tool

logger = logging.getLogger(__name__)

SKILLS_DIR = Path(__file__).resolve().parent

@lru_cache(maxsize=64)
def load_aiops_skill(skill_name: str, topic: Optional[str] = None) -> str:
    """Carrega as instruções, playbooks ou referências de uma Skill de SRE/AIOps embutida no microsserviço.
    
    Args:
        skill_name: Nome do diretório da skill (ex: 'kubernetes-operations', 'postgresql-operations', 'opik-diagnose').
        topic: Subtópico opcional (ex: 'diagnostics/connection-exhaustion.md', 'references/connections-and-pgbouncer.md').
    """
    skill_dir = SKILLS_DIR / skill_name
    if not skill_dir.exists():
        logger.warning(f"[Skills Loader] Skill '{skill_name}' não encontrada em {skill_dir}")
        return f"Instruções da skill '{skill_name}' não encontradas no pacote da aplicação."

    target_file = (skill_dir / topic) if topic else (skill_dir / "SKILL.md")
    if not target_file.exists():
        logger.warning(f"[Skills Loader] Arquivo ou tópico '{topic}' não encontrado na skill '{skill_name}' ({target_file})")
        return f"Tópico '{topic}' não encontrado na skill '{skill_name}'."

    try:
        content = target_file.read_text(encoding="utf-8")
        # Remove frontmatter YAML se presente para manter o prompt limpo
        if content.startswith("---"):
            parts = content.split("---", 2)
            if len(parts) >= 3:
                content = parts[2].strip()
        return content
    except Exception as exc:
        logger.error(f"[Skills Loader] Erro ao ler '{target_file}': {exc}")
        return f"Falha ao carregar conteúdo de '{skill_name}/{topic or 'SKILL.md'}': {str(exc)}"


def list_available_aiops_skills() -> List[str]:
    """Retorna a lista de nomes das skills de AIOps disponíveis no pacote."""
    if not SKILLS_DIR.exists():
        return []
    return [d.name for d in SKILLS_DIR.iterdir() if d.is_dir() and (d / "SKILL.md").exists()]


@tool
def read_operational_skill(skill_name: str, topic: Optional[str] = None) -> str:
    """Consulta o procedimento operacional oficial, árvore de decisão ou playbook de uma Skill de SRE/AIOps.
    
    Args:
        skill_name: Nome da skill para consultar (ex: 'postgresql-operations', 'kubernetes-operations', 'opik-diagnose').
        topic: Arquivo ou subtópico opcional (ex: 'diagnostics/connection-exhaustion.md', 'references/connections-and-pgbouncer.md').
    """
    return load_aiops_skill(skill_name, topic)
