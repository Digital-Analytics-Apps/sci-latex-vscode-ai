import logging
from app.core.config import settings

logger = logging.getLogger(__name__)


def get_llm():
    """
    Retorna a instância do modelo LLM configurado.
    Prioridade:
    1. Google Gemini (se GEMINI_API_KEY estiver configurado)
    2. OpenAI (se OPENAI_API_KEY estiver configurado)
    3. Ollama local como fallback
    """
    if settings.GEMINI_API_KEY:
        try:
            from langchain_google_genai import ChatGoogleGenerativeAI

            logger.info(f"[LLM] Inicializando Google Gemini ({settings.GEMINI_MODEL})")
            return ChatGoogleGenerativeAI(
                model=settings.GEMINI_MODEL,
                google_api_key=settings.GEMINI_API_KEY,
                temperature=0.3,
                max_retries=5,
            )
        except ImportError:
            logger.warning("[LLM] langchain_google_genai não instalado. Tentando próximo provedor...")

    if settings.OPENAI_API_KEY:
        try:
            from langchain_openai import ChatOpenAI

            logger.info(f"[LLM] Inicializando OpenAI ({settings.OPENAI_MODEL})")
            return ChatOpenAI(
                model=settings.OPENAI_MODEL,
                api_key=settings.OPENAI_API_KEY,
                temperature=0.3,
                max_retries=3,
            )
        except ImportError:
            logger.warning("[LLM] langchain_openai não instalado. Tentando próximo provedor...")

    # Fallback para Ollama Local
    try:
        from langchain_ollama import ChatOllama

        logger.info(f"[LLM] Inicializando Ollama local ({settings.OLLAMA_MODEL} em {settings.OLLAMA_BASE_URL})")
        return ChatOllama(
            base_url=settings.OLLAMA_BASE_URL,
            model=settings.OLLAMA_MODEL,
            temperature=0.3,
            num_ctx=4096,
        )
    except Exception as e:
        logger.error(f"[LLM] Falha ao inicializar Ollama: {str(e)}")
        raise RuntimeError(f"Nenhum provedor de LLM disponível: {str(e)}")
