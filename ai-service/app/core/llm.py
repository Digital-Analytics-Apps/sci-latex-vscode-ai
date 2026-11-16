import logging
from app.core.config import settings

logger = logging.getLogger(__name__)


def _create_gemini_client():
    from langchain_google_genai import ChatGoogleGenerativeAI

    logger.info(f"[LLM] Inicializando Google Gemini ({settings.GEMINI_MODEL})")
    return ChatGoogleGenerativeAI(
        model=settings.GEMINI_MODEL,
        google_api_key=settings.GEMINI_API_KEY,
        temperature=0.3,
        max_retries=3,
    )


def _create_openai_client():
    from langchain_openai import ChatOpenAI

    logger.info(f"[LLM] Inicializando OpenAI ({settings.OPENAI_MODEL})")
    return ChatOpenAI(
        model=settings.OPENAI_MODEL,
        api_key=settings.OPENAI_API_KEY,
        temperature=0.3,
        max_retries=3,
    )


def _create_ollama_client():
    from langchain_ollama import ChatOllama

    logger.info(
        f"[LLM] Inicializando Ollama local ({settings.OLLAMA_MODEL} em {settings.OLLAMA_BASE_URL})"
    )
    return ChatOllama(
        base_url=settings.OLLAMA_BASE_URL,
        model=settings.OLLAMA_MODEL,
        temperature=0.3,
        num_ctx=settings.OLLAMA_NUM_CTX,
    )


def get_llm():
    """
    Retorna a instância do modelo LLM estritamente configurado em LLM_PROVIDER.
    Sem fallbacks silenciosos: falhas do provedor configurado são propagadas diretamente
    para identificação e resolução imediata da causa raiz.
    """
    provider = settings.LLM_PROVIDER.lower()

    if provider == "gemini":
        return _create_gemini_client()

    if provider == "openai":
        return _create_openai_client()

    if provider == "ollama":
        return _create_ollama_client()

    raise ValueError(f"Provedor LLM '{settings.LLM_PROVIDER}' não suportado.")
