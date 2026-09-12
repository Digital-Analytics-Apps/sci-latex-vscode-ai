# ADR 002: Orquestração de Workspaces Efêmeros via KinD / Kubernetes com PVC por Projeto e Warm Pool

- **Status:** Aceito (Em Implementação)
- **Data:** 2026-09-08
- **Autores:** Equipe de Arquitetura sci-latex-vscode

---

## 1. Contexto & Problema

Na plataforma de escrita científica `sci-latex-vscode`, manter contêineres estáticos do editor `code-server` para todos os usuários ou depender da permanência contínua de Pods ativos gera os seguintes problemas:
1. **Consumo de Recursos (CPU / RAM):** Centenas de instâncias ativas consumindo recursos sem uso real.
2. **Perda de Rascunhos / Insegurança no Auto-Sync:** Se o Pod morrer violentamente ou o tempo limite de inatividade expirar, rascunhos que o autor ainda não quis enviar para o GitHub poderiam ser perdidos.
3. **Latência de Inicialização (Cold Start):** Criar um Pod do zero no momento do clique pode levar de 2s a 5s para o usuário.

---

## 2. Decisão de Arquitetura

Adotar uma arquitetura **KinD (Kubernetes in Docker)** para ambiente de desenvolvimento local e **Kubernetes (EKS/GKE/AKS)** para produção, incorporando três pilares fundamentais:

### 🚀 Pilar 1: Warm Standby Pool (Pods Pré-Aquecidos com Latência Zero)
- O backend mantém uma reserva de `N` Pods em espera (ex: `minWarmPods = 1` no KinD local).
- Quando o autor clica em "Abrir Editor", a atribuição ocorre de forma **instantânea (0ms)** usando um Pod da reserva.
- No mesmo instante, o backend dispara em segundo plano a criação de +1 Pod reserva para repor o pool.

### 🛡️ Pilar 2: PVC por Projeto (`pvc-project-<projectId>`)
- O estado de rascunho da escrita do autor não é salvo no disco efêmero do Pod, mas sim em um **PVC (Persistent Volume Claim)** dedicado por artigo.
- **Desvinculação do Pod:** O Pod pode ser destruído a qualquer momento (`kubectl delete pod`) para liberar RAM/CPU. O rascunho permanece 100% seguro no PVC.
- **Respeito ao Consentimento do Autor:** Nada é enviado para o repositório remoto no GitHub até o autor decidir explicitamente comitar/empurrar ou abrir um Pull Request.

### 🧹 Pilar 3: Limpeza Inteligente de PVCs
1. **Limpeza Pós-Sync / PR Aprovado:** Quando as alterações são enviadas e confirmadas no GitHub (ou quando o PR é aprovado), os dados estão salvos no remoto e o PVC pode ser deletado.
2. **Retenção TTL de Inatividade (7 Dias):** Rascunhos no PVC sem sincronização por mais de 7 dias sofrem backup automático em branch de rascunho (`draft-backup-branch`) no GitHub e o PVC é liberado.
3. **Deleção do Projeto:** Exclusão do artigo remove imediatamente o PVC associado.

---

## 3. Ambiente de Desenvolvimento Local com KinD (Kubernetes in Docker)

Para garantir 100% de paridade entre Desenvolvimento e Produção:
- **Ferramenta:** KinD (`kind create cluster --config k8s/kind/kind-config.yaml`).
- **Ingress Controller:** NGINX Ingress Controller ou Traefik no KinD.
- **Carregamento de Imagens Locais:** `kind load docker-image sci-latex-vscode-code-server:latest`.
- **SDK Backend:** Módulo `K8sPodManager` utilizando `@kubernetes/client-node`.

---

## 4. Comparativo de Arquitetura

| Recurso | Desenvolvimento Local (KinD Cluster) | Produção (EKS / GKE Cluster) |
| :--- | :--- | :--- |
| **Cluster K8s** | KinD local em Docker | Managed Kubernetes (EKS / GKE) |
| **Instância `code-server`** | Pods efêmeros sob demanda | Pods efêmeros sob demanda |
| **Warm Pool** | 1 Pod reserva pré-aquecido | 2 a 5 Pods reservas pré-aquecidos |
| **Armazenamento de Rascunho**| Local Path PVC (`pvc-project-id`) | EFS / Longhorn / Ceph PVC |
| **Fonte da Verdade Definitiva**| Repositório GitHub Remote | Repositório GitHub Remote |

---

## 5. Consequências

- **Positivas:**
  - Experiência do usuário ultrarrápida (0ms para abrir o editor).
  - Tolerância total a quedas de conexão ou F5 no navegador.
  - Zero risco de enviar alterações não autorizadas pelo autor para o GitHub.
  - Baixo consumo de RAM/CPU (Pods inativos são descartados).

---

## 6. Desafios de Implementação & Soluções (Rastreabilidade)

1. **Centralização Única no KinD / Remoção do Container Estático `code-server`:**
   - **Problema:** A presença de um container estático `code-server` no `docker-compose.yml` criava redundância e desalinhamento com a arquitetura K8s.
   - **Solução:** Removida a declaração estática do `docker-compose.yml`. Todo o provisionamento do `code-server` é centralizado via `K8sPodManagerService` em Pods do cluster KinD.

2. **Exposição de Rede e Roteamento de Sessão (`NodePort 30080`):**
   - **Problema:** Pods criados dentro do KinD precisam ser acessíveis ao navegador do usuário em `http://localhost:30080`.
   - **Solução:** Criado o Service `code-server-service` de tipo `NodePort` (porta `30080`) no manifesto `k8s/manifests/code-server-template.yaml`. O `editorProxyRoutes` faz o _probe_ e redireciona automaticamente a sessão do usuário.

3. **Conectividade do Backend Docker com a API K8s (`host.docker.internal` & `~/.kube/config`):**
   - **Problema:** O container `sci_latex_backend` não conseguia acessar a API K8s por tentar conectar em `127.0.0.1:37121` (que apontava para dentro do próprio container) e pela ausência das credenciais do Kubeconfig.
   - **Solução:** Montado `${HOME}/.kube/config:/root/.kube/config:ro` e `host.docker.internal:host-gateway` no `docker-compose.yml`. No `K8sPodManagerService`, o endereço da API é substituído por `host.docker.internal` em ambiente de container.

4. **Resolução Dinâmica do Cliente K8s (`getK8sApiClient`):**
   - **Problema:** Quando o cluster KinD é recriado ou reiniciado, a porta da API K8s do servidor muda dinamicamente (ex: de `37121` para `41551`). A instância estática anterior do cliente no backend mantinha em cache a porta antiga, gerando erros de `ECONNREFUSED` e forçando o sistema para o modo de fallback sem instanciar novos Pods.
   - **Solução:** Refatorado o `K8sPodManagerService` para resolver e recarregar dinamicamente as credenciais do `KubeConfig` e o endereço ativo do cluster a cada chamada de gerenciamento (`getK8sApiClient`), garantindo que o backend se conecte com sucesso ao cluster atualizado e crie Pods dedicados para cada usuário.

5. **Gerenciamento Dinâmico de Pods por Presença SSE com Grace Period de 1 Minuto (`releasePodForProject`):**
   - **Problema:** Pods do `code-server` continuavam rodando indefinidamente no cluster K8s consumindo memória RAM/CPU mesmo após o usuário fechar a aba, sair do projeto ou fechar o navegador.
   - **Solução:** Integrado o monitoramento de conexões SSE (`EventsManagerService`) rastreado por `projectId`. Quando as conexões SSE ativas do projeto chegam a `0`, o backend aciona um **Grace Period de 1 minuto (`60.000 ms`)**. Se o usuário reconectar/der F5 dentro deste 1 minuto, o timer é cancelado e o Pod permanece ativo sem latência. Se o tempo expirar sem nova conexão, o backend executa `releasePodForProject(projectId)`, deletando o Pod no Kubernetes me liberando a memória RAM do servidor.

6. **Isolamento Estrito de Projetos / Multi-Tenant Subpath Mount & Pré-provisionamento:**
   - **Problema:** Ao montar o volume PVC diretamente no diretório raiz do container (`/home/coder/storage`), os usuários podiam navegar pela arvore de arquivos através do seletor "Open Folder" do VS Code e acessar projetos de outros usuários ("Workspace não existe" ou vazamentos de dados). Além disso, tentar abrir o workspace antes de criar os arquivos de template `main.tex` causava erro de diretório inexistente.
   - **Solução:** 
     1. **SubPath Mount:** Os Pods de projeto declaram `subPath: projects/${projectId}` montado diretamente em `/home/coder/project`. O container do `code-server` é iniciado diretamente com argumento `/home/coder/project`, tornando impossível ao container acessar o diretório pai ou visualizar arquivos de outros projetos.
     2. **Pré-provisionamento de Arquivos:** No `editorProxyRoutes`, o repositório Git e a estrutura inicial do LaTeX (`main.tex`, `sections/`, `references.bib`, etc.) são criados no disco do host **antes** de acionar a criação/reserva do Pod e efetuar o redirecionamento HTTP, garantindo que o VS Code abra imediatamente um ambiente preparado e isolado.


