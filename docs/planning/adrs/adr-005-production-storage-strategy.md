# ADR-005: Estratégia de Armazenamento de Workspaces (Dev Local vs. Produção Cloud-Native)

- **Status:** Proposto / Em Discussão
- **Data:** 05 de Outubro de 2026
- **Autor(es):** Equipe de Arquitetura SCIA
- **Componentes Relacionados:** `backend` (EditorProxy, GitService), `infra/k8s` (K8sPodManagerService), Pods `code-server`

---

## 1. Contexto

Atualmente, no ambiente de desenvolvimento local (Kind / Docker Desktop), o armazenamento dos workspaces das tarefas dos usuários é realizado através de um volume do tipo **`hostPath`** montado nos Pods de `code-server`:

- **Caminho no Host:** `./storage/projects/:projectId/users/:userId/stages/:stageId/tasks/:taskId`
- **Caminho no Pod (`code-server`):** `/home/coder/project` (montado via `hostPath: /home/coder/storage` e `subPath`).

Esta abordagem atendeu perfeitamente ao ambiente de desenvolvimento por permitir rápida inspeção dos arquivos físicos na máquina do desenvolvedor e zero necessidade de provisionadores de rede no Kind. No entanto, o `hostPath` é intrinsecamente limitado a **um único nó (Single-Node)** e não escala em um cluster Kubernetes de produção com múltiplos nós efêmeros.

Esta ADR registra a discussão arquitetural e compara as estratégias para a transição do ambiente de desenvolvimento para **Produção Cloud-Native**.

---

## 2. Análise do Cenário Atual (Dev Local)

### 🟢 Prós em Desenvolvimento Local:
1. **Developer Experience (DX):** Permite inspecionar diretamente os arquivos `.tex`, `.cls`, `.git` na máquina host sem necessidade de comandos `kubectl exec`.
2. **Desempenho:** I/O direto com o sistema de arquivos nativo do host.
3. **Simplicidade:** Não exige plugins de armazenamento ou provisionadores NFS/EFS no Kind local.

### 🔴 Limitações para Produção:
1. **Apostamento a Nó Único (Node Affinity):** Se o cluster possuir múltiplos nós (Worker Node A, Worker Node B), um Pod agendado no Nó B não terá acesso aos arquivos salvos no disco físico do Nó A.
2. **Efemeridade de Nós:** Se um nó falhar ou for descompromissado pelo Cloud Provider (Auto-scaling), os dados no disco local daquele nó podem ser perdidos.

---

## 3. Opções de Arquitetura para Produção

### Opção A: PVC Dinâmico com Armazenamento de Rede (`ReadWriteMany` - RWX)

Utilizar um `PersistentVolumeClaim` (PVC) configurado com a `StorageClass` de rede do provedor cloud que suporte o modo de acesso `ReadWriteMany` (RWX), como **AWS EFS**, **GCP Filestore**, **Azure Files** ou **Longhorn/Ceph** em infraestrutura Bare-Metal.

#### Funcionamento:
- O volume de rede é montado tanto pelo container da aplicação backend quanto pelos Pods das tarefas dos usuários.
- Cada Pod de workspace acessa o sistema de arquivos central através da subcláusula `subPath` isolada da tarefa (`projects/.../stages/.../tasks/...`).

#### Avaliação:
- **Vantagens:**
  - Compatibilidade transparente com o código atual do backend (`fs.cp`, `git clone` local).
  - Persistência contínua independente de qual nó o Pod seja agendado.
- **Desvantagens:**
  - **Latência de I/O:** Sistemas de arquivos de rede como NFS/EFS possuem latência superior a SSDs locais.
  - **Custo:** Discos RWX gerenciados na nuvem possuem custo por GB significativamente mais elevado.

---

### Opção B (Recomendada Cloud-Native): Workspaces Stateless baseados em Git (`Git-Native Push/Pull`)

Eliminar a dependência de volumes de rede compartilhados entre o backend e os Pods, tornando os Pods de workspace **100% Stateless**.

#### Funcionamento:
1. **Boot do Pod:** O Pod de workspace roda com um volume efêmero local de alta velocidade (**`emptyDir`** ou PVC local `ReadWriteOnce` em SSD NVMe).
2. **Init Container / Initialization:** Ao iniciar, o Pod faz o `git clone` diretamente do repositório Git remoto (GitHub/Gitea) utilizando a branch da tarefa (`task/:taskSlug`).
3. **Execução:** O usuário edita o artigo no VS Code. O auto-save e os commits ocorrem na cópia local do Pod.
4. **Sincronização & Finalização:** Alterações são enviadas (`git push`) para a branch remota. Ao encerrar/hibernar o Pod, os dados já estão garantidos no repositório Git.

#### Avaliação:
- **Vantagens:**
  - **Máximo Desempenho:** I/O em disco NVMe local do nó do Kubernetes.
  - **Baixo Custo:** Elimina a necessidade de contratar serviços de storage RWX caros na nuvem.
  - **Resiliência Total:** O repositório Git é a única "Fonte da Verdade" (*Source of Truth*). Pods podem ser destruídos e recriados a qualquer momento em qualquer nó.
- **Desvantagens:**
  - Requer que o Pod faça `git push`/`git pull` garantido na inicialização e no encerramento (ou via rotina de sincronização periódica/background watcher).

---

## 4. Matriz Comparativa

| Critério | Dev Local (`hostPath`) | Produção Opção A (PVC RWX / EFS) | Produção Opção B (Stateless + Git) |
| :--- | :--- | :--- | :--- |
| **Onde residem os arquivos?** | Disco da máquina local | Sistema de Arquivos de Rede | Repositório Git Central |
| **Escalabilidade Multi-Nó** | ❌ Não | ✅ Sim | ✅ Sim |
| **Resiliência a Falha de Nó** | ❌ Baixa | ✅ Alta | ✅ Máxima (Git como Backup) |
| **Performance de I/O** | Alta | Média (Overhead NFS) | Máxima (NVMe Local) |
| **Custo de Infraestrutura** | Grátis | Elevado (EFS/Filestore) | Baixo (Discos Efêmeros) |
| **Complexidade de Código** | Baixa | Baixa | Média (Requer Git Sync no Lifecycle) |

---

## 5. Decisão & Próximos Passos

1. **Fase Atual (Desenvolvimento):** Manter o modelo atual (`hostPath` normalizado no `./storage` da raiz do monorepo), por ser prático e custos zero.
2. **Fase de Preparação para Homologação/Produção:**
   - Avaliar a implementação da **Opção B (Git-Native Stateless)** como prioridade arquitetural.
   - Caso opte-se pela **Opção A**, configurar o operador de `StorageClass` (EFS CSI Driver no AWS EKS ou Longhorn em Bare-Metal) e atualizar a manifestação do Pod em `K8sPodManagerService`.

---
*Este documento fica registrado para consulta e tomada de decisão quando o projeto avançar para a fase de implantação em ambiente de staging/produção.*
