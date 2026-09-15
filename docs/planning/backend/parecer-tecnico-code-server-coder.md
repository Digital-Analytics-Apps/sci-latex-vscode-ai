# 📋 Parecer Técnico: Análise Arquitetural e Oportunidades (`code-server` vs. `coder` vs. `sci-latex-vscode`)

**Data:** 14 de Setembro de 2026  
**Status:** Salvo para Futura Implementação  
**Escopo:** Infraestrutura K8s, Orquestração de Pods, Proxy Reverso e Experiência TeX  

---

## 1. Resumo Executivo e Distinção das Tecnologias

Para guiar a evolução da infraestrutura do **sci-latex-vscode**, é fundamental diferenciar o escopo do **`coder/code-server`** e do **`coder/coder`**:

* **`coder/code-server`**: É unicamente o servidor do VS Code adaptado para rodar no navegador. Ele roda como um processo único dentro de um container/VM e disponibiliza a interface Web, Language Servers (LSP) e terminais. **Não possui** inteligência de orquestração de infraestrutura, multi-tenancy nem gestão de ciclo de vida de Pods.
* **`coder/coder` (Plataforma CDE)**: É um painel/plataforma de orquestração de ambientes de desenvolvimento em nuvem (Cloud Development Environments - CDE). Ele utiliza **Terraform** como motor de provisionamento, um **`coder agent`** leve rodando dentro de cada container/VM para criar túneis criptografados (WireGuard/DERP), gestão de hibernação por inatividade (TTL) e suporte a múltiplos provedores (K8s, Docker, AWS, GCP).
* **Nosso Projeto (`sci-latex-vscode`)**: Possui uma solução customizada de alto nível que une um **painel web focado em artigos científicos** a um **orquestrador K8s sob demanda (`K8sPodManagerService`)** com pool de pods aquecidos (*warm standby*), Proxy reverso de alta performance no Fastify (`@fastify/http-proxy`) e sincronização de arquivos TeX.

---

## 2. Matriz Comparativa Arquitetural

| Dimensão / Funcionalidade | Nosso Estado Atual (`sci-latex-vscode`) | `coder/code-server` | `coder/coder` (Plataforma CDE) |
| :--- | :--- | :--- | :--- |
| **Escopo** | Editor Científico TeX + Orquestrador K8s dedicado | Apenas a IDE VS Code no navegador | Plataforma completa de CDE (Provisioner + Agent + Auth) |
| **Orquestração** | `K8sPodManagerService` com `@kubernetes/client-node` | Nenhuma (depende de executor externo) | Motor baseado em **Terraform** (`coder/provisioner`) |
| **Pool de Standby & Warming** | **Sim** (`code-server-warm` com tempo de subida < 3s) | Não | Não por padrão (depende de templates Terraform customizados) |
| **Comunicação / Proxy** | `@fastify/http-proxy` (HTTP + WebSocket isolado) | Servidor HTTP próprio com senha/token | Túneis criptografados via WireGuard (DERP) + App Proxy |
| **Agente no Pod** | Sem agente (Proxy direto para porta interna do Pod) | Nenhum | **`coder agent`** (executa scripts, checa saúde e métricas) |
| **Gestão de Inatividade** | Grace Period de 3 minutos via SSE (`events.manager`) | Manual ou encerramento de processo | **Hibernação por TTL** (auto-stop com preservação do PVC) |

---

## 3. O que podemos aprender e incorporar em nossa Infraestrutura?

Analisando os repositórios oficiais da Coder, identificamos **5 práticas e conceitos de engenharia valiosos** a serem adotados futuramente no `sci-latex-vscode`:

### 1️⃣ Pré-configuração de Configurações e Temas do TeX (`settings.json` Injection)
* **Como a Coder faz**: O `code-server` permite injeção de configurações padrão via arquivo em `/home/coder/.local/share/code-server/User/settings.json`.
* **Oportunidade para nós**: Podemos montar/pré-popular esse arquivo na criação do Pod com:
  * Compilação automática de TeX ao salvar (`latex-workshop.latex.autoBuild.run: "onSave"`).
  * Tema escuro pré-selecionado sincronizado com a UI do nosso frontend.
  * Ocultação de abas desnecessárias (como telemetria e abas de onboarding do VS Code), entregando uma experiência *clean* focada apenas no artigo científico.

### 2️⃣ Conceito de Agente de Saúde e Inicialização (*Readiness Probe Customizada*)
* **Como a Coder faz**: O `coder agent` roda dentro do container e reporta o estado de prontidão (quando o VS Code, extensões e workspace foram montados) diretamente para a control plane.
* **Oportunidade para nós**: Atualmente fazemos *polling* de HTTP no backend para saber se o Pod está respondendo. Podemos configurar um script de inicialização (`entrypoint` ou `readinessProbe` do Kubernetes) para garantir que a extensão **LaTeX Workshop** esteja 100% carregada antes de liberar a rota para o usuário, evitando telas brancas intermediárias.

### 3️⃣ Segurança Avançada de Autenticação Inter-Processos
* **Como a Coder faz**: O `code-server` aceita o parâmetro `--auth secret` lendo uma chave de arquivo ou variável de ambiente, garantindo que requisições diretas não autenticadas sejam bloqueadas.
* **Oportunidade para nós**: Atualmente passamos um token de query no iframe. Podemos gerar uma chave secreta randômica por Pod na inicialização do K8s e injetá-la como header no `@fastify/http-proxy`, impedindo que qualquer usuário tente acessar o Pod diretamente ignorando nossa API.

### 4️⃣ Padrão de Hibernação e Retenção de Estado (*Workspace Hibernation*)
* **Como a Coder faz**: Quando um ambiente fica inativo por um período longo, o Pod é destruído mas o Volume de Disco (PVC - PersistentVolumeClaim) é mantido intacto no Kubernetes.
* **Oportunidade para nós**: Podemos evoluir nosso `events.manager.ts` para que, após o grace period (ex: 3 a 10 minutos de inatividade sem nenhum SSE ativo), o Pod seja desligado mas seu volume no repositório local/PVC seja preservado. Ao retornar, o usuário ganha acesso instantâneo sem perda de nenhum rascunho de compilação TeX.

### 5️⃣ Conectividade Híbrida: Suporte Futuro a VS Code Desktop Local via SSH (Roadmap Enterprise)
* **Como a Coder faz**: Permite que pesquisadores/desenvolvedores que não querem usar o navegador conectem o **VS Code Desktop local** da sua máquina diretamente ao Pod remoto via túnel SSH (`coder ssh`).
* **Oportunidade para nós**: No futuro, pesquisadores que preferirem usar o VS Code nativo no Mac/Linux/Windows poderiam se conectar diretamente à nossa infraestrutura no K8s sem precisar abrir a versão web.

---

## 4. Plano de Ação para Implementações Futuras

1. **Fase A (Curto Prazo)**: Injeção do `settings.json` do VS Code no `k8s-pod-manager.service.ts` para desativar telemetria e ativar compilação automática no `LaTeX Workshop`.
2. **Fase B (Médio Prazo)**: Validação de prontidão com `readinessProbe` do Kubernetes para checar o status da extensão TeX antes de redirecionar o usuário no proxy.
3. **Fase C (Longo Prazo/Enterprise)**: Hibernação de Pods com retenção de PVC e suporte opcional a conexão remota SSH via VS Code Desktop.
