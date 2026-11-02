import pytest
from datetime import date
from app.agents.tools.calendar_tool import (
    calculate_deadline_and_stages,
    parse_target_date,
)


def test_parse_target_date_formats():
    anchor = date(2026, 11, 2)

    # 1. Semanas
    assert parse_target_date("10 semanas", anchor) == date(2027, 1, 11)
    assert parse_target_date("12 weeks", anchor) == date(2027, 1, 25)

    # 2. ISO
    assert parse_target_date("2027-05-20", anchor) == date(2027, 5, 20)

    # 3. Brasileiro
    assert parse_target_date("15/07/2027", anchor) == date(2027, 7, 15)
    assert parse_target_date("30-08-2027", anchor) == date(2027, 8, 30)

    # 4. Textual em português
    assert parse_target_date("15 de julho de 2027", anchor) == date(2027, 7, 15)
    assert parse_target_date("10 de novembro de 2027", anchor) == date(2027, 11, 10)

    # 5. Mês e ano
    assert parse_target_date("maio de 2027", anchor) == date(2027, 5, 15)


def test_calculate_deadline_and_stages_success():
    res = calculate_deadline_and_stages.invoke({"target_date_or_weeks": "15/07/2027"})
    assert res["status"] == "SUCCESS"
    assert res["total_days"] > 0
    assert res["total_weeks"] > 0
    assert len(res["stages_breakdown"]) == 6

    # Verifica as 6 etapas na ordem
    orders = [s["order"] for s in res["stages_breakdown"]]
    assert orders == [1, 2, 3, 4, 5, 6]


def test_calculate_deadline_and_stages_past_date():
    res = calculate_deadline_and_stages.invoke({"target_date_or_weeks": "01/01/2020"})
    assert res["status"] == "INVALID_DATE"
