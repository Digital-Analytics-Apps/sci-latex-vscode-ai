# 🗄️ Guia de Defesa & FAQ de Banco de Dados para Especialistas (SCIA)

- **Status:** VIGENTE / REFERÊNCIA PARA APRESENTAÇÕES E AUDITORIAS TÉCNICAS
- **Data:** 10 de Novembro de 2026
- **Público-Alvo:** DBAs, Arquitetos de Soluções, Engenheiros de Infraestrutura e Comitês Técnicos
- **Documentos Técnicos Relacionados:** 
  - [`docs/planning/adrs/adr-015-postgresql-scalability-ha-pgbouncer-and-read-replicas.md`](planning/adrs/adr-015-postgresql-scalability-ha-pgbouncer-and-read-replicas.md) — *ADR Oficial de Escalabilidade, HA, PgBouncer e Read Replicas*
  - [`docs/DATABASE.md`](DATABASE.md) — *Especificação Técnica do Banco, ERD e Dicionário de Dados*
  - [`docs/ANALISE_ESCALABILIDADE_RECUPERACAO_POSTGRES.md`](ANALISE_ESCALABILIDADE_RECUPERACAO_POSTGRES.md) — *Análise de HA, PgBouncer e Failover*
  - [`docs/planning/adrs/adr-007.1-document-ownership-fencing-and-routing.md`](planning/adrs/adr-007.1-document-ownership-fencing-and-routing.md) — *Fencing Tokens contra Split-Brain*

---

## ⚡ 1. Pitch Executivo de 30 Segundos (Elevator Pitch)

> *"No SCIA, escolhemos o **PostgreSQL 16 com transações ACID** para garantir a integridade da governança institucional, etapas e autoria científica. 
> 
> Para que o banco não seja sobrecarregado pela digitação colaborativa, **desacoplamos a edição do disco**: a digitação opera na memória RAM do Pod Dono (< 2ms) e a persistência é feita por **Debounce Híbrido** periódico, enquanto a proteção contra perda de operações em voo caso o pod sofra crash reside no **buffer local do cliente CodeMirror**, que reexecuta o rebase automaticamente.
> 
> Para o ambiente de produção, a alta disponibilidade é baseada no **CloudNativePG (1 Primário + 2 Standbys com failover automático em 10-15s)** e a gestão de conexões em escala é assegurada por **PgBouncer em HA** com Transaction Pooling na porta 6543, reservando a porta direta 5432 exclusivamente para migrações DDL."*

---

## 📋 2. Perguntas & Respostas Frequentes (FAQ de Sabatina)

---

### Q1. Capacidade & Hot Path de Digitação
> **Pergunta do Especialista:**  
> *"Vocês têm um editor colaborativo com dezenas de pesquisadores digitando simultaneamente. Como o PostgreSQL aguenta essa enxurrada de I/O por tecla?"*

**Sua Resposta:**
* **Nenhum caractere digitado gera escrita imediata no banco de dados.**
* A sincronização em tempo real opera estritamente na **memória RAM do Pod Dono** via WebSockets com Transformação Operacional (`@codemirror/collab`).
* A persistência no PostgreSQL ocorre de forma assíncrona por **Debounce Híbrido**:
  1. *Por inatividade:* 3 segundos após o autor parar de digitar.
  2. *Por teto máximo contínuo:* a cada 15 segundos ininterruptos de digitação.
  3. *Por volume:* a cada lote de 50 operações acumuladas.
* **E se o Pod do backend cair antes do checkpoint?**
  * O editor CodeMirror Collab no navegador do usuário retém os deltas locais não confirmados (`pendingUpdates`).
  * Ao reconectar no novo Pod Dono eleito, o cliente consulta a versão do banco via `PULL_UPDATES` e faz o **rebase e reenvio automático das edições pendentes**, garantindo que nenhum texto seja perdido mesmo com falhas de processo.

---

### Q2. Escolha Tecnológica: Por que PostgreSQL e não MongoDB?
> **Pergunta do Especialista:**  
> *"Editores históricos como Overleaf/ShareLaTeX utilizavam MongoDB. Por que vocês optaram por PostgreSQL 16?"*

**Sua Resposta:**
* O modelo do Overleaf/MongoDB agrupava todo o projeto (dezenas de arquivos TeX, histórico e pastas) em um único documento BSON gigante de 20MB a 50MB, sofrendo com fragmentação de memória, mutações pesadas e ausência de integridade relacional nativa.
* No SCIA, fizemos duas escolhas arquiteturais superiores:
  1. **Segregação Estrita de Binários:** Figuras, PDFs compilados e evidências não entram no banco relacional; vão diretamente para o Object Storage S3 (**MinIO**) via URLs pré-assinadas.
  2. **Integridade ACID para Governança:** O SCIA possui regras de negócio complexas: uma régua imutável de **6 Etapas institucionais**, travas invioláveis de Gatekeepers (**Etapa 5 NIT 🔒** e **Etapa 6 Congresso Alvo 🔒**), árvore de tarefas com dependências e comentários de revisão inline. Isso exige chaves estrangeiras com cascata segura, transações atômicas e histórico imutável — qualidades nativas do PostgreSQL.

---

### Q3. Alta Disponibilidade (HA) & Failover Automático
> **Pergunta do Especialista:**  
> *"Como vocês garantem alta disponibilidade? Se a máquina do banco travar ou reiniciar, o que acontece?"*

**Sua Resposta:**
* Para produção no Kubernetes (On-Premises), adotamos formalmente o operador **CloudNativePG**:
  * **Topologia de 3 Instâncias:** 1 Primário (Read/Write) + 2 Standbys (Read-Only com replicação física de WALs).
  * **Isolamento de Hardware:** Configuração de `podAntiAffinity` obrigatória (`topologyKey: kubernetes.io/hostname`) exigindo no mínimo 3 nós Kubernetes distintos no cluster.
* **Meta de RTO no Failover:** O operador detecta a falha e promove automaticamente um Standby com **meta de RTO entre 10 a 15 segundos** (detecção + promoção + chaveamento de Service K8s).
* **Resiliência na Aplicação:** Durante os segundos de transição, o Backend Fastify segura as operações em memória e reconecta ao novo primário de forma idempotente, sem perda de dados para o autor.

---

### Q4. Réplicas de Leitura (*Read Replicas*): Por que NÃO usar agora?
> **Pergunta do Especialista:**  
> *"Vocês já utilizam ou pretendem subir Read Replicas para balancear as consultas de leitura?"*

**Sua Resposta (Demonstra maturidade sênior de engenharia):**
* **Não utilizamos réplicas de leitura no momento por ausência de necessidade comprovada e para evitar inconsistência de *Replication Lag*.**
* Em réplicas assíncronas, há um atraso de sincronização. Se um pesquisador avança a etapa de um projeto e a tela recarrega, a consulta pode bater na réplica defasada exibindo a etapa anterior (*quebra de Read-Your-Writes*).
* Um único nó PostgreSQL 16 sobre hardware dedicado com índices B-Tree bem definidos atende plenamente ao volume acadêmico projetado.
* **Gatilho de Adoção Objetivo:** Só introduziremos réplicas dedicadas para leitura diante de uma **métrica composta de degradação** comprovada:
  * Latência P95 das consultas > 500 ms de forma sustentada;
  * Saturação contínua de I/O de armazenamento;
  * Relatórios do `pg_stat_statements` provando que o consumo decorre de consultas analíticas pesadas (dashboards gerenciais ou varreduras em lote do SciAI), que serão então isoladas em réplicas de leitura específicas.

---

### Q5. Escala de Conexões & PgBouncer
> **Pergunta do Especialista:**  
> *"E se o Kubernetes escalar o Backend para 10 ou 20 pods? Isso não vai exaurir o limite de conexões (`max_connections`) do PostgreSQL?"*

**Sua Resposta:**
* No ambiente de desenvolvimento/MVP atual com pod único, o pool nativo do Prisma Client (`connection_limit=15`) atende com folga.
* Para produção com auto-scaling horizontal de pods (HPA), a arquitetura especifica o **PgBouncer provisionado em Alta Disponibilidade (mínimo 2 réplicas)** em modo **Transaction Pooling**:
  * **Porta 6543 (PgBouncer):** Roteia todas as transações das aplicações Fastify. Dezenas de pods com centenas de conexões clientes compartilham uma capacidade física inicial planejada de **20 a 30 conexões reais no PostgreSQL**, ajustável sob testes de carga.
  * **Porta 5432 (Postgres Direto):** Reservada obrigatoriamente para migrações do Prisma (`npx prisma migrate deploy` via `DIRECT_URL`) e ferramentas de monitoramento. **Nenhuma migração DDL trafega pelo pooler transacional.**

---

### Q6. Concorrência & Prevenção de Conflitos (Fencing Token Monotônico)
> **Pergunta do Especialista:**  
> *"Em um ambiente multi-pod, o que impede um pod antigo (que sofreu partição de rede) de gravar no banco e corromper o documento com dados defasados?"*

**Sua Resposta:**
* Implementamos **Fencing Tokens monotônicos** integrados ao PostgreSQL ([ADR-007.1](file:///mnt/c0b6217c-c2f3-4c1f-8ba2-c8d177f718a9/development/professional/sci-latex-vscode/docs/planning/adrs/adr-007.1-document-ownership-fencing-and-routing.md)):
  * A tabela `Project` mantém a coluna relacional `ownerGeneration Int @default(0)`.
  * Ao assumir o documento, o Pod adquire um número de geração estritamente monotônico no Redis.
  * Na persistência atômica do checkpoint no PostgreSQL, a gravação valida atomicamente:
    ```sql
    UPDATE "Project" 
    SET "currentVersion" = :newVersion, "ownerGeneration" = :myGen
    WHERE "id" = :id 
      AND "ownerGeneration" = :myGen 
      AND "currentVersion" = :expectedOldVersion;
    ```
  * No código atual ([`documents.repository.ts`](file:///mnt/c0b6217c-c2f3-4c1f-8ba2-c8d177f718a9/development/professional/sci-latex-vscode/backend/src/modules/documents/documents.repository.ts#L151-L168)), a transação aborta imediatamente com erro `[Fencing Token Conflict]` se a geração no banco for superior à geração do processo, impedindo anomalias de *Split-Brain*.

---

### Q7. Backups, RTO e RPO (Disaster Recovery)
> **Pergunta do Especialista:**  
> *"Quais são os SLOs de recuperação de desastres (RPO e RTO) do banco de dados?"*

**Sua Resposta:**
* Separamos com clareza o failover local de desastres catastróficos:
  * **RPO em Operação Normal (Failover de Nó):** **Sub-segundo (< 1s)**, garantido pela replicação física por streaming contínuo de WALs para os Standbys.
  * **RTO para Queda de Nó:** **10 a 15 segundos** (meta de engenharia do CloudNativePG para promover o Standby e redirecionar o tráfego).
  * **Disaster Recovery Catastrófico:** Gerenciado via Barman Cloud integrado ao CloudNativePG com backups-base diários no MinIO/S3 e arquivamento de segmentos de WAL. Permite **Point-in-Time Recovery (PITR)** para restaurar o banco exatamente no segundo desejado, com RTO de minutos a horas conforme o volume de dados.

---

### Q8. Auditoria, Imutabilidade e Conformidade (LGPD)
> **Pergunta do Especialista:**  
> *"Como vocês garantem que os logs de auditoria não sejam apagados ou adulterados por um usuário ou invasor da aplicação?"*

**Sua Resposta:**
* A tabela `AuditLog` utiliza relacionamento com usuário configurado como `onDelete: SetNull`. Se um usuário for excluído, o payload original e o histórico de ações permanecem congelados na coluna `details Json?`.
* No nível do PostgreSQL em produção, a tabela de auditoria recebe restrição SQL estrita:
  ```sql
  REVOKE UPDATE, DELETE ON TABLE "AuditLog" FROM "scia_app_user";
  GRANT INSERT, SELECT ON TABLE "AuditLog" TO "scia_app_user";
  ```
* Isso garante que a role utilizada pela aplicação Fastify **não tenha permissão SQL de modificar ou deletar logs**, tornando o histórico de auditoria protegido contra falhas operacionais ou ataques de injeção de SQL.

---

## 📊 3. Resumo Visual dos Trunfos de Engenharia

| Dimensão | Como Outros Fazem | Como o SCIA Faz | Por que a Abordagem do SCIA é Melhor? |
| :--- | :--- | :--- | :--- |
| **Colaboração em Tempo Real** | Escreve cada tecla no banco ou NoSQL | RAM do Pod Dono + Debounce Híbrido | Latência sub-milissegundo (< 2ms) e checkpoints limpos no banco. |
| **Resiliência do Editor** | Confia que o servidor nunca vai cair | Buffer local CodeMirror (`pendingUpdates`) | Se o pod cair, o cliente faz rebase e reenvio automático pós-reconexão. |
| **Armazenamento de Imagens** | Grava binários em BLOB no banco | MinIO S3 via URLs pré-assinadas | Banco leve, backups ágeis e zero consumo de RAM no backend. |
| **Escala de Conexões** | Conexões diretas de cada pod no Postgres | PgBouncer HA (Transaction Pooling :6543) | Multiplexa centenas de pods em pool físico compacto de 20-30 conexões reais. |
| **Migrações de Esquema** | Passa DDLs pelo pooler de conexões | Porta Direta 5432 (`DIRECT_URL`) | Evita falhas de lock e incompatibilidade do Schema Engine do Prisma. |
| **Prevenção de Split-Brain** | Espera lock do banco ou confia na rede | Fencing Monotônico (`ownerGeneration`) | Imune a partições de rede; o próprio PostgreSQL rejeita writes defasados. |
| **Alta Disponibilidade** | 1 nó com backup diário em cronjob | CloudNativePG (1 Primário + 2 Standbys) | Failover automático em 10-15s com replicação física de WALs. |
