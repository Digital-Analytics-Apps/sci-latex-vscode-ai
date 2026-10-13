from typing import List, Union
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import field_validator


class Settings(BaseSettings):
    PROJECT_NAME: str = "SciAI Service"
    API_V1_STR: str = "/internal/v1"
    
    # Segurança Machine-to-Machine (M2M)
    INTERNAL_SERVICE_KEY: str = "scia-internal-secret-change-in-production"
    
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

    # LLM & Providers
    GEMINI_API_KEY: str | None = None
    GEMINI_MODEL: str = "gemini-2.5-flash"
    
    OPENAI_API_KEY: str | None = None
    OPENAI_MODEL: str = "gpt-4o"
    
    OLLAMA_BASE_URL: str = "http://localhost:11434"
    OLLAMA_MODEL: str = "llama3:8b"

    # Ferramentas de Busca
    TAVILY_API_KEY: str | None = None
    
    # Redis / Checkpointer (Opcional no MVP, fallback in-memory)
    REDIS_URL: str = "redis://localhost:6379"

    model_config = SettingsConfigDict(
        env_file=".env", env_ignore_empty=True, extra="ignore"
    )


settings = Settings()
