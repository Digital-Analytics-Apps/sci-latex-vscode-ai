import logging
import secrets
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from prometheus_fastapi_instrumentator import Instrumentator
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


@app.middleware("http")
async def w3c_trace_context_middleware(request: Request, call_next):
    """
    Middleware de Propagação W3C Trace Context (traceparent).
    Captura o trace_id vindo do Frontend/Backend e o propaga nas respostas HTTP.
    """
    incoming = request.headers.get("traceparent")
    if incoming and incoming.startswith("00-"):
        parts = incoming.split("-")
        trace_id = parts[1] if len(parts) >= 4 and len(parts[1]) == 32 else secrets.token_hex(16)
    else:
        trace_id = secrets.token_hex(16)

    span_id = secrets.token_hex(8)
    outgoing_traceparent = f"00-{trace_id}-{span_id}-01"

    response = await call_next(request)
    response.headers["traceparent"] = outgoing_traceparent
    response.headers["x-trace-id"] = trace_id
    return response

# Inclui rotas da API interna
app.include_router(api_router, prefix=settings.API_V1_STR)

# Instrumentação Prometheus para scraping de métricas (/metrics)
Instrumentator(
    should_group_status_codes=False,
    should_ignore_untemplated=True,
    excluded_handlers=["/metrics", "/health"],
    inprogress_name="scia_ai_requests_inprogress",
).instrument(app).expose(app, endpoint="/metrics", tags=["metrics"])


@app.get("/health", tags=["health"])
async def health_check():
    """
    Endpoint de verificação de integridade (K8s liveness/readiness probe).
    """
    return {"status": "healthy", "service": "sciai"}
