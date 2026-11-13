from fastapi import APIRouter
from app.api.v1.endpoints import chat, runs, paper_analysis

api_router = APIRouter()

# Rotas de streaming do chat interativo
api_router.include_router(chat.router, tags=["chat"])

# Rotas de execução assíncrona M2M
api_router.include_router(runs.router, tags=["runs"])

# Rotas de análise crítica e inteligência de artigos (Paper Intelligence)
api_router.include_router(paper_analysis.router, tags=["paper-analysis"])

