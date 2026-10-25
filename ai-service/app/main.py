import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.api.v1.router import api_router

# Configuração de logs
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)

logger = logging.getLogger(__name__)

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="Microserviço de Inteligência Artificial Científica da Plataforma SCIA",
    version="1.0.0",
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
)

# Configuração de CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Inclui rotas da API interna
app.include_router(api_router, prefix=settings.API_V1_STR)


@app.get("/health", tags=["health"])
async def health_check():
    """
    Endpoint de verificação de integridade (K8s liveness/readiness probe).
    """
    return {"status": "healthy", "service": "sciai"}
