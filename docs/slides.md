# PARTE 1 — A SOLUÇÃO

## Slide 01 — O cenário atual e os gargalos da produção científica

"Antes de apresentar a solução, precisamos entender alguns problemas que fazem parte da rotina de produção científica.

Hoje, muitas equipes trabalham com ferramentas diferentes para escrever, revisar, armazenar arquivos e acompanhar prazos. Isso acaba fragmentando o processo.

O primeiro ponto é a segurança da informação. Pesquisas em desenvolvimento podem conter dados estratégicos, resultados ainda não publicados e até informações relacionadas a possíveis patentes. Quando esses materiais ficam hospedados em plataformas externas, a instituição perde parte do controle sobre onde e como essas informações são armazenadas.

O segundo problema é a colaboração. Quando as revisões acontecem por e-mail, documentos anexados e diferentes versões de arquivos, fica mais difícil saber qual é a versão correta e quais alterações ainda precisam ser feitas.

E o terceiro ponto é a gestão dos prazos. Sem um fluxo centralizado, a coordenação pode ter dificuldade para identificar atrasos, acompanhar o andamento dos artigos e garantir que todas as validações aconteçam antes da submissão.

Portanto, o problema não está apenas na escrita do artigo. Está na falta de integração entre produção científica, colaboração, revisão e governança institucional."

## Slide 02 — A plataforma SCIA: soberania, produtividade e colaboração

"É para enfrentar esses desafios que estamos desenvolvendo o SCIA.

O SCIA é uma plataforma web que centraliza o ciclo de produção científica em um único ambiente, mantendo a infraestrutura e os dados sob controle da própria instituição.

A proposta é integrar quatro capacidades principais.

A primeira é a edição colaborativa em LaTeX diretamente pelo navegador, permitindo que pesquisadores trabalhem no mesmo documento sem depender de instalações locais complexas.

A segunda é a governança por etapas. O trabalho passa por um fluxo definido, com regras e validações institucionais.

A terceira é a compilação integrada. O pesquisador consegue escrever e acompanhar o resultado do documento em PDF dentro da própria plataforma.

E a quarta é a inteligência artificial científica, que poderá apoiar atividades como delimitação de temas, levantamento bibliográfico e organização da estrutura do artigo, sempre mantendo o pesquisador no processo de decisão.

O objetivo não é apenas oferecer um editor de texto. É criar um ambiente integrado para organizar, produzir, revisar e acompanhar a pesquisa científica."

## Slide 03 — Governança por estados: o ciclo em seis etapas

"Um dos principais diferenciais do SCIA é que o artigo não é tratado apenas como um arquivo. Ele possui um ciclo de vida institucional.

Esse ciclo está organizado em seis etapas sequenciais.

Começamos pelo planejamento e pela pesquisa. Em seguida, temos o desenvolvimento experimental e a realização dos benchmarks. Depois, chegamos à escrita do artigo, que pode ser dividida em tarefas específicas.

Quando essas tarefas estão concluídas e aprovadas, o artigo avança para a revisão técnica e científica geral.

A partir daí entram duas validações institucionais importantes.

A primeira é o NIT, responsável pela análise institucional relacionada à propriedade intelectual. Essa etapa funciona como uma trava: a submissão externa depende da homologação correspondente.

A segunda é a etapa de submissão ao congresso, na qual ficam registrados o destino da submissão e as informações necessárias para acompanhar seu resultado.

Também existe a previsão de um congresso de backup. Assim, se o artigo não for aceito no destino principal, a equipe tem um caminho alternativo planejado.

O ponto central é que o avanço entre etapas segue regras. Isso reduz a possibilidade de uma submissão acontecer sem que as validações previstas tenham sido realizadas."

## Slide 04 — Modelo de revisão em dois níveis: micro e macro

"Aqui temos uma distinção importante do processo de revisão do SCIA: trabalhamos com dois níveis complementares.

O primeiro é a micro-revisão, que acontece durante a etapa de escrita. O artigo pode ser dividido em tarefas ou seções, permitindo que cada parte seja revisada de maneira específica.

O revisor pode selecionar um trecho do texto e registrar um comentário diretamente naquele ponto. O autor visualiza o apontamento, realiza o ajuste e pode responder ou resolver a discussão.

Isso evita que toda a revisão dependa de documentos separados ou de longas trocas de e-mail.

O segundo nível é a macro-revisão. Nesse momento, o revisor oficial avalia o artigo consolidado, considerando o conjunto do trabalho, sua consistência e sua qualidade científica.

Se forem necessários ajustes gerais, o artigo retorna para uma nova rodada de correções. Se for aprovado, fica liberado para seguir ao fluxo institucional do NIT.

Essa separação é importante porque permite acompanhar a qualidade de cada parte sem perder a visão geral do artigo."

## Slide 05 — Papéis do sistema e matriz de permissões

"Para que esse processo funcione, cada participante precisa ter responsabilidades e permissões bem definidas.

No SCIA, o autor ou pesquisador é responsável pela produção do manuscrito, pela condução das atividades e pela resolução dos apontamentos recebidos.

O revisor oficial ou orientador atua na avaliação metodológica e científica. Ele pode consultar o documento em modo protegido e registrar comentários sem alterar acidentalmente o conteúdo produzido pelo autor.

O coordenador de pesquisa acompanha o andamento das etapas, os prazos e as tarefas. Sua visão é voltada à organização operacional e à identificação de gargalos.

Já o gestor ou gerente de área possui uma visão mais estratégica, com indicadores institucionais, acompanhamento dos períodos acadêmicos e informações de auditoria.

Essa divisão permite que cada pessoa visualize e execute aquilo que corresponde à sua responsabilidade, sem misturar as atividades de produção, revisão, coordenação e gestão."

# PARTE 2 — A ARQUITETURA

## Slide 06 — Topologia geral de serviços e comunicação

"Agora que apresentamos o funcionamento da plataforma do ponto de vista institucional, vamos observar como ela está organizada tecnicamente.

O SCIA utiliza uma arquitetura baseada em serviços com responsabilidades separadas.

No navegador, temos a aplicação React, responsável pela interface, pelo editor CodeMirror e pela visualização dos documentos.

No backend principal, desenvolvido com Fastify, organizamos a comunicação em protocolos específicos: WebSockets para a sincronização colaborativa da digitação, Server-Sent Events (SSE) para notificações e eventos em tempo real, e APIs REST para as operações convencionais e acompanhamento de prazos.

O PostgreSQL é a base persistente da aplicação, armazenando os dados estruturados e os conteúdos dos documentos. O MinIO é utilizado para armazenar arquivos binários, como PDFs e imagens.

Também temos um serviço dedicado à compilação LaTeX. Essa separação é importante porque compilar documentos pode consumir recursos significativos. Assim, uma compilação não precisa executar dentro do mesmo processo responsável pela comunicação principal da aplicação.

Por fim, temos o serviço SciAI, desenvolvido em Python, responsável pela camada de inteligência artificial.

A ideia dessa arquitetura é separar responsabilidades e evitar que uma atividade mais pesada comprometa o funcionamento das demais."

## Slide 07 — O motor colaborativo: Single-Writer e controle de versão

"Este é um dos pontos tecnicamente mais importantes da arquitetura: como vários pesquisadores conseguem editar o mesmo documento de forma colaborativa.

O SCIA utiliza CodeMirror Collab no editor e no backend para gerenciar as atualizações colaborativas.

O princípio apresentado aqui é o de Single-Writer: para cada documento em edição, existe um processo responsável por ordenar e aplicar as atualizações recebidas.

Quando um pesquisador realiza uma alteração, o cliente envia a operação ao backend responsável pelo documento. O servidor processa a atualização, considera a versão atual e distribui o resultado aos demais participantes.

O processamento colaborativo acontece em memória, evitando que cada tecla digitada precise gerar imediatamente uma operação de gravação no banco de dados.

A persistência é feita por checkpoints, seguindo critérios como tempo de inatividade, tempo máximo e quantidade de operações.

O PostgreSQL continua sendo a fonte persistente dos dados. O controle de versão e o mecanismo de fencing ajudam a impedir que um processo antigo grave informações depois de perder a responsabilidade pelo documento.

O objetivo dessa abordagem é combinar uma experiência de edição responsiva com controle de versão e persistência confiável."

## Slide 08 — Persistência relacional ACID: por que PostgreSQL?

"Uma decisão importante do projeto foi utilizar o PostgreSQL como banco principal.

Essa escolha está relacionada à natureza dos dados do SCIA. Não estamos armazenando apenas textos isolados. Temos projetos, participantes, etapas, tarefas, permissões, revisões, versões e registros de auditoria que possuem relações entre si.

O modelo relacional permite representar essas relações com integridade referencial e regras bem definidas.

Outro ponto importante são as transações ACID. Em operações que envolvem mais de uma informação relacionada, precisamos garantir que as alterações sejam concluídas de forma consistente.

Por exemplo, ao registrar um checkpoint, podemos precisar atualizar o conteúdo, a versão e os metadados relacionados. A transação permite tratar essas alterações como uma unidade lógica.

Também separamos o armazenamento de arquivos binários, utilizando o MinIO para documentos compilados e imagens.

A decisão não significa que um banco de documentos seja inadequado para qualquer aplicação. Significa que, para as necessidades de integridade, relacionamento e auditoria do SCIA, o PostgreSQL foi escolhido como a base principal."

## Slide 09 — Isolamento do compilador TeX Live

"Outro cuidado da arquitetura é o processo de compilação dos documentos LaTeX.

A compilação pode consumir bastante CPU e memória. Além disso, um documento pode conter comandos que provoquem erros, processos demorados ou consumo excessivo de recursos.

Por isso, o SCIA não executa essa atividade diretamente no backend principal. Existe um serviço dedicado à compilação, chamado sci-latex-compiler.

Quando o usuário solicita uma compilação, o backend encaminha o conteúdo e os arquivos necessários para esse serviço.

O compilador cria um diretório temporário, executa o processo e aplica um limite de tempo para evitar que uma compilação fique presa indefinidamente.

Se a compilação for bem-sucedida, o serviço retorna o PDF. Se houver erro, retorna informações estruturadas para que o pesquisador consiga identificar o problema no editor.

Ao final, os arquivos temporários são removidos.

Essa separação protege os demais componentes e torna o processo de compilação mais controlado."

## Slide 10 — Camada de IA científica: LangGraph e participação humana

"Além da colaboração e da governança, o SCIA possui uma camada de inteligência artificial voltada ao contexto da pesquisa científica.

Essa camada é construída com Python e LangGraph, utilizando agentes especializados para dividir o trabalho em etapas.

O fluxo começa com a ideia apresentada pelo pesquisador. Um agente ajuda a delimitar o tema, organizar o escopo e formular uma hipótese de trabalho.

Depois, um agente especializado realiza o levantamento bibliográfico, consultando fontes como OpenAlex e Semantic Scholar.

Mas existe uma decisão importante nesse processo: a inteligência artificial não deve escolher sozinha as referências que serão utilizadas.

O fluxo pausa e apresenta os resultados ao pesquisador. Ele pode validar os artigos selecionados ou solicitar ajustes na busca.

Somente depois dessa validação o processo continua para a organização do roteiro e a geração de conteúdo estruturado para o artigo.

Esse modelo mantém o pesquisador como responsável pelas decisões científicas. A IA funciona como uma ferramenta de apoio à pesquisa, não como substituta da avaliação humana."

## Slide 11 — Capacidade e dimensionamento da infraestrutura

"Para finalizar a parte técnica, temos os resultados dos testes de capacidade apresentados neste estudo.

O objetivo dos benchmarks foi avaliar como a plataforma se comporta com diferentes níveis de concorrência, considerando conexões WebSocket, operações de edição, compilação e consumo de recursos.

Na carga máxima apresentada, foram testadas 1.250 conexões WebSocket simultâneas, distribuídas em 250 projetos ativos.

O teste também registra latência de aplicação de edição inferior a 3 milissegundos, latência RTT P95 de 610 milissegundos e 50 compilações de artigos em 17,3 segundos.

Em relação ao consumo de infraestrutura, o cenário de pico apresentado registra aproximadamente 7 vCPUs e 7,2 gigabytes de memória.

Esses números ajudam a orientar o dimensionamento inicial e mostram o comportamento observado no ambiente de teste.

É importante destacar que resultados de benchmark dependem das condições em que foram realizados, como hardware, duração, perfil de carga e configuração do cluster. Por isso, eles devem ser apresentados junto com a metodologia utilizada.

A mensagem principal deste slide é que o SCIA foi pensado para suportar colaboração e processamento de documentos em uma infraestrutura institucional controlada, com dimensionamento baseado em testes e não apenas em estimativas."

# ENCERRAMENTO

"Com isso, concluímos a apresentação da proposta e da arquitetura do SCIA.

O que estamos construindo é uma plataforma que integra a produção científica, a colaboração entre pesquisadores, a revisão técnica, a governança institucional e o apoio da inteligência artificial.

Do ponto de vista institucional, o SCIA busca oferecer mais controle sobre os dados, mais visibilidade sobre o andamento das pesquisas e um processo de produção científica mais organizado.

Do ponto de vista técnico, a arquitetura foi estruturada para separar responsabilidades, controlar a persistência, isolar atividades de maior consumo e permitir a evolução dos serviços.

O próximo passo é demonstrar como essas capacidades funcionam na prática, acompanhando o fluxo de um artigo desde a escrita até as validações institucionais.

Mais do que apresentar uma ferramenta, queremos apresentar uma estrutura para apoiar e organizar todo o ciclo da produção científica."