"""
Smoke test para validar a conexão e a capacidade do LLM configurado.
Testa:
1. Inicialização do modelo (Gemini / OpenAI / Ollama)
2. Invocação direta
3. Suporte a Tool Calling
"""
import sys
import os
import time

# Adiciona o diretório ai-service ao path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.core.config import settings
from app.core.llm import get_llm
from langchain_core.tools import tool


@tool
def get_current_scientific_conference(field: str) -> str:
    """Retorna a principal conferência de uma determinada área científica."""
    conferences = {
        "security": "IEEE Symposium on Security and Privacy (S&P)",
        "networks": "ACM SIGCOMM",
        "software": "ICSE",
    }
    return conferences.get(field.lower(), "SBSEG (Simpósio Brasileiro de Segurança da Informação)")


def main():
    print("=" * 60)
    print("🧪 [SciAI] Smoke Test de Provedor LLM")
    print(f"   LLM_PROVIDER: {settings.LLM_PROVIDER}")
    print(f"   GEMINI_API_KEY: {'CONFIGURADA' if settings.GEMINI_API_KEY else 'NÃO DEFINIDA'}")
    print(f"   OPENAI_API_KEY: {'CONFIGURADA' if settings.OPENAI_API_KEY else 'NÃO DEFINIDA'}")
    print(f"   OLLAMA_MODEL: {settings.OLLAMA_MODEL} ({settings.OLLAMA_BASE_URL})")
    print("=" * 60)

    try:
        t0 = time.time()
        llm = get_llm()
        init_time = time.time() - t0
        print(f"✅ [1/3] LLM inicializado com sucesso em {init_time:.2f}s: {type(llm).__name__}")
    except Exception as e:
        print(f"❌ [1/3] Falha na inicialização do LLM: {e}")
        return

    # Teste de geração simples
    try:
        print("\n⏳ [2/3] Testando geração de resposta direta...")
        t0 = time.time()
        response = llm.invoke("Responda apenas: 'SCIA Engine Operacional.'")
        elapsed = time.time() - t0
        content = getattr(response, "content", str(response))
        print(f"✅ [2/3] Resposta recebida em {elapsed:.2f}s:")
        print(f"   >>> {content.strip()}")
    except Exception as e:
        print(f"❌ [2/3] Falha na geração direta: {e}")
        return

    # Teste de Tool Calling
    try:
        print("\n⏳ [3/3] Testando chamada de ferramentas (Tool Calling)...")
        t0 = time.time()
        llm_with_tools = llm.bind_tools([get_current_scientific_conference])
        tool_response = llm_with_tools.invoke("Qual é a principal conferência para a área de security?")
        elapsed = time.time() - t0
        tool_calls = getattr(tool_response, "tool_calls", [])
        if tool_calls:
            print(f"✅ [3/3] Tool Calling disparado com sucesso em {elapsed:.2f}s:")
            for tc in tool_calls:
                print(f"   - Tool: {tc['name']} | Args: {tc['args']}")
        else:
            print(f"⚠️ [3/3] Resposta sem tool calls explícitas (conteúdo: {tool_response.content[:100]}...)")
    except Exception as e:
        print(f"❌ [3/3] Falha no Tool Calling: {e}")
        return

    print("\n🎉 Smoke Test concluído com êxito!")


if __name__ == "__main__":
    main()
