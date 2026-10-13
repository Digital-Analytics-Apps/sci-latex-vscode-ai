from fastapi import APIRouter
from app.api.v1.endpoints import chat, runs

api_router = APIRouter()

# Rotas de streaming do chat interativo
api_router.include_router(chat.router, tags=["chat"])

# Rotas de execução assíncrona M2M
api_router.include_router(runs.router, tags=["runs"])
