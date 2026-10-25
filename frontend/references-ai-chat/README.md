# 📚 Referências de Implementação do Chat de IA (Frontend)

Esta pasta reúne o código de referência extraído do projeto `sci-project / sci-agent-frontend`.  
Os arquivos aqui presentes servem como **base de estudo e modelo de implementação** para a criação do componente nativo de Chat (Onboarding Conversacional & Copilot) no SCIA (`sci-latex-vscode`).

> [!NOTE]
> Esta pasta está localizada em `frontend/references-ai-chat/` (fora de `src/`) propositalmente para servir como documentação/código de referência vivo sem interferir na tipagem estrita do Vite/TypeScript do SCIA.

---

## 📁 Arquivos Incluídos

| Arquivo | Origem | Finalidade / O que aproveitar |
| :--- | :--- | :--- |
| **[`OnboardingChat.reference.tsx`](file:///home/gilson-russo/development/professional/sci-latex-vscode/frontend/references-ai-chat/OnboardingChat.reference.tsx)** | `features/onboarding/components/OnboardingChat.tsx` | • **Parsing de SSE em tempo real** (`processStream`) linha a linha.<br>• **Agrupamento dinâmico de balões por agente** (`Supervisor`, `Guia de Exploração`, `Especialista de Busca`).<br>• **Tratamento de Human-in-the-Loop (`interrupt`)**: cards de aprovação/rejeição de buscas e ferramentas.<br>• **Renderização de `structured_data`** (artigos retornados, templates, cronograma sugerido).<br>• **Scroll suave automático** com `useRef` e `messagesEndRef`. |
| **[`onboardingApi.reference.ts`](file:///home/gilson-russo/development/professional/sci-latex-vscode/frontend/references-ai-chat/onboardingApi.reference.ts)** | `features/onboarding/onboardingApi.ts` | • **Tipagem TypeScript pronta**: interfaces `InterruptPayload`, `InterruptActionRequest`, `Article`, `RoadmapTask`.<br>• **Métodos HTTP**: `sendMessage` (disparo inicial SSE com `fetch`) e `resumeMessage` (retomada com decisão do usuário). |
| **[`AIChatSidebar.reference.tsx`](file:///home/gilson-russo/development/professional/sci-latex-vscode/frontend/references-ai-chat/AIChatSidebar.reference.tsx)** | `features/editor/components/AIChatSidebar.tsx` | • **Layout de Drawer/Sidebar retrátil** para quando o chat for utilizado como Copilot lateral no editor de LaTeX.<br>• Exemplo de renderização com Markdown para trechos e equações LaTeX. |

---

## 🛠️ Guia de Adaptação para o Padrão SCIA

Ao criarmos a implementação oficial no SCIA (ex: em `frontend/src/features/chat/` ou dentro de um modal de criação de artigo):

### 1. Rotas e Proxy
* **Não chamar diretamente o `ai-service` (`http://localhost:8000`) a partir do navegador.**
* O frontend do SCIA deve bater no endpoint do backend Fastify:
  * `POST /api/v1/projects/onboarding/stream`
  * `POST /api/v1/projects/onboarding/resume`
* O backend Fastify valida a sessão/JWT do usuário e faz o proxy seguro para o `ai-service` via rede interna com o header `X-Internal-Service-Key`.

### 2. Estilo e Componentização UI
* Substituir o bloco bruto `<pre>{JSON.stringify(msg.structured_data)}</pre>` por componentes visuais próprios:
  * **Card de Artigos Bibliográficos:** Card com título, autores, badge de citações, link DOI e checkbox para o usuário selecionar 3 dos 5 artigos sugeridos.
  * **Card de Cronograma & Congresso:** Lista interativa das etapas sugeridas onde o autor pode editar datas ou aprovar o fluxo antes de disparar a criação do projeto.

### 3. Padrão de Exportação e Hooks
* No `sci-latex-vscode`, utilizamos estritamente **Named Exports** (`export const AiChatModal = ...`), eliminando `export default`.
* Usar nossos hooks de TanStack Query / SSE padronizados (`useSSEEventSource` ou streaming customizado encapsulado em hook).
