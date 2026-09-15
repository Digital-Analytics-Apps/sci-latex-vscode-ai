# 🎨 Ideias e Evolução do Frontend & Painéis de Gestão

**Data de Atualização:** 14 de Setembro de 2026  
**Escopo:** Interfaces administrativas, monitoramento em tempo real, fluxo de onboarding e UX do editor.

---

## 📌 1. Painel de Administração em Tempo Real (Admin Live Dashboard)

### 📊 1.1 Monitoramento de Usuários e Sessões Ativas via SSE
* **Motivação**: Como já utilizamos Server-Sent Events (SSE) com o `EventsManager` no Fastify, podemos disponibilizar um painel administrativo em tempo real de forma simples, leve e sem necessidade de WebSockets pesados.
* **Funcionalidades da Tela de Admin**:
  * **Métricas Globais em Tempo Real**:
    * 🟢 **Usuários Online**: Contagem total de pesquisadores/alunos ativos no sistema.
    * ⚡ **Pods K8s Ativos**: Pods em execução vinculados a tarefas ativas.
    * 🔥 **Warm Pods (Standby)**: Pods aquecidos prontos para entrega instantânea.
    * 📝 **Tarefas em Revisão**: Tarefas aguardando parecer do orientador/revisor.
  * **Tabela de Sessões Ativas**:
    * **Usuário**: Nome, e-mail e foto do participante.
    * **Artigo / Projeto**: Título do projeto acadêmico e Task selecionada.
    * **Status do Pod**: Estado do container no K8s (`INITIALIZING`, `READY`, `DEGRADED`).
    * **Status de Rascunho**: Indicador visual (ícone verde/amarelo) informando se o usuário possui alterações não commitadas.
    * **Tempo Conectado**: Duração da sessão ativa.
    * **Ações Administrativas**:
      * `[ 🔄 Forçar Recarga do Pod ]`
      * `[ ⏱️ Estender Tempo de Sessão ]`
      * `[ 🛑 Encerrar Sessão ]` (Libera o Pod para o pool).

---

## 📌 2. Experiência de Onboarding e Carregamento do Editor (UX)

### 🚀 2.1 Tela de Transição "Spinning Up"
* **Objetivo**: Substituir o redirecionamento bruto para o iframe por uma tela de transição moderna com indicadores de progresso (*stepper* em tempo real):
  * `[✓]` *1. Reservando Pod no cluster Kubernetes...*
  * `[✓]` *2. Carregando arquivos do repositório Git...*
  * `[⟳]` *3. Inicializando ambiente TeX Live e extensão LaTeX Workshop...*
  * `[ ]` *4. Estabelecendo conexão segura no proxy reverso.*
* **Resultado**: Elimina telas brancas ou loaders genéricos do VS Code, garantindo total previsibilidade ao usuário.

---

## 📌 3. Componentes Visuais e Notificações de Revisão

### 🔔 3.1 Notificações e Modais de Envio para Revisão
* **Modal de Checklist de Envio**:
  * Exibe status dos arquivos LaTeX (`main.tex`, `sections/`, figuras).
  * Exibe aviso se houver arquivos modificados não salvos.
  * Botão de confirmação com efeito de envio para revisão.
* **Badge de Status em Tempo Real**:
  * Quando a tarefa estiver `UNDER_REVIEW`, o header do editor exibe uma barra/badge discreta indicando que o rascunho está congelado para avaliação do revisor.