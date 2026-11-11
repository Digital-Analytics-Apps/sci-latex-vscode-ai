# ADR 015: Estratégia de Escalabilidade Relacional, Alta Disponibilidade (CloudNativePG), Pooler de Conexões (PgBouncer) e Adiamento de Read Replicas no PostgreSQL 16

- **Status:** APROVADO / VIGENTE
- **Data:** 10 de Novembro de 2026
- **Autor(es):** Equipe de Arquitetura, Engenharia de Dados e Infraestrutura SCIA
- **Domínio:** Persistência Relacional ACID, Alta Disponibilidade (HA), Gestão de Conexões (PgBouncer), Adiamento de Read Replicas, Fencing Monotônico e Disaster Recovery (RPO/RTO)
- **Componentes Relacionados:** 
  - `backend`: `src/db/prisma.ts`, `prisma/schema.prisma`, `src/modules/documents/documents.repository.ts`, `src/config/env.ts`
  - `docs`: [`DATABASE.md`](../../DATABASE.md), [`FAQ_BANCO_DE_DADOS_ESPECIALISTAS.md`](../../FAQ_BANCO_DE_DADOS_ESPECIALISTAS.md), [`ANALISE_ESCALABILIDADE_RECUPERACAO_POSTGRES.md`](../../ANALISE_ESCALABILIDADE_RECUPERACAO_POSTGRES.md)
  - `k8s`: `k8s/manifests/backend-cluster.yaml`, `k8s/manifests/secret.example.yaml`

---

## ⚡ Guia Rápido & Resumo Executivo ("Elevator Pitch")

> [!TIP]
> **Consulte esta seção para defesas técnicas rápidas em sabatinas com DBAs e especialistas em infraestrutura.**

### 1. Resumo da Decisão de Banco de Dados (em 4 pontos):
1. **Desacoplamento do Hot Path de Digitação:** O PostgreSQL **não sofre I/O a cada tecla digitada**. A edição colaborativa opera em memória RAM no Pod Dono via WebSockets (< 2ms) e a persistência é feita por **Debounce Híbrido** (3s inativo / 15s contínuo / 50 ops), reduzindo a escrita no banco em mais de **99,8%**.
2. **Alta Disponibilidade em Produção:** Adoção do operador **CloudNativePG** (ou Patroni) em topologia de **3 instâncias (1 Primário + 2 Standbys com replicação física de WALs)** e `podAntiAffinity` em nós físicos diferentes. Failover automático em **10 a 15 segundos** sem intervenção humana.
3. **Adiamento Deliberado de Read Replicas:** Não usamos réplicas de leitura no momento para **evitar inconsistências graves de *Replication Lag / Read-Your-Writes*** (ex: usuário conclui tarefa e, ao recarregar a tela, a consulta atinge réplica defasada exibindo a tarefa como pendente). Um nó bem indexado suporta 15.000 queries/s. Gatilho objetivo para adoção futura: **CPU do Primário > 75% contínuo** comprovada por consultas analíticas via `pg_stat_statements`.
4. **Pooler de Conexões em Escala (PgBouncer):** Para evitar o esgotamento de conexões (`max_connections`) quando o HPA escalar o backend Fastify para dezenas de pods, a arquitetura especifica o **PgBouncer na porta 6543** em modo *Transaction Pooling*, multiplexando centenas de pods em apenas 20 a 30 conexões físicas reais no Postgres.

---

## 1. Contexto & Motivação

O **SCIA (Scientific Collaboration and Intelligent Assistance)** gerencia a escrita concorrente de artigos científicos de alta relevância acadêmica e institucional. 

Historicamente, editores colaborativos (como ShareLaTeX / Overleaf) utilizavam bancos NoSQL orientados a documentos (MongoDB) armazenando toda a árvore do projeto (dezenas de arquivos TeX, pastas e histórico) em documentos BSON gigantescos de 20 a 50 MB, sofrendo com fragmentação severa de memória, lock de escrita em documentos compartilhados e ausência de garantias relacionais.

### O Modelo Diferenciado do SCIA:
1. **Segregação Estrita de Binários:** PDFs compilados, imagens, gráficos e arquivos de evidências são armazenados exclusivamente em Object Storage S3 compatível (**MinIO**), mantendo o banco relacional enxuto e ágil.
2. **Governança Institucional e Integridade ACID:** A plataforma opera sobre uma régua imutável de **6 Etapas Fixas**, travas de Gatekeeper invioláveis (**Etapa 5 NIT 🔒** e **Etapa 6 Congresso Alvo 🔒**), matriz de tarefas e anotações inline de revisão. Essa complexidade exige **transações ACID atômicas, chaves estrangeiras com cascata restrita e histórico de auditoria imutável**.
3. **Escala Horizontal de Aplicação:** O Backend Fastify escala horizontalmente via HPA no Kubernetes, necessitando de uma estratégia clara para não exaurir conexões físicas do banco de dados sob rajadas de uso.

---

## 2. Decisões Arquiteturais Adotadas

```mermaid
flowchart TD
    subgraph Clients["Camada de Aplicação (Pods Fastify com Auto-Scaling)"]
        Pod1["Backend Pod 1"]
        Pod2["Backend Pod 2"]
        PodN["Backend Pod N"]
    end

    subgraph PoolerTier["Camada de Multiplexação de Conexões"]
        PgBouncer["PgBouncer :6543 (Transaction Pooling)"]
    end

    subgraph ClusterPG["Cluster de Alta Disponibilidade (CloudNativePG)"]
        Primary[("PostgreSQL 16 :5432 (Primary RW)")]
        Standby1[("PostgreSQL 16 (Standby 1 RO)")]
        Standby2[("PostgreSQL 16 (Standby 2 RO)")]
    end

    subgraph StorageTier["Disaster Recovery & Off-Site"]
        MinIOWal[("MinIO S3 - WAL Archiving Contínuo")]
    end

    Pod1 -->|"Transações CRUD & Checkpoints"| PgBouncer
    Pod2 -->|"Transações CRUD & Checkpoints"| PgBouncer
    PodN -->|"Transações CRUD & Checkpoints"| PgBouncer
    PgBouncer -->|"20 Conexões Físicas Reais"| Primary

    Primary -->|"Streaming Físico de WALs"| Standby1
    Primary -->|"Streaming Físico de WALs"| Standby2
    Primary -->|"WAL Archive Contínuo (RPO < 1s)"| MinIOWal
    Standby1 -.->|"Failover Automático (10-15s)"| Primary
```

---

### 2.1. Desacoplamento de I/O de Escrita via Debounce Híbrido (Alívio de 99,8%)
* **Problema:** Em colaboração em tempo real, 100 autores digitando simultaneamente geram ~500 a 1.000 eventos de teclado por segundo. Gravar cada tecla no banco satura qualquer SGBD relacional com locks e `fsync` de disco.
* **Decisão:** A colaboração ocorre na **memória RAM do Pod Dono** via WebSockets (Transformação Operacional `@codemirror/collab`) com latência P95 sub-milissegundo (< 2ms).
* **Persistência Assíncrona:** A gravação no PostgreSQL só ocorre via **Debounce Híbrido Multi-Critério**:
  1. *Por inatividade:* 3 segundos após a última tecla.
  2. *Por teto máximo contínuo:* a cada 15 segundos ininterruptos de digitação.
  3. *Por volume:* a cada 50 operações de deltas acumuladas.
* A gravação unifica a versão canônica do projeto, os arquivos complementares e o snapshot de histórico em uma única transação atômica (`prisma.$transaction`).

---

### 2.2. Topologia de Alta Disponibilidade em Produção (CloudNativePG / Patroni)
* **Topologia:** Cluster de **3 instâncias (1 Primary + 2 Standby Replicas)** gerenciado por operador CloudNativePG no Kubernetes.
* **Isolamento de Hardware:** Aplicação de `podAntiAffinity` com topologia `kubernetes.io/hostname: requiredDuringSchedulingIgnoredDuringExecution`. Nenhuma réplica pode residir no mesmo servidor físico do nó primário.
* **Mecanismo de Eleição & Failover:**
  * Replicação física por streaming assíncrono de WALs (*Write-Ahead Logging*).
  * Eleição via primitivas de lease distribuídas no Kubernetes API/etcd.
  * Em caso de falha de hardware ou kernel panic do nó primário, a promoção da réplica ocorre automaticamente em **10 a 15 segundos** sem intervenção humana.
  * **Classificação PACELC:** O sistema escolhe **PC/EC (Consistência sobre Disponibilidade)**. Durante a janela de 10-15s de failover, as escritas no banco são pausadas para proteger a integridade dos dados e reconectadas ao novo primário de forma idempotente.

---

### 2.3. Pôstergação Deliberada de Read Replicas (Prevenção de Inconsistência)
* **Decisão:** Adiar a introdução de réplicas dedicadas para leitura até que haja comprovação objetiva de necessidade.
* **Justificativa Técnica:**
  1. **Inconsistência de *Read-Your-Writes*:** Réplicas de leitura assíncronas sofrem de atraso de replicação (*Replication Lag* de dezenas a centenas de milissegundos). Se um pesquisador conclui uma tarefa e recarrega a página, a consulta pode bater na réplica defasada e a tarefa continuará aparecendo como pendente, gerando inconsistências visíveis e chamados de suporte.
  2. **Capacidade do Nó Único:** O PostgreSQL 16 com índices B-Tree bem definidos (no [`schema.prisma`](../../backend/prisma/schema.prisma)) atende com folga de **5.000 a 15.000 queries por segundo** em um único nó com 4 vCPUs e 16 GB RAM. O tráfego do SCIA não satura essa capacidade.
* **Gatilho Objetivo para Adoção Futura:** Read Replicas só serão avaliadas se a **utilização média de CPU do nó Primário ultrapassar 75% de forma contínua por 7 dias**, acompanhada de relatório do `pg_stat_statements` provando que o consumo decorre de consultas analíticas pesadas (dashboards do gestor/NIT ou varreduras em massa do SciAI).

---

### 2.4. Gestão de Conexões em Escala Horizontal (PgBouncer em Transaction Pooling)
* **Problema:** Cada processo Fastify em Node.js mantém um pool local de conexões TCP. Se o HPA do Kubernetes escalar a aplicação para 10 ou 20 pods, o número de conexões ociosas abertas exaure o parâmetro `max_connections` (100 a 200) do PostgreSQL, degradando a memória por overhead de processos backend (`fork` do Postgres).
* **Decisão:** Inserção do **PgBouncer** entre os pods do backend e o cluster PostgreSQL:
  * **Porta 6543 (PgBouncer - Transaction Pooling):** Roteia todo o tráfego do Fastify (`DATABASE_URL="postgresql://...?pgbouncer=true"`). Centenas de pods virtuais compartilham um pool compacto de apenas **20 a 30 conexões físicas reais** no PostgreSQL.
  * **Porta 5432 (PostgreSQL Direto):** Reservada exclusivamente para rotinas DDL de migração de esquema (`npx prisma migrate deploy`), tarefas de manutenção e ferramentas de monitoramento.
  * **Compatibilidade Prisma 7:** Configuração de `max_prepared_statements` no PgBouncer 1.21+ ou driver `@prisma/adapter-pg` com prepared statements anônimos para garantir compatibilidade com transaction pooling.

---

### 2.5. Prevenção de Conflitos e Pods Zumbis via Fencing Monotônico (`ownerGeneration`)
* **Problema:** Em caso de partição de rede temporária no cluster, um Pod antigo pode ficar "zumbi" e tentar persistir edições defasadas no banco após outro Pod ter assumido a liderança do documento (*Split-Brain*).
* **Decisão (Alinhada à ADR-007.1):**
  * A tabela `Project` possui a coluna relacional `ownerGeneration Int @default(0)`.
  * Ao assumir o documento, o Pod adquire um número monotônico incrementado no Redis.
  * Na persistência atômica do checkpoint no PostgreSQL ([`documents.repository.ts`](../../backend/src/modules/documents/documents.repository.ts)), a query valida:
    ```sql
    UPDATE "Project" 
    SET "content" = :txt, "currentVersion" = :v, "ownerGeneration" = :myGen
    WHERE "id" = :id AND "ownerGeneration" <= :myGen;
    ```
  * Se o pod foi destronado, a condição de where falha, a geração no banco é superior e a transação **aborta atomicamente**, garantindo que o PostgreSQL seja a autoridade final contra split-brain.

---

### 2.6. Imutabilidade de Auditoria & Disaster Recovery (SLOs)
1. **Imutabilidade SQL do AuditLog:**
   * A tabela `AuditLog` possui relação com usuário com `onDelete: SetNull`. Se um pesquisador for descadastrado, o log institucional e os metadados em JSONB permanecem congelados.
   * Em produção, o usuário da aplicação sofre restrição no SGBD:
     ```sql
     REVOKE UPDATE, DELETE ON TABLE "AuditLog" FROM "scia_app_user";
     GRANT INSERT, SELECT ON TABLE "AuditLog" TO "scia_app_user";
     ```
2. **SLOs de Recuperação de Desastres:**
   * **RPO (Recovery Point Objective):** **< 1 segundo**. Garantido pelo arquivamento contínuo de WALs transmitidos para o MinIO/S3.
   * **RTO (Recovery Time Objective):** **10 a 15 segundos** para falha de nó (failover automático do CloudNativePG promovendo o Standby) e suporte completo a Point-in-Time Recovery (PITR) para recuperação contra erros humanos ou corrupção de dados.

---

## 3. Matriz Consolidada de Decisões & Trade-Offs

| Dimensão | Opção Adotada no SCIA | Alternativas Rejeitadas | Justificativa do Trade-Off |
| :--- | :--- | :--- | :--- |
| **SGBD Primário** | **PostgreSQL 16 (ACID)** | MongoDB, DynamoDB | Governança estrita das 6 etapas, chaves estrangeiras com cascata e atomicidade transacional. |
| **Armazenamento de Binários** | **MinIO S3 (URLs Pré-assinadas)** | Armazenamento em BLOB no Postgres | Mantém o banco leve, backups ágeis e zero sobrecarga de RAM no backend. |
| **Colaboração em Tempo Real** | **RAM Pod Dono + Debounce Híbrido** | Gravação no banco a cada caractere | Elimina gargalo de I/O (redução de 99,8% de gravações) e garante latência sub-milissegundo. |
| **Alta Disponibilidade** | **CloudNativePG (1 Primário + 2 Standbys)** | Instância única sem failover / CockroachDB | Failover automático em 10-15s com custo de infraestrutura viável e maturidade comprovada. |
| **Gestão de Conexões** | **PgBouncer (Transaction Pooling :6543)** | Conexões diretas de cada pod do Fastify | Impede esgotamento de `max_connections` quando o HPA escalar pods de aplicação. |
| **Réplicas de Leitura** | **Adiado (Nó Único bem indexado)** | Read Replicas ativas prematuramente | Evita bugs graves de *Replication Lag* (*Read-Your-Writes*). Adoção vinculada a CPU > 75%. |
| **Prevenção de Split-Brain** | **Fencing Monotônico (`ownerGeneration`)** | Confiança cega em locks de rede | PostgreSQL rejeita atomicamente gravações defasadas de pods zumbis. |

---

## 4. Plano de Implementação e Transição por Ambiente

### 🗓️ Ambiente de Desenvolvimento & Staging Local:
* Manter **PostgreSQL 16 único** (`postgres:16-alpine`) no `docker-compose.yml` com conexão direta na porta `5432`.
* Pool de conexões controlado pelo Prisma Client (`connection_limit=15`).
* Fencing tokens e debounce híbrido ativos no código.

### 🗓️ Ambiente de Produção Kubernetes (On-Premises):
* Instalação do operador **CloudNativePG** provisionando o cluster de 3 instâncias com `podAntiAffinity`.
* Configuração do manifesto do **PgBouncer** expondo a porta `6543` no namespace `scia`.
* Atualização do `DATABASE_URL` no secret do cluster para apontar para o PgBouncer:
  ```env
  DATABASE_URL="postgresql://scia_user:secret@pgbouncer:6543/sci_latex_db?pgbouncer=true"
  DIRECT_URL="postgresql://scia_user:secret@postgres-cluster-rw:5432/sci_latex_db"
  ```
* Ativação da política de arquivamento contínuo de WALs no MinIO para garantir RPO < 1s.
