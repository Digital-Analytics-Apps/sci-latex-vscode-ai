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

> *"No SCIA, escolhemos o **PostgreSQL 16 com transações ACID** para garantir a governança rígida das etapas institucionais, tarefas e autoria científica. 
> 
> Para que o banco não seja sobrecarregado pela digitação colaborativa em tempo real, **desacoplamos a edição do disco**: a digitação opera na memória RAM do Pod Dono (< 2ms) e a persistência no banco é feita por **Debounce Híbrido** e checkpoints atômicos, reduzindo a escrita em **99,8%**. 
> 
> Para o ambiente de produção, a alta disponibilidade é baseada em **CloudNativePG (1 Primário + 2 Standbys com failover automático em 10-15s)** e a gestão de conexões em escala é assegurada por **PgBouncer** em Transaction Pooling."*

---

## 📋 2. Perguntas & Respostas Frequentes (FAQ de Sabatina)

---

### Q1. Capacidade & Hot Path de Digitação
> **Pergunta do Especialista:**  
> *"Vocês têm um editor colaborativo com dezenas de pesquisadores digitando simultaneamente. Como o PostgreSQL aguenta essa enxurrada de I/O por tecla?"*

**Sua Resposta:**
* **Nenhum caractere digitado gera escrita imediata no banco de dados.**
* A sincronização em tempo real opera estritamente na **memória RAM do Pod Dono** via WebSockets utilizando Transformação Operacional (OT com `@codemirror/collab`).
* A persistência no PostgreSQL ocorre de forma assíncrona por **Debounce Híbrido Multi-Critério**:
  1. *Por inatividade:* 3 segundos após o autor parar de digitar.
  2. *Por teto máximo contínuo:* a cada 15 segundos de digitação ininterrupta.
  3. *Por volume:* a cada lote de 50 operações acumuladas.
* **Resultado prático:** 1.000 teclas digitadas transformam-se em apenas 1 ou 2 transações ACID no PostgreSQL. O banco recebe apenas checkpoints limpos e consistentes.

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
* Para produção no Kubernetes (On-Premises), a topologia é gerenciada pelo operador **CloudNativePG (ou Patroni)**:
  * **Topologia de 3 Instâncias:** 1 Primário (Read/Write) + 2 Standbys (Read-Only com replicação física de WALs).
  * **Isolamento Físico Obrigatório:** Configuração com `podAntiAffinity` para garantir que as 3 instâncias residam em servidores físicos distintos.
* **Failover Transparente:** Se o nó Primário cair, o operador elege e promove uma réplica em **10 a 15 segundos**, sem necessidade de intervenção humana.
* **Resiliência na Aplicação:** Durante os segundos de failover, o Backend Fastify segura os rascunhos em memória RAM e reconecta ao novo primário de forma idempotente, sem perda de dados para o autor.

---

### Q4. Réplicas de Leitura (*Read Replicas*): Por que NÃO usar agora?
> **Pergunta do Especialista:**  
> *"Vocês já utilizam ou pretendem subir Read Replicas para balancear as consultas de leitura?"*

**Sua Resposta (Demonstra maturidade sênior de engenharia):**
* **Não utilizamos Read Replicas no momento para evitar otimização prematura e o problema de *Replication Lag*.**
* Em réplicas assíncronas, existe um atraso de milissegundos. Se um pesquisador concluir uma tarefa na Etapa 2 e a tela fizer um recarregamento (*refetch*), a consulta de leitura pode bater na réplica defasada e a tarefa continuará aparecendo como "pendente" (*Read-Your-Writes inconsistency*).
* Um único nó PostgreSQL 16 bem indexado aguenta facilmente de **5.000 a 15.000 consultas por segundo**.
* **Gatilho de Adoção Objetivo:** Só introduziremos réplicas dedicadas de leitura se a CPU do Primário ultrapassar **75% de uso contínuo** e as métricas (`pg_stat_statements`) provarem que o gargalo vem de relatórios analíticos pesados do gestor ou varreduras em massa do SciAI.

---

### Q5. Escala de Conexões & PgBouncer
> **Pergunta do Especialista:**  
> *"E se o Kubernetes escalar o Backend para 10 ou 20 pods? Isso não vai exaurir o limite de conexões (`max_connections`) do PostgreSQL?"*

**Sua Resposta:**
* No ambiente de desenvolvimento/MVP atual com pod único, o pool nativo do Prisma Client (`connection_limit=15`) atende com folga.
* Para produção com auto-scaling horizontal de pods (HPA), a arquitetura especifica formalmente o **PgBouncer** em modo **Transaction Pooling**:
  * **Porta 6543 (PgBouncer):** Roteia todas as transações das aplicações Fastify. 20 pods com milhares de conexões virtuais compartilham um pool compacto de **apenas 20 a 30 conexões físicas reais** no PostgreSQL.
  * **Porta 5432 (Postgres Direto):** Reservada exclusivamente para migrações do Prisma (`prisma migrate deploy` / DDL) e ferramentas de monitoramento.

---

### Q6. Concorrência & Prevenção de Conflitos (Fencing Token Monotônico)
> **Pergunta do Especialista:**  
> *"Em um ambiente multi-pod, o que impede um pod antigo (que sofreu partição de rede) de gravar no banco e corromper o documento com dados defasados?"*

**Sua Resposta:**
* Implementamos **Fencing Tokens monotônicos** integrados ao PostgreSQL ([ADR-007.1](file:///mnt/c0b6217c-c2f3-4c1f-8ba2-c8d177f718a9/development/professional/sci-latex-vscode/docs/planning/adrs/adr-007.1-document-ownership-fencing-and-routing.md)):
  * A tabela `Project` possui a coluna `ownerGeneration Int` gerenciada no PostgreSQL.
  * Quando um Pod assume a posse de um documento, ele adquire um lease no Redis com número de geração monotônico.
  * Ao gravar o checkpoint no banco, a query relacional executa atomicamente:
    ```sql
    UPDATE "Project" 
    SET "content" = :txt, "currentVersion" = :v, "ownerGeneration" = :myGen
    WHERE "id" = :id AND "ownerGeneration" <= :myGen;
    ```
  * Se o pod foi destronado enquanto estava desconectado, o PostgreSQL detecta que `currentProject.ownerGeneration > data.ownerGeneration` e **aborta a transação na hora**, impedindo anomalias de *Split-Brain*.

---

### Q7. Backups, RTO e RPO (Disaster Recovery)
> **Pergunta do Especialista:**  
> *"Quais são os SLOs de recuperação de desastres (RPO e RTO) do banco de dados?"*

**Sua Resposta:**
* **RPO (Recovery Point Objective - perda máxima tolerável):** **Inferior a 1 segundo**. Garantido pelo arquivamento contínuo de WALs (*Write-Ahead Logging*) sincronizados para o Object Storage MinIO.
* **RTO (Recovery Time Objective - tempo de recuperação):**
  * **10 a 15 segundos** para falhas de nó local (failover automático do CloudNativePG promovendo o Standby).
  * **Restauração Completa via PITR (*Point-in-Time Recovery*):** Permite restaurar o banco exatamente no estado de qualquer segundo no passado em caso de corrupção humana ou desastre catastrófico.

---

### Q8. Auditoria, Imutabilidade e Conformidade (LGPD)
> **Pergunta do Especialista:**  
> *"Como vocês garantem que os logs de auditoria não sejam apagados ou adulterados por um usuário ou administrador?"*

**Sua Resposta:**
* A tabela `AuditLog` utiliza relacionamento com usuário configurado como `onDelete: SetNull`. Se um usuário for excluído, o payload original e o histórico de ações permanecem congelados na coluna `details Json?`.
* No nível do PostgreSQL em produção, a tabela de auditoria recebe restrição SQL estrita:
  ```sql
  REVOKE UPDATE, DELETE ON TABLE "AuditLog" FROM "scia_app_user";
  GRANT INSERT, SELECT ON TABLE "AuditLog" TO "scia_app_user";
  ```
* Isso garante que a própria aplicação só tenha permissão de inserção e leitura, tornando o histórico de auditoria **efetivamente imutável** contra invasões ou erros operacionais.

---

## 📊 3. Resumo Visual dos Trunfos de Engenharia

| Dimensão | Como Outros Fazem | Como o SCIA Faz | Por que a Abordagem do SCIA é Melhor? |
| :--- | :--- | :--- | :--- |
| **Colaboração em Tempo Real** | Escreve cada tecla no banco ou NoSQL | RAM do Pod Dono + Debounce Híbrido | Latência sub-milissegundo (< 2ms) e redução de 99,8% de I/O no banco. |
| **Armazenamento de Imagens** | Grava binários em Base64/Blob no banco | MinIO S3 via URLs pré-assinadas | Banco leve, backups instantâneos e zero consumo de RAM no backend. |
| **Escala de Conexões** | Centenas de conexões diretas no Postgres | PgBouncer (Transaction Pooling) | Multiplexa centenas de pods em 20 conexões físicas reais no Postgres. |
| **Prevenção de Split-Brain** | Espera lock do banco ou confia na rede | Fencing Monotônico (`ownerGeneration`) | Imune a partições de rede; o próprio PostgreSQL rejeita writes defasados. |
| **Tolerância a Falhas** | 1 nó com backup diário em cronjob | CloudNativePG (1 Primário + 2 Standbys) | Failover automático em 10-15s com RPO < 1s. |
