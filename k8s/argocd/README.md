# 🐙 GitOps & ArgoCD (`k8s/argocd`)

Este diretório contém as definições do **ArgoCD**, a ferramenta responsável por implementar a cultura de **GitOps** na infraestrutura da plataforma SCIA.

---

## 🎯 O Que é GitOps e Por Que Usamos?

No modelo tradicional, o desenvolvedor precisa ter a chave de acesso do servidor ou rodar comandos manuais como `kubectl apply -f arquivo.yaml`. Esse modelo tem vários riscos:
* Alguém pode rodar um comando errado e derrubar a aplicação.
* É difícil saber quem alterou o quê e quando.
* O cluster pode ficar diferente do código que está no GitHub (*Configuration Drift*).

Com **GitOps**:
1. O **Git é a única fonte da verdade** (*Single Source of Truth*).
2. Ninguém mexe diretamente no cluster via linha de comando em produção.
3. Toda mudança de infraestrutura é feita através de um `git commit` ou Pull Request.
4. O **ArgoCD** roda dentro do cluster, vigia o repositório Git e aplica as alterações automaticamente.

---

## 📁 Arquivos Deste Diretório

| Arquivo | Papel na Infraestrutura | O que ele faz |
| :--- | :--- | :--- |
| **[`application.yaml`](application.yaml)** | Deploy da Aplicação Principal SCIA | Monitora a pasta `k8s/manifests/` na branch `dev` e aplica os Deployments do Backend, Frontend, Compilador e HPA no namespace `default`. |
| **[`application-monitoring.yaml`](application-monitoring.yaml)** | Deploy da Stack de Observabilidade | Baixa o Helm Chart oficial do `kube-prometheus-stack` e injeta nosso arquivo de customizações `values-kube-prometheus-stack.yaml` no namespace `monitoring`. |

---

## 🚀 Como Aplicar no Cluster pela Primeira Vez

Caso você esteja configurando um cluster do zero e tenha o ArgoCD instalado:

```bash
# Aplica a sincronização da aplicação de negócio:
kubectl apply -f k8s/argocd/application.yaml

# Aplica a sincronização da stack de observabilidade:
kubectl apply -f k8s/argocd/application-monitoring.yaml
```

A partir desse momento, qualquer alteração que você fizer nos arquivos `.yaml` do Git será automaticamente baixada e aplicada pelo ArgoCD sem intervenção manual.
