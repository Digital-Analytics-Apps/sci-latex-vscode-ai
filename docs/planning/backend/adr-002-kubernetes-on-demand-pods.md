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
