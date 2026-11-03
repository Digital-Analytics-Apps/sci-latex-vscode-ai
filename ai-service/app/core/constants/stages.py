"""
As 6 Etapas Institucionais Fixas e Imutáveis da Plataforma SCIA (ADR-008).
Única Fonte da Verdade para o AI-Service, idêntica a backend/src/constants/stages.constants.ts.
"""

OFFICIAL_SCIA_STAGES = [
    {
        "order": 1,
        "title": "Planejamento e Pesquisa",
        "description": "Levantamento bibliográfico e estruturação TeX",
        "weight": 0.10,
        "is_gatekeeper": False,
        "gatekeeper_type": None,
    },
    {
        "order": 2,
        "title": "Desenvolvimento e Experimentos",
        "description": "Coleta de dados e benchmarks experimentais",
        "weight": 0.25,
        "is_gatekeeper": False,
        "gatekeeper_type": None,
    },
    {
        "order": 3,
        "title": "Escrita do Artigo",
        "description": "Redação das seções em tarefas paralelas",
        "weight": 0.40,
        "is_gatekeeper": False,
        "gatekeeper_type": None,
    },
    {
        "order": 4,
        "title": "Revisão Técnica e Científica",
        "description": "Revisão geral do manuscrito consolidado",
        "weight": 0.15,
        "is_gatekeeper": False,
        "gatekeeper_type": None,
    },
    {
        "order": 5,
        "title": "Parecer do NIT (Gatekeeper 1)",
        "description": "Validação de propriedade intelectual e patentes",
        "weight": 0.05,
        "is_gatekeeper": True,
        "gatekeeper_type": "NIT",
    },
    {
        "order": 6,
        "title": "Submissão ao Congresso Alvo (Gatekeeper 2)",
        "description": "Submissão externa do artigo compilado",
        "weight": 0.05,
        "is_gatekeeper": True,
        "gatekeeper_type": "TARGET_CONFERENCE",
    },
]
