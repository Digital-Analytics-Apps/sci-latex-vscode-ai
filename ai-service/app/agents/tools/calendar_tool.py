import logging
import re
from datetime import date, datetime, timedelta
from typing import Any, Dict, List, Optional
from langchain_core.tools import tool

logger = logging.getLogger(__name__)

MONTH_MAP_PT = {
    "janeiro": 1, "jan": 1,
    "fevereiro": 2, "fev": 2,
    "março": 3, "marco": 3, "mar": 3,
    "abril": 4, "abr": 4,
    "maio": 5, "mai": 5,
    "junho": 6, "jun": 6,
    "julho": 7, "jul": 7,
    "agosto": 8, "ago": 8,
    "setembro": 9, "set": 9,
    "outubro": 10, "out": 10,
    "novembro": 11, "nov": 11,
    "dezembro": 12, "dez": 12,
}

MONTH_MAP_EN = {
    "january": 1, "february": 2, "march": 3, "april": 4, "may": 5, "june": 6,
    "july": 7, "august": 8, "september": 9, "october": 10, "november": 11, "december": 12,
}

OFFICIAL_STAGE_WEIGHTS = [
    {"order": 1, "title": "Planejamento e Pesquisa", "weight": 0.10, "is_gatekeeper": False},
    {"order": 2, "title": "Experimentos & Benchmarks", "weight": 0.25, "is_gatekeeper": False},
    {"order": 3, "title": "Escrita do Artigo", "weight": 0.40, "is_gatekeeper": False},
    {"order": 4, "title": "Revisão Geral do Manuscrito", "weight": 0.15, "is_gatekeeper": False},
    {"order": 5, "title": "Gatekeeper 1 - Submissão Interna NIT", "weight": 0.05, "is_gatekeeper": True, "gatekeeper_type": "NIT"},
    {"order": 6, "title": "Gatekeeper 2 - Submissão ao Congresso", "weight": 0.05, "is_gatekeeper": True, "gatekeeper_type": "TARGET_CONFERENCE"},
]


def parse_target_date(input_text: str, current_date: date) -> Optional[date]:
    """
    Interpreta diferentes formatos de data e prazos fornecidos pelo autor.
    """
    raw = input_text.strip().lower()
    if not raw:
        return None

    # 1. Padrão relativo: 'X semanas' ou apenas 'X'
    weeks_match = re.search(r"(\d+)\s*(?:semanas?|weeks?)", raw)
    if weeks_match:
        weeks = int(weeks_match.group(1))
        return current_date + timedelta(days=weeks * 7)

    # 2. Padrão relativo: 'X meses'
    months_match = re.search(r"(\d+)\s*(?:meses|mês|months?)", raw)
    if months_match:
        months = int(months_match.group(1))
        return current_date + timedelta(days=months * 30)

    # 3. Padrão ISO: YYYY-MM-DD
    iso_match = re.search(r"(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})", raw)
    if iso_match:
        y, m, d = int(iso_match.group(1)), int(iso_match.group(2)), int(iso_match.group(3))
        try:
            return date(y, m, d)
        except ValueError:
            pass

    # 4. Padrão Brasileiro: DD/MM/YYYY ou DD-MM-YYYY
    br_match = re.search(r"(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})", raw)
    if br_match:
        d, m, y = int(br_match.group(1)), int(br_match.group(2)), int(br_match.group(3))
        try:
            return date(y, m, d)
        except ValueError:
            pass

    # 5. Padrão Textual: '15 de julho de 2027' ou '15 de julho 2027'
    text_match = re.search(r"(\d{1,2})\s*(?:de)?\s*([a-záéíóúç]+)\s*(?:de)?\s*(\d{4})", raw)
    if text_match:
        d = int(text_match.group(1))
        m_name = text_match.group(2)
        y = int(text_match.group(3))
        m = MONTH_MAP_PT.get(m_name) or MONTH_MAP_EN.get(m_name)
        if m:
            try:
                return date(y, m, d)
            except ValueError:
                pass

    # 6. Padrão Mês e Ano: 'maio de 2027' ou 'novembro 2027'
    month_year_match = re.search(r"([a-záéíóúç]+)\s*(?:de)?\s*(\d{4})", raw)
    if month_year_match:
        m_name = month_year_match.group(1)
        y = int(month_year_match.group(2))
        m = MONTH_MAP_PT.get(m_name) or MONTH_MAP_EN.get(m_name)
        if m:
            # Assume o último dia do mês ou dia 15 como estimativa do evento
            return date(y, m, 15)

    # 7. Apenas um número inteiro isolado (assume semanas)
    if raw.isdigit():
        weeks = int(raw)
        return current_date + timedelta(days=weeks * 7)

    return None


@tool
def calculate_deadline_and_stages(target_date_or_weeks: str) -> Dict[str, Any]:
    """
    Calcula com precisão matemática de calendário o intervalo entre a data atual de hoje
    e a data do congresso ou prazo informado pelo autor.
    Distribui as 6 etapas institucionais do SCIA proporcionalmente no calendário.

    Exemplos de entrada suportados:
    - '15/07/2027' ou '2027-07-15'
    - '15 de julho de 2027' ou 'maio de 2027'
    - '12 semanas' ou '6 meses'
    """
    today = date.today()
    parsed_date = parse_target_date(target_date_or_weeks, today)

    if not parsed_date:
        return {
            "status": "ERROR",
            "message": f"Não foi possível interpretar a data '{target_date_or_weeks}'. Por favor, forneça no formato DD/MM/AAAA ou informe o prazo em semanas.",
            "current_date": today.isoformat(),
        }

    total_days = (parsed_date - today).days

    if total_days <= 0:
        return {
            "status": "INVALID_DATE",
            "message": f"A data informada ({parsed_date.strftime('%d/%m/%Y')}) já passou ou é hoje. A data de submissão precisa estar no futuro.",
            "current_date": today.isoformat(),
            "target_date": parsed_date.isoformat(),
        }

    total_weeks = max(1, round(total_days / 7))

    # Determina a viabilidade
    if total_weeks < 3:
        feasibility = "CRÍTICO (Muito apertado para escrita acadêmica e revisão)"
    elif total_weeks < 8:
        feasibility = "MODERADO (Requer dedicação contínua da equipe)"
    else:
        feasibility = "CONFORTÁVEL (Tempo adequado para pesquisa, escrita e validação)"

    # Calcula as 6 etapas institucionais
    stages_breakdown = []
    current_stage_start = today

    for stg in OFFICIAL_STAGE_WEIGHTS:
        stage_days = max(1, int(total_days * stg["weight"]))
        stage_end = current_stage_start + timedelta(days=stage_days)

        stages_breakdown.append({
            "order": stg["order"],
            "title": stg["title"],
            "planned_days": stage_days,
            "start_date": current_stage_start.strftime("%d/%m/%Y"),
            "end_date": stage_end.strftime("%d/%m/%Y"),
            "start_iso": current_stage_start.isoformat(),
            "end_iso": stage_end.isoformat(),
            "is_gatekeeper": stg["is_gatekeeper"],
            "gatekeeper_type": stg.get("gatekeeper_type"),
        })
        current_stage_start = stage_end

    summary = (
        f"Hoje é {today.strftime('%d/%m/%Y')}. Faltam exatamente {total_days} dias "
        f"(aprox. {total_weeks} semanas) até o prazo em {parsed_date.strftime('%d/%m/%Y')}. "
        f"Viabilidade estimada: {feasibility}."
    )

    return {
        "status": "SUCCESS",
        "current_date": today.isoformat(),
        "current_date_formatted": today.strftime("%d/%m/%Y"),
        "target_date": parsed_date.isoformat(),
        "target_date_formatted": parsed_date.strftime("%d/%m/%Y"),
        "total_days": total_days,
        "total_weeks": total_weeks,
        "feasibility": feasibility,
        "summary": summary,
        "stages_breakdown": stages_breakdown,
    }
