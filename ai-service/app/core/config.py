import logging
from typing import List, Literal, Union
from pydantic import field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

logger = logging.getLogger(__name__)


class Settings(BaseSettings):
    """
    Configurações centralizadas do microsserviço de IA (SciAI Service).
    Todos os endereços de rede, credenciais e configurações de integração são
    obrigatoriamente lidos a partir de variáveis de ambiente ou do arquivo .env.
    Nenhum valor de rede ou segredo possui fallback hardcoded para não mascarar erros.
    """

    # Ambiente de Execução e Metadados do Serviço
    ENVIRONMENT: str = "development"
    PROJECT_NAME: str = "SciAI Service"
    API_V1_STR: str = "/internal/v1"
    LOG_LEVEL: str = "INFO"

    # Servidor HTTP Uvicorn
    HOST: str = "0.0.0.0"
    PORT: int = 8000

    # Segurança Machine-to-Machine (M2M) e JWT (ADR-012)
    INTERNAL_SERVICE_KEY: str
    JWT_SECRET: str = "super-secret-jwt-key-change-in-production"

    # URL base da API do Backend Principal (Fastify) - Obrigatória via variável de ambiente
    # Em Dev: http://localhost:3333 | Em Docker: http://sci_latex_backend:3333 | Em K8s: http://sci-latex-backend:3333
    BACKEND_API_URL: str

    # Redis / Checkpointer de Agentes - Obrigatório via variável de ambiente
    # Em Dev: redis://localhost:6379 | Em Docker: redis://sci_latex_redis:6379 | Em K8s: redis://sci-latex-redis:6379
    REDIS_URL: str

    # CORS
    BACKEND_CORS_ORIGINS: Union[List[str], str] = ["*"]

    @field_validator("BACKEND_CORS_ORIGINS", mode="before")
    @classmethod
    def assemble_cors_origins(cls, v: Union[str, List[str]]) -> Union[List[str], str]:
        if isinstance(v, str) and not v.startswith("["):
            return [i.strip() for i in v.split(",")]
        elif isinstance(v, (list, str)):
            return v
        raise ValueError(v)

    @property
    def cors_origins(self) -> List[str]:
        if isinstance(self.BACKEND_CORS_ORIGINS, list):
            return self.BACKEND_CORS_ORIGINS
        return [self.BACKEND_CORS_ORIGINS]

    # Provedor de LLM Ativo ("gemini" | "openai" | "ollama") - Sem fallback automático silencioso
    LLM_PROVIDER: Literal["gemini", "openai", "ollama"] = "gemini"

    # 1. Google Gemini
    GEMINI_API_KEY: str | None = None
    GEMINI_MODEL: str = "gemini-3.5-flash-lite"

    # 2. OpenAI
    OPENAI_API_KEY: str | None = None
    OPENAI_MODEL: str = "gpt-4o-mini"

    # 3. Ollama Local
    OLLAMA_BASE_URL: str | None = None
    OLLAMA_MODEL: str = "qwen3.5:4b"
    OLLAMA_NUM_CTX: int = 16384

    # Ferramentas de Busca Opcionais
    TAVILY_API_KEY: str | None = None

    # Opik / Observabilidade e Rastreabilidade de LLM (Comet ML)
    OPIK_URL_OVERRIDE: str | None = None
    OPIK_PROJECT_NAME: str = "scia-academic-copilot"
    OPIK_WORKSPACE: str = "default"

    # AIOps Observability MCP Gateways & Database
    PROMETHEUS_URL: str = "http://localhost:9090"
    LOKI_URL: str = "http://localhost:3100"
    GLITCHTIP_URL: str = "http://localhost:8005"
    AIOPS_DATABASE_URL: str | None = None
    DATABASE_URL: str | None = None
    POSTGRES_HOST: str = "localhost"
    POSTGRES_PORT: int = 5432
    POSTGRES_USER: str = "postgres"
    POSTGRES_PASSWORD: str = "postgres"
    POSTGRES_DB: str = "sci_latex_db"
    PGBOUNCER_HOST: str = "localhost"
    PGBOUNCER_PORT: int = 6543

    @model_validator(mode="after")
    def validate_strict_configuration(self) -> "Settings":
        """
        Validação estrita Fail-Fast:
        Impede a inicialização com URLs de rede ou configurações faltantes.
        """
        if not self.INTERNAL_SERVICE_KEY or self.INTERNAL_SERVICE_KEY.strip() == "":
            raise ValueError(
                "A variável de ambiente 'INTERNAL_SERVICE_KEY' é obrigatória e não pode estar vazia."
            )

        if not self.BACKEND_API_URL or self.BACKEND_API_URL.strip() == "":
            raise ValueError(
                "A variável de ambiente 'BACKEND_API_URL' é obrigatória e não pode estar vazia."
            )

        if not self.REDIS_URL or self.REDIS_URL.strip() == "":
            raise ValueError(
                "A variável de ambiente 'REDIS_URL' é obrigatória e não pode estar vazia."
            )

        if self.LLM_PROVIDER == "gemini":
            if not self.GEMINI_API_KEY or self.GEMINI_API_KEY.strip() == "":
                raise ValueError(
                    "LLM_PROVIDER está configurado como 'gemini', mas a variável 'GEMINI_API_KEY' não foi informada."
                )

        elif self.LLM_PROVIDER == "openai":
            if not self.OPENAI_API_KEY or self.OPENAI_API_KEY.strip() == "":
                raise ValueError(
                    "LLM_PROVIDER está configurado como 'openai', mas a variável 'OPENAI_API_KEY' não foi informada."
                )

        elif self.LLM_PROVIDER == "ollama":
            if not self.OLLAMA_BASE_URL or self.OLLAMA_BASE_URL.strip() == "":
                raise ValueError(
                    "LLM_PROVIDER está configurado como 'ollama', mas a variável 'OLLAMA_BASE_URL' não foi informada."
                )

        return self

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        env_ignore_empty=True,
        extra="ignore",
    )


settings = Settings()
