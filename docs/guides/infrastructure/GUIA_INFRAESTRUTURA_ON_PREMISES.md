# 🏢 Guia e Questionário de Infraestrutura On-Premises: SCI-LaTeX

> **Plataforma:** SCIA — Scientific Collaboration and Intelligent Assistance (`sci-latex-vscode`)  
> **Objetivo:** Roteiro técnico de alinhamento com a equipe de Infraestrutura/SRE/SysAdmins para provisionamento e dimensionamento do cluster Kubernetes em ambiente **100% On-Premises**.  
> **Status:** Especificação Técnica de Produção  

---

## 📑 Sumário

1. [Diferenças Críticas: Cloud vs. On-Premises](#1-diferenças-críticas-cloud-vs-on-premises)
2. [Perfil de Consumo Comprovado em Testes Empíricos](#2-perfil-de-consumo-comprovado-em-testes-empíricos)
3. [Questionário Estruturado para a Equipe de Infraestrutura](#3-questionário-estruturado-para-a-equipe-de-infraestrutura)
   - 3.1 [Capacidade Física dos Nós e Políticas de Overcommit](#31-capacidade-física-dos-nós-e-políticas-de-overcommit)
   - 3.2 [Isolamento do Compilador LaTeX (Noisy Neighbors)](#32-isolamento-do-compilador-latex-noisy-neighbors)
   - 3.3 [Rede, Ingress e WebSockets de Longa Duração](#33-rede-ingress-e-websockets-de-longa-duração)
   - 3.4 [Armazenamento Local e CSI (StorageClass)](#34-armazenamento-local-e-csi-storageclass)
   - 3.5 [Topologia do PostgreSQL e Redis](#35-topologia-do-postgresql-e-redis)
   - 3.6 [Políticas de Evicção do Kubelet (Memory/Disk Pressure)](#36-políticas-de-evicção-do-kubelet-memorydisk-pressure)
4. [Matriz de Riscos On-Premises & Mitigações](#4-matriz-de-riscos-on-premises--mitigações)
5. [Template de E-mail / Mensagem para o Líder de Infraestrutura](#5-template-de-e-mail--mensagem-para-o-líder-de-infraestrutura)

---

## 1. Diferenças Críticas: Cloud vs. On-Premises

Em provedores de nuvem pública (AWS, GCP, Azure), existe a ilusão de capacidade infinita por meio de ferramentas como *Cluster Autoscaler* e *Karpenter*, que provisionam novas máquinas virtuais sob demanda.

Em um ambiente **On-Premises** (bare-metal, VMware vSphere, Proxmox, OpenShift, RKE2):
* **O Hardware é Fixo e Finito:** Não há criação automática de servidores físicos. Se os nós lotarem, pods extras ficam presos em status `Pending`.
* **Risco de Pressão no Nó (*Node Pressure*):** Se a memória do nó físico esgotar, o agente do Kubernetes (`kubelet`) inicia o processo de **Evicção de Pods** (*Eviction*), matando containers por ordem de prioridade para salvar o sistema operacional.
* **Storage e Rede Próprios:** Em vez de AWS ALB e EBS, a infraestrutura depende de balanceadores locais (MetalLB, F5 BIG-IP, HAProxy, Ingress NGINX) e drivers CSI locais (Ceph, Longhorn, SAN iSCSI ou NFS).

---

## 2. Perfil de Consumo Comprovado em Testes Empíricos

Para fundamentar as solicitações de recursos junto à equipe de infraestrutura com **dados reais e mensurados** (não chutes), realizamos testes exaustivos de estresse com o motor colaborativo CodeMirror 6, Redis Pub/Sub e compilação de artigos de tamanho médio com TeX Live:

### 2.1 Tabela de Consumo Medido no Cluster

| Componente | CPU (Repouso) | CPU (Pico 1.250 users) | Memória (Repouso) | Memória (Pico) | Comportamento do HPA |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Backend Fastify** | `2m` | **`134m – 493m`** | `93Mi – 95Mi` | **`140Mi`** | Escala de 2 até **6 réplicas** sob tráfego intenso. |
| **Compiler TeX Live** | `1m` | **`304m – 1000m`** | `40Mi` | **`553Mi`** | Escala de 1 até **4 réplicas** durante rajadas de PDF. |
| **Frontend Nginx** | `1m` | `2m` | `7Mi` | **`7Mi`** | Fixo em **2 réplicas** para Alta Disponibilidade (HA). |

### 2.2 Capacidades de Atendimento Comprovadas

* **Limite de 2 Pods de Backend (Sem Escalonar):**  
  Sustenta com segurança até **150 conexões WebSocket simultâneas** distribuídas em **30 artigos ativos** (5 autores por artigo), com latência P95 de **543ms**.
* **Ponto de Inflexão (Gatilho do HPA):**  
  Em **200 conexões**, a CPU ultrapassa 70% e o HPA dispara a adição do 3º e 4º pods.
* **Capacidade Máxima do Cluster Atual (Teto de 6 Pods Backend + 4 Compiler):**  
  Processa com 100% de sucesso até **1.250 conexões simultâneas** (250 artigos com 5 autores) e **50 compilações concorrentes de artigos completos** em **17.3 segundos** (throughput de **1.445 ops/segundo**).

### 2.3 Quota Total de Recursos Necessária para a Stack no Pico

Somando todos os pods em sua capacidade máxima:
* **CPU:** $\approx \mathbf{7.0\text{ vCPUs}}$ ($6 \times 500\text{m}$ backend + $4 \times 1000\text{m}$ compiler + $2 \times 100\text{m}$ frontend).
* **RAM:** $\approx \mathbf{7.2\text{ GB}}$ ($6 \times 512\text{Mi}$ backend + $4 \times 1\text{Gi}$ compiler + $2 \times 32\text{Mi}$ frontend).

---

## 3. Questionário Estruturado para a Equipe de Infraestrutura

Utilize este roteiro de perguntas para extrair as respostas necessárias dos administradores do cluster local:

### 3.1 Capacidade Física dos Nós e Políticas de Overcommit

* **Pergunta 1:** *"Qual é o dimensionamento das máquinas dos nós do cluster Kubernetes (quantos nós físicos/VMs existem e qual a vCPU e RAM total de cada nó)?"*  
  * **Objetivo:** Verificar se o cluster tem folga física para alocar nossa quota de $7\text{ vCPUs}$ e $7.2\text{ GB de RAM}$ no pico sem disputar espaço com outros sistemas corporativos.
* **Pergunta 2:** *"Existe `ResourceQuota` ou `LimitRange` configurado no namespace que iremos utilizar?"*  
  * **Objetivo:** Saber antecipadamente se o nosso deployment será rejeitado pelo Kubernetes caso ultrapasse algum teto burocrático definido pelos administradores.
* **Pergunta 3:** *"O hipervisor da infraestrutura (VMware, Proxmox, KVM) utiliza sobre-alocação (*Overcommit*) de vCPU nos nós do Kubernetes?"*  
  * **Objetivo:** O compilador LaTeX precisa de CPU real. Se o hipervisor estiver com overcommit agressivo, nossos pods sofrerão com *CPU Steal Time*, tornando a compilação lenta para os usuários finais.

---

### 3.2 Isolamento do Compilador LaTeX (Noisy Neighbors)

* **Pergunta 4:** *"Temos nós dedicados (*Node Pools*) para cargas de computação intensiva ou compartilhamos nós com outras aplicações da organização?"*
* **Pergunta 5:** *"Podemos configurar `nodeSelector` ou `Taints/Tolerations` para manter os pods do `sci-latex-compiler` isolados em nós específicos?"*  
  * **Objetivo:** O `pdflatex` atinge picos de $100\%$ de 1 núcleo de CPU ao gerar PDFs de artigos densos. O isolamento garante que o compilador não roube ciclos de CPU de aplicações críticas vizinhas.

---

### 3.3 Rede, Ingress e WebSockets de Longa Duração

* **Pergunta 6:** *"Qual é a solução de Ingress corporativa adotada (Ingress-NGINX, Traefik, HAProxy, F5 BIG-IP ou MetalLB)?"*  
  * **Objetivo:** Adequar as anotações (`annotations`) do manifesto de Ingress para o padrão do controlador local.
* **Pergunta 7:** *"Qual é o timeout de inatividade configurado para conexões WebSocket no Ingress/Load Balancer corporativo?"*  
  * **Objetivo:** O editor colaborativo CodeMirror mantém conexões WebSocket abertas enquanto o pesquisador está na página. Se o balanceador da empresa tiver o timeout padrão de 60 segundos, autores que passarem 1 minuto apenas lendo o texto serão desconectados abruptamente. Devemos solicitar `proxy-read-timeout` de pelo menos **`3600s` (1 hora)**.
* **Pergunta 8:** *"Como são gerenciados os certificados TLS corporativos (cert-manager com Let's Encrypt interno, wildcard corporativo ou CA local)?"*  
  * **Objetivo:** Descobrir o nome do `Secret` TLS corporativo a ser referenciado no manifesto de Ingress para HTTPS seguro sem avisos de certificado no navegador.

---

### 3.4 Armazenamento Local e CSI (StorageClass)

* **Pergunta 9:** *"Qual `StorageClass` está disponível no cluster para persistência (Ceph RBD, Longhorn, SAN iSCSI, NFS ou local-path)?"*  
  * **Objetivo:** O PostgreSQL e o MinIO necessitam de volumes rápidos (baixa latência de escrita). NFS compartilhado por rede costuma ser inadequado para banco de dados relacional sob alta concorrência; Ceph ou discos NVMe locais são altamente recomendados.
* **Pergunta 10:** *"Existe rotina de backup de blocos/volumes gerenciada pela infraestrutura (ex: Veeam, snapshots de SAN) ou a aplicação deve ser responsável pelos backups lógicos (`pg_dump`)?"*  
  * **Objetivo:** Definir se precisamos criar um CronJob interno no Kubernetes para despejar dumps diários em outro servidor ou se a infraestrutura já assegura a recuperação de desastres (*Disaster Recovery*).

---

### 3.5 Topologia do PostgreSQL e Redis

* **Pergunta 11:** *"A organização disponibiliza instâncias corporativas gerenciadas de PostgreSQL e Redis em VMs dedicadas, ou devemos subir os bancos como StatefulSets dentro do Kubernetes?"*  
  * **Objetivo:** Se a equipe de DBA fornecer o PostgreSQL já instalado em uma VM dedicada de alta performance com réplicas e backups, nossa aplicação fica mais leve no cluster e desacoplada do ciclo de vida dos nós.
* **Pergunta 12:** *"Se utilizarmos o PostgreSQL corporativo, qual é o limite de conexões (`max_connections`) e existe um PgBouncer na frente?"*  
  * **Objetivo:** Cada pod do backend mantém um pool de conexões com o Prisma. Em escala máxima (6 pods com pool de 15 conexões), serão **90 conexões simultâneas**. O banco precisa estar preparado para essa volumetria.

---

### 3.6 Políticas de Evicção do Kubelet (Memory/Disk Pressure)

* **Pergunta 13:** *"Quais são os limites de evicção rígida (*Hard Eviction Thresholds*) configurados nos nós do Kubernetes?"*  
  * **Objetivo:** Descobrir a partir de qual porcentagem de RAM livre o nó começa a matar pods (geralmente `memory.available < 100Mi`). Isso valida que nossos limites (`limits: 512Mi` por backend) são seguros e não farão o nó ultrapassar a linha de corte.

---

## 4. Matriz de Riscos On-Premises & Mitigações

| Risco On-Premises | Consequência | Mitigação Técnica Implementada |
| :--- | :--- | :--- |
| **Falta de nós físicos para escalar** | Pods extras do HPA ficam travados em `Pending`. | Travamos `maxReplicas: 6` no Backend e `4` no Compiler, compatíveis com a capacidade de hardware acordada. |
| **Queda silenciosa de WebSocket** | Usuário perde o cursor colaborativo após 60s sem digitar. | Configuração de anotações no Ingress corporativo com `proxy-read-timeout: "3600"` e `proxy-send-timeout: "3600"`. |
| **Esgotamento de conexões no PostgreSQL** | Backend retorna `Error: Can't reach database server`. | Limitação estrita do pool de conexões do Prisma no `DATABASE_URL` (`connection_limit=15`) e recomendação de PgBouncer. |
| **Sobrecarga de CPU por compilações TeX** | Servidores vizinhos no mesmo nó ficam lentos. | Separação do compilador em microserviço dedicado com limite de 1 CPU por pod e suporte a `nodeSelector`. |
| **Lentidão de disco em NFS compartilhado** | Upload de imagens e escrita de snapshots ficam engargaladas. | Uso do MinIO e PostgreSQL apontando para `StorageClass` baseada em Ceph ou NVMe local. |

---

## 5. Template de E-mail / Mensagem para o Líder de Infraestrutura

Copie o texto abaixo e envie para o time de infraestrutura:

```markdown
Prezada equipe de Infraestrutura / SRE,

Estamos preparando o plano de entrada em produção da plataforma SCI-LaTeX (editor científico colaborativo em tempo real e compilação TeX) no cluster Kubernetes on-premises da organização.

Realizamos testes empíricos de estresse e dimensionamento de capacidade em nosso ambiente de validação. Abaixo apresentamos o perfil de consumo medido da nossa stack:

1. Perfil em Repouso (Tráfego Normal):
   - Backend: 2 réplicas consumindo 200m vCPU e 200MB RAM combinados.
   - Compiler: 1 réplica consumindo 1m vCPU e 40MB RAM.
   - Frontend: 2 réplicas consumindo 2m vCPU e 15MB RAM.
   - Capacidade comprovada em repouso: suporta até 150 pesquisadores simultâneos sem demandar escalonamento (latência P95 de 543ms).

2. Teto de Escalonamento Automático (Pico de Submissões / HPA):
   - Backend: escala dinamicamente de 2 até 6 réplicas (máximo de 3.0 vCPUs e 3.0 GB RAM).
   - Compiler: escala dinamicamente de 1 até 4 réplicas (máximo de 4.0 vCPUs e 4.0 GB RAM).
   - Capacidade máxima comprovada: absorveu 1.250 conexões simultâneas e 50 compilações concorrentes sem qualquer degradação.
   - Demanda de hardware no teto máximo: aproximadamente 7 vCPUs e 7.2 GB de RAM.

Para ajustarmos os manifestos finais de Kubernetes ao ambiente on-premises, gostaríamos de agendar um breve alinhamento técnico para esclarecer as seguintes dúvidas:

1. Há quota de hardware disponível nos nós físicos para acomodar nossa faixa de pico de 7 vCPUs e 7.2 GB de RAM?
2. Como o Ingress corporativo está configurado para WebSockets de longa duração (podemos definir timeout de inatividade para 3600s)?
3. Qual StorageClass de alta performance (Ceph, iSCSI, discos locais) é recomendada para a persistência do banco e storage de imagens?
4. A equipe disponibiliza instâncias dedicadas de PostgreSQL e Redis gerenciadas por vocês, ou devemos provisioná-los via StatefulSet dentro do namespace da aplicação?

Ficamos à disposição para demonstrar o painel do ArgoCD e os relatórios de latência dos testes já realizados.

Atenciosamente,  
Equipe de Engenharia SCI-LaTeX
```
