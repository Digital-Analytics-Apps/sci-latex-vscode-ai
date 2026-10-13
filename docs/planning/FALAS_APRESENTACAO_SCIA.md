# 🎙️ Script Fala a Fala: Apresentação Executiva e Técnica do SCIA
## Scientific Collaboration + AI (Plataforma Web Self-Hosted)

> **Guia de Oratória e Falas Prontas**  
> Use este roteiro durante a sua apresentação. As falas estão divididas por blocos lógicos com indicações de postura, ganchos de engajamento e respostas para possíveis perguntas.

---

## 🎬 Bloco 1: Abertura & Conexão com a Dor Real (2 min)

### 🗣️ Sua Fala:
> *"Olá a todos! Obrigado pela presença.*
> 
> *Hoje a imensa maioria dos acadêmicos escreve artigos usando o **Overleaf** — em sua versão gratuita na nuvem ou na versão gratuita Self-Hosted (Community Edition). E por que o Overleaf é tão popular? Porque ele eliminou a necessidade de instalar pacotes TeX Live no computador local.*
>
> *Mas quando olhamos para a realidade de **uma instituição de pesquisa ou universidade**, o Overleaf Gratuito traz grandes limitações estruturais:*
> 1. ***Falta de Centralização Segura (Sem GitHub da Instituição):** Os artigos ficam soltos em contas pessoais dos alunos ou em arquivos ZIP baixados, sem custódia oficial e sem controle da nossa instituição.*
> 2. ***Zero Inteligência Artificial Especializada:** Não há auxílio para pesquisar trabalhos correlatos, validar citações ou escrever mensagens de commit com precisão.*
> 3. ***Zero Governança Institucional:** Não há trava do **NIT (Núcleo de Inovação Tecnológica)**, não há acompanhamento preditivo de atrasos nem matrizes de metas acadêmicas por time.*
> 4. ***Editor Limitado:** O editor do Overleaf não possui o poder das extensões e o **IntelliSense nativo do VS Code**.*
>
> *Foi para resolver essa equação e dar um salto gigante de governança que criamos o **SCIA (Scientific Collaboration + AI)**."*

---

## 💡 Bloco 2: A Solução SCIA em Poucas Palavras (3 min)

### 🗣️ Sua Fala:
> *"O SCIA é o nosso **'Overleaf Privado com Inteligência Artificial e Governança'**, 100% Self-Hosted na infraestrutura da nossa instituição.*
> 
> *Ele combina a conveniência do navegador — **zero instalação no computador do usuário** — com o poder de quatro grandes inovações:*
> 
> 1. ***Centralização Segura no GitHub:** Cada artigo gera automaticamente um repositório privado no GitHub da nossa instituição. O GitHub passa a ser a fonte única da verdade (single source of truth), versionado e 100% seguro.*
> 2. ***VS Code Nativo com IntelliSense:** Entregamos a experiência do **VS Code (`code-server`)** no navegador com a extensão TeX nativa, autocomplete, atalhos e preview de PDF instantâneo.*
> 3. ***Inteligência Artificial Nativa (Scientific AI):** A IA atua ao lado do autor para apoiar na definição do tema de pesquisa, busca de trabalhos correlatos, revisão textual com **checagem de fatos e referências** (verificando se o que o autor escreveu bate com as fontes) e **geração de commits semânticos hyper-assertivos** baseados no que realmente foi alterado no código TeX.*
> 4. ***Análise Preditiva e Governança do NIT:** Para a coordenação, a IA analisa a evolução dos trabalhos e avisa **antecipadamente** quais fatores podem atrasar as entregas antes que o prazo do congresso expire. E para a instituição, a **trava estrita do NIT (Gatekeeper)** garante que nenhum artigo seja submetido sem o parecer formal de propriedade intelectual."*

---

## 🔄 Bloco 3: O Fluxo de Trabalho & As Fases do Artigo (4 min)

### 🗣️ Sua Fala:
> *"Para entender como a plataforma funciona na prática, o ciclo de vida de um artigo é dividido em **7 Fases com 2 Trava Estritas (Gatekeepers)**:*
>
> 1. ***Fase 1 (Cadastro e Etapas Paralelas):** O autor cadastra o artigo, vincula ao Ciclo Acadêmico ativo da instituição e define o cronograma de etapas e os congressos — o **Congresso Target** (nosso foco) e os **Congressos Backup**.*
> 2. ***Fase 2 e 3 (Escrita Paralela e Revisão Viva):** Múltiplos autores trabalham em seções diferentes simultaneamente. O autor escreve no VS Code com auxílio da IA e IntelliSense. Ao salvar, a IA gera a mensagem de commit precisa e o PDF compila ao lado.*
> 3. *Aqui entra o **Revisor**: ele abre a tela de revisão Side-by-Side (código TeX e PDF compilado), insere comentários linha por linha e aprova as tarefas.*
> 4. ***Fase 4 — O Gatekeeper 1 (Análise do NIT 🔒):** Trava sequencial no código. A plataforma **impede** a solicitação de validação do NIT até que 100% das etapas de conteúdo estejam concluídas. Quando aprovado pelo NIT, o status muda para `APPROVED_NIT`.*
> 5. ***Fase 5 (Merge pelo Autor):** O próprio autor executa o merge da branch. Nesse instante, o container K8s temporário é desalocado.*
> 6. ***Fase 6 — O Gatekeeper 2 (Submissão ao Congresso Target 🔒):** Envio externo liberado apenas com o parecer do NIT.*
> 7. ***Fase 7 (Decisão Pós-Submissão):** Registro do aceite (DOI) ou redirecionamento automático para o Congresso Backup em caso de rejeição, preservando 100% do histórico.*"

---

## 🛠️ Bloco 4: Engenharia & Decisões Técnicas (ADRs) (7 min)

*(Ideal ao falar com Desenvolvedores, Arquitetos e DevOps)*

### 🗣️ Sua Fala:
> *"Agora abrindo o capô do sistema para falar com o time de engenharia e infraestrutura. Tivemos decisões arquiteturais muito claras que estão documentadas em nossas ADRs:*
>
> #### 1. Autenticação OWASP & Token de Serviço GitHub (ADR 001)
> *'Como tiramos a fricção do Git sem abrir mão da segurança?'*
> *O usuário autentica via e-mail e senha e recebe um cookie HTTP-Only seguro com JWT. Ele nunca toca em chaves SSH ou tokens do GitHub. O backend Fastify conversa com a API do GitHub usando uma **Conta de Serviço centralizada (`GITHUB_TOKEN`)**. Mas o detalhe brilhante é: todos os commits silenciosos (enriquecidos com IA) são assinados no Git usando a identidade real do autor logado (`--author="Nome <email>"`). Mantemos rastreabilidade 100% auditável no Git e no PostgreSQL.*
>
> #### 2. Kubernetes KinD + Warm Pool de Pods (ADR 002)
> *'Como abrir um VS Code completo com TeX Live sem fazer o usuário esperar 30 segundos?'*
> *Criamos um mecanismo de **Warm Pool (Pods Aquecidos)** no Kubernetes (`KinD`). O sistema mantém contêineres reservas pré-inicializados. Quando o pesquisador clica em 'Abrir Editor', vinculamos o volume a um Pod aquecido em **menos de 2 segundos**. E no momento em que a tarefa é mesclada, o Pod e seu PVC temporário são destruídos e limpos.*
>
> #### 3. Gestão de Presença com Redis TTL & Web Worker (ADR 004)
> *'Como resolver o vazamento de Pods zumbis no K8s e a suspensão de abas no navegador?'*
> *Usamos o **Redis 7 (`sci_latex_redis`)** para armazenar a presença com **TTL de 180s**. O frontend roda um **Blob Web Worker inline** (timer de 20s) imune ao congelamento de abas em segundo plano do navegador, e o Sweeper a cada 60s limpa Pods desativados. O Redis atua também como **Lock por Tarefa (HTTP 409)**.*"

---

## 📊 Bloco 5: Governança para Coordenadores e Gerentes (3 min)

### 🗣️ Sua Fala:
> *"E para a coordenação de pesquisa e para a gerência da instituição, o ganho de **governança é monumental**:*
>
> *1. **Análise Preditiva de Atrasos com IA:** Em vez de descobrir o atraso no dia do prazo final, a IA analisa o ritmo de escrita do time e avisa o coordenador antecipadamente sobre fatores que podem comprometer a entrega.*
> *2. **Guarda Centralizada do Patrimônio Científico:** Todos os artigos da instituição ficam centralizados no GitHub oficial da organização, com histórico auditável e zero risco de arquivos perdidos em computadores pessoais.*
> *3. **Trava de Segurança do NIT:** Garantia absoluta de que nenhuma patente ou segredo tecnológico saia da instituição sem a devida análise e registro do Núcleo de Inovação Tecnológica.*
> *4. **Métricas por Período Acadêmico:** Painéis em tempo real acompanhando o cumprimento das cotas de artigos por time e taxas de aceitação nos congressos alvos vs. backups.*"

---

## 🎯 Bloco 6: Fechamento & Abertura para Perguntas (2 min)

### 🗣️ Sua Fala:
> *"Para resumir tudo o que vimos hoje, o SCIA equilibra três pilares fundamentais:*
> 1. ***Produtividade Máxima para o Pesquisador:** Foco total na escrita em LaTeX com VS Code, IA e sem dor de cabeça de infraestrutura.*
> 2. ***Segurança e Governança para a Instituição:** Trava obrigatória do NIT e centralização no GitHub oficial.*
> 3. ***Eficiência de Infraestrutura:** Orquestração inteligente em Kubernetes com descarte automático de recursos e controle Redis em memória.*
>
> *Muito obrigado pelo tempo de vocês. Estou à disposição para dúvidas técnicas ou funcionais!"*

---

## ❓ Guia de Respostas para Perguntas Difíceis (Q&A)

### Q1: "E se a internet do usuário cair enquanto ele está escrevendo no VS Code?"
> **Resposta:** *"O VS Code (`code-server`) mantém o estado local no container enquanto o Pod estiver ativo. Se a conexão cair temporariamente, ao voltar ele reconecta. Se o usuário ficar desconectado por mais de 3 minutos, a chave no Redis expira e o Sweeper encerra o Pod, mas os commits salvos anteriormente já foram persistidos com segurança no repositório remoto do GitHub."*

### Q2: "Por que usamos Redis em vez de gravar a presença direto no banco PostgreSQL?"
> **Resposta:** *"Por dois motivos: performance e resiliência. O heartbeat do frontend envia requisições a cada 20 segundos por usuário ativo. Gravar isso no PostgreSQL geraria milhares de escritas desnecessárias em disco. O Redis processa a presença 100% em RAM com expiração automática (TTL). Além disso, se o backend Node.js reiniciar por qualquer motivo, o estado de presença não se perde porque fica no Redis."*

### Q3: "E se o pesquisador tentar burlar o NIT e enviar o artigo por fora?"
> **Resposta:** *"O repositório Git no GitHub é privado e pertence à Conta de Serviço da instituição. O pesquisador não possui chave SSH nem permissão direta no repositório do GitHub. Ele só consegue compilar o PDF final e fazer a submissão através da plataforma, que valida a aprovação formal do NIT (`APPROVED_NIT`) antes de liberar a ação."*

### Q4: "Por que a instituição deveria adotar o SCIA se a maioria dos pesquisadores já usa o Overleaf?"
> **Resposta:** *"O Overleaf é excelente para escrita individual ou informal, mas falha gravemente no contexto institucional por três razões:*
> 1. **Segurança de dados e Patentes:** No Overleaf, o rascunho de uma patente ou artigo sigiloso fica em servidores de terceiros no exterior. No SCIA, a solução é 100% Self-Hosted na nossa infraestrutura.
> 2. **Falta de Governança do NIT:** O Overleaf não impede um autor de enviar um trabalho não revisado. O SCIA possui travas estritas (Gatekeepers) que exigem o parecer do NIT antes da submissão.
> 3. **Gestão de Prazos & Custos:** O SCIA integra a escrita à matriz de prazos das conferências (*Target/Backup*) e métricas de produção por time de pesquisa, além de eliminar os custos recorrentes de licenças por usuário do Overleaf."*
