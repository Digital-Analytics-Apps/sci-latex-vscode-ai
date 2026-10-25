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
        max_retries=5,
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
    logger.info(f"[LLM] Inicializando Ollama local ({settings.OLLAMA_MODEL} em {settings.OLLAMA_BASE_URL})")
    return ChatOllama(
        base_url=settings.OLLAMA_BASE_URL,
        model=settings.OLLAMA_MODEL,
        temperature=0.3,
        num_ctx=settings.OLLAMA_NUM_CTX,
    )


def get_llm():
    """
    Retorna a instância do modelo LLM conforme a configuração ativa:
    - LLM_PROVIDER="gemini" -> Força Google Gemini
    - LLM_PROVIDER="openai" -> Força OpenAI
    - LLM_PROVIDER="ollama" -> Força Ollama Local (escape hatch)
    - LLM_PROVIDER="auto"   -> Gemini -> OpenAI -> Ollama
    """
    provider = (settings.LLM_PROVIDER or "auto").lower()

    if provider == "gemini":
        if not settings.GEMINI_API_KEY:
            raise ValueError("LLM_PROVIDER='gemini' configurado, mas GEMINI_API_KEY não foi informada no .env")
        return _create_gemini_client()

    if provider == "openai":
        if not settings.OPENAI_API_KEY:
            raise ValueError("LLM_PROVIDER='openai' configurado, mas OPENAI_API_KEY não foi informada no .env")
        return _create_openai_client()

    if provider == "ollama":
        return _create_ollama_client()

    # Modo "auto" (fallback progressivo)
    if settings.GEMINI_API_KEY:
        try:
            return _create_gemini_client()
        except Exception as e:
            logger.warning(f"[LLM] Falha ao iniciar Gemini em modo auto: {e}. Tentando OpenAI...")

    if settings.OPENAI_API_KEY:
        try:
            return _create_openai_client()
        except Exception as e:
            logger.warning(f"[LLM] Falha ao iniciar OpenAI em modo auto: {e}. Tentando Ollama...")

    try:
        return _create_ollama_client()
    except Exception as e:
        logger.error(f"[LLM] Falha ao inicializar Ollama: {str(e)}")
        raise RuntimeError(f"Nenhum provedor de LLM disponível (Gemini, OpenAI ou Ollama): {str(e)}")
