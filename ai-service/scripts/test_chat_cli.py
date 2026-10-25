"""
Harness interativo de teste via terminal (CLI) para o SciAI Onboarding Chat.
Consome Server-Sent Events (SSE) e gerencia Human-in-the-Loop (interrupt / resume).
"""
import sys
import json
import uuid
import httpx

API_BASE = "http://localhost:8000/internal/v1"
STREAM_TIMEOUT = httpx.Timeout(connect=60.0, read=None, write=60.0, pool=60.0)

def print_colored(text: str, color_code: str = "32"):
    """Imprime texto com cor ANSI no terminal."""
    print(f"\033[{color_code}m{text}\033[0m", end="", flush=True)


def parse_sse_line(line: str):
    """Extrai o payload JSON de uma linha SSE."""
    if line.startswith("data: "):
        try:
            return json.loads(line[6:].strip())
        except json.JSONDecodeError:
            return None
    return None


def run_chat_turn(client: httpx.Client, conversation_id: str, message: str) -> dict | None:
    """Envia uma mensagem para /chat/stream e processa o SSE em tempo real."""
    url = f"{API_BASE}/chat/stream"
    payload = {
        "conversation_id": conversation_id,
        "message": message,
        "user_id": "test-dev-user",
    }

    last_interrupt = None

    print(f"\n📤 [Autor]: {message}\n")
    current_agent = None

    with client.stream("POST", url, json=payload, timeout=STREAM_TIMEOUT) as response:
        if response.status_code != 200:
            print_colored(f"❌ Erro HTTP {response.status_code}: {response.read().decode()}\n", "31")
            return None

        for line in response.iter_lines():
            if not line:
                continue

            event = parse_sse_line(line)
            if not event:
                continue

            event_type = event.get("type")

            if event_type == "token":
                agent = event.get("agent", "Agente")
                if agent != current_agent:
                    current_agent = agent
                    print(f"\n🤖 [{current_agent}]: ", end="", flush=True)
                print_colored(event.get("content", ""), "36")

            elif event_type == "articles_found":
                articles = event.get("articles", [])
                print(f"\n\n📚 [Artigos Encontrados ({len(articles)})]:")
                for i, art in enumerate(articles, 1):
                    year = art.get("year") or "s/d"
                    print(f"   [{i}] {art.get('title')} ({year}) - Citações: {art.get('citation_count', 0)}")
                    if art.get("doi"):
                        print(f"       DOI: {art.get('doi')}")

            elif event_type == "interrupt":
                last_interrupt = event
                print_colored("\n\n⏸️  [INTERRUPÇÃO HUMANA - Human-in-the-Loop detectada!]\n", "33")

            elif event_type == "roadmap_generated":
                print_colored(f"\n\n📋 [Roadmap Gerado]: {event.get('title')}\n", "32")
                for t in event.get("roadmap", []):
                    print(f"   - {t.get('title')}: {t.get('description')} (em {t.get('due_in_days')} dias)")

            elif event_type == "done":
                print("\n\n🏁 [Fim do Turno]")

            elif event_type == "status":
                print_colored(f"⏳ {event.get('message')}\n", "33")

            elif event_type == "error":
                print_colored(f"\n❌ [Erro do Grafo]: {event.get('message')}\n", "31")

    return last_interrupt


def resume_chat_turn(client: httpx.Client, conversation_id: str, decision: dict) -> dict | None:
    """Envia a decisão de retomada para /chat/resume e processa o fluxo subsequente."""
    url = f"{API_BASE}/chat/resume"
    payload = {
        "conversation_id": conversation_id,
        "decision": decision,
    }

    last_interrupt = None
    current_agent = None

    print(f"\n🔄 [Retomando Grafo com Decisão do Autor]...\n")

    with client.stream("POST", url, json=payload, timeout=STREAM_TIMEOUT) as response:
        if response.status_code != 200:
            print_colored(f"❌ Erro HTTP {response.status_code}: {response.read().decode()}\n", "31")
            return None

        for line in response.iter_lines():
            if not line:
                continue

            event = parse_sse_line(line)
            if not event:
                continue

            event_type = event.get("type")

            if event_type == "token":
                agent = event.get("agent", "Agente")
                if agent != current_agent:
                    current_agent = agent
                    print(f"\n🤖 [{current_agent}]: ", end="", flush=True)
                print_colored(event.get("content", ""), "36")

            elif event_type == "roadmap_generated":
                print_colored(f"\n\n📋 [Roadmap Gerado]: {event.get('title')}\n", "32")
                for t in event.get("roadmap", []):
                    print(f"   - {t.get('title')}: {t.get('description')} (em {t.get('due_in_days')} dias)")

            elif event_type == "interrupt":
                last_interrupt = event
                print_colored("\n\n⏸️  [Nova Interrupção Humana detectada!]\n", "33")

            elif event_type == "done":
                print("\n\n🏁 [Fim da Retomada]")

            elif event_type == "status":
                print_colored(f"⏳ {event.get('message')}\n", "33")

            elif event_type == "error":
                print_colored(f"\n❌ [Erro do Grafo]: {event.get('message')}\n", "31")

    return last_interrupt


def main():
    conversation_id = f"cli-test-{uuid.uuid4().hex[:8]}"
    print("=" * 65)
    print("🚀 [SciAI] CLI Test Harness de Onboarding & Diálogo Multi-Agente")
    print(f"   Conversation ID: {conversation_id}")
    print(f"   Target Endpoint: {API_BASE}")
    print("=" * 65)

    # Timeout sem limite de leitura (read=None) para streams longos
    client = httpx.Client(timeout=STREAM_TIMEOUT)

    # Verifica se o backend está de pé
    try:
        health = client.get("http://localhost:8000/health", timeout=5.0)
        if health.status_code != 200:
            print("❌ Servidor não respondeu 200 em /health.")
            return
        print("✅ Servidor SciAI ativo e saudável (/health OK)!\n")
    except Exception as e:
        print(f"❌ Não foi possível conectar ao servidor em http://localhost:8000: {e}")
        print("   Inicie o servidor em outro terminal com: uvicorn app.main:app --port 8000")
        return

    # Loop de conversação
    print("Digite sua mensagem para iniciar o diálogo com o Guia de Exploração.")
    print("Exemplo: 'Quero escrever sobre tolerância a falhas bizantinas em redes veiculares'")
    print("(Digite 'sair' para encerrar)\n")

    while True:
        try:
            msg = input("\n📝 Você: ").strip()
            if not msg or msg.lower() in ("sair", "exit", "quit"):
                print("Encerrando test harness.")
                break

            interrupt_event = run_chat_turn(client, conversation_id, msg)

            while interrupt_event:
                # Trata a interrupção interativa
                data = interrupt_event.get("data", [])
                action_reqs = []
                if isinstance(data, list) and len(data) > 0:
                    val = data[0].get("value", {}) if isinstance(data[0], dict) else {}
                    action_reqs = val.get("action_requests", [])

                if action_reqs:
                    req = action_reqs[0]
                    name = req.get("name")
                    args = req.get("args", {})
                    desc = req.get("description", "")
                    print(f"\n👉 Decisão Solicitada: {name}")
                    print(f"   Descrição: {desc}")

                    if name == "present_articles_to_user_for_selection":
                        articles = args.get("articles", [])
                        print("\nEscolha os números dos artigos que deseja incluir (separados por vírgula):")
                        for idx, art in enumerate(articles, 1):
                            print(f"  [{idx}] {art.get('title')}")
                        choice = input("\nSua seleção (ex: 1, 2) [Enter para todos]: ").strip()

                        selected = []
                        if choice:
                            for c in choice.split(","):
                                try:
                                    i = int(c.strip()) - 1
                                    if 0 <= i < len(articles):
                                        selected.append(articles[i])
                                except ValueError:
                                    pass
                        else:
                            selected = articles[:3]

                        print(f"Artigos escolhidos: {len(selected)}")
                        decision_payload = {
                            "decisions": [
                                {
                                    "type": "selected",
                                    "args": {"selected_articles": selected}
                                }
                            ]
                        }
                        interrupt_event = resume_chat_turn(client, conversation_id, decision_payload)

                    elif name in ("approve_project_creation", "approve_article_proposal"):
                        print_colored(f"\n📄 Proposta de Artigo: '{args.get('title')}'\n", "32")
                        print(f"Congresso Alvo: {args.get('conference')} | Prazo: {args.get('submission_deadline')}")
                        print(f"Resumo: {args.get('abstract')[:200]}...\n")

                        stages = args.get("stages", [])
                        if stages:
                            print_colored("🏛️  Régua das 6 Etapas Fixas (Institucionais):\n", "34")
                            for s in stages:
                                gate_info = f" [🔒 {s.get('gatekeeper_type')}]" if s.get("is_gatekeeper") else ""
                                print(f"   Etapa {s.get('order')}: {s.get('title')} ({s.get('planned_days')} dias){gate_info}")

                        tasks = args.get("tasks", [])
                        if tasks:
                            print_colored("\n✍️  Tarefas de Escrita (Alocadas na Etapa 3):\n", "36")
                            for idx, t in enumerate(tasks, 1):
                                sec = f" -> {t.get('section_file')}" if t.get('section_file') else ""
                                print(f"   Task {idx}: {t.get('title')}{sec} (em {t.get('due_in_days')} dias)")
                                print(f"           {t.get('description')}")

                        approve = input("\nAprovar proposta e criar projeto no SCIA? [S/n]: ").strip().lower()
                        decision_payload = {
                            "decisions": [
                                {
                                    "type": "approve" if approve != "n" else "reject",
                                    "args": {}
                                }
                            ]
                        }
                        interrupt_event = resume_chat_turn(client, conversation_id, decision_payload)
                    else:
                        ans = input(f"\nResposta para {name}: ")
                        interrupt_event = resume_chat_turn(client, conversation_id, {"response": ans})
                else:
                    ans = input("\nForneça a decisão para retomar: ")
                    interrupt_event = resume_chat_turn(client, conversation_id, {"decision": ans})

        except KeyboardInterrupt:
            print("\nEncerrando.")
            break


if __name__ == "__main__":
    main()
