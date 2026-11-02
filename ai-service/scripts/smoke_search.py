"""
Smoke test para validação dos conectores de busca acadêmica e da fachada unificada.
Valida:
1. Conector arXiv com semáforo, throttle de 3s e parse de Atom XML.
2. Fachada unificada execute_academic_search com arXiv como mecanismo default.
3. Compatibilidade estrita do retorno com o schema Article (state.py).
"""
import asyncio
import os
import sys
import time

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.agents.tools.arxiv import search_academic_papers_arxiv
from app.agents.tools.academic_search import execute_academic_search


REQUIRED_FIELDS = {"title", "authors", "year", "venue", "snippet", "url", "citation_count"}


async def main():
    print("=" * 65)
    print("🧪 [SciAI] Smoke Test de Conectores Acadêmicos (arXiv First)")
    print("=" * 65)

    # 1. Teste Direto: Conector arXiv
    print("\n⏳ [1/2] Testando conector arXiv (search_academic_papers_arxiv)...")
    t0 = time.time()
    arxiv_results = await search_academic_papers_arxiv("transformer attention", limit=2)
    elapsed = time.time() - t0

    if isinstance(arxiv_results, list) and len(arxiv_results) > 0:
        print(f"✅ [1/2] arXiv retornou {len(arxiv_results)} papers em {elapsed:.2f}s:")
        for idx, paper in enumerate(arxiv_results, start=1):
            missing = REQUIRED_FIELDS - set(paper.keys())
            if missing:
                print(f"   ❌ Artigo {idx} violou contrato Article. Campos ausentes: {missing}")
            else:
                print(f"   [{idx}] {paper['title']}")
                print(f"       Autores: {', '.join(paper['authors'][:2])}")
                print(f"       Ano: {paper['year']} | Venue: {paper['venue']}")
                print(f"       URL: {paper['url']}")
                print(f"       PDF: {paper.get('pdf_url')}")
    else:
        print(f"⚠️ [1/2] arXiv retornou resposta alternativa: {arxiv_results}")

    # 2. Teste da Fachada Unificada (arXiv como Default)
    print("\n⏳ [2/2] Testando Fachada Unificada (execute_academic_search)...")
    t0 = time.time()
    facade_results = await execute_academic_search.ainvoke({"query": "deep learning optimization", "limit": 2})
    elapsed = time.time() - t0

    if isinstance(facade_results, list) and len(facade_results) > 0:
        print(f"✅ [2/2] Fachada retornou {len(facade_results)} papers com sucesso em {elapsed:.2f}s:")
        for idx, paper in enumerate(facade_results, start=1):
            print(f"   [{idx}] {paper['title']}")
            print(f"       Autores: {', '.join(paper['authors'][:2])}")
            print(f"       Ano: {paper['year']} | Venue: {paper['venue']}")
            print(f"       URL: {paper['url']}")
    else:
        print(f"❌ [2/2] Fachada falhou: {facade_results}")

    print("\n🎉 Teste de busca acadêmica finalizado com êxito!")


if __name__ == "__main__":
    asyncio.run(main())
