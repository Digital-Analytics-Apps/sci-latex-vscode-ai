# Pod e ciclo de vida de containers

## Conceitos essenciais
Um Pod é a menor unidade implantável da API Kubernetes. Um Pod pode conter um ou mais containers que compartilham rede e podem compartilhar volumes.

### Pod phase versus STATUS exibido
As fases principais da API são `Pending`, `Running`, `Succeeded`, `Failed` e `Unknown`. Valores como `CrashLoopBackOff`, `ImagePullBackOff` e `Terminating` exibidos por ferramentas são estados/motivos de apresentação e não fases oficiais do Pod.

### Estados de container
- `Waiting`: container ainda executa operações necessárias à inicialização; observar `reason` e mensagem.
- `Running`: processo do container está em execução.
- `Terminated`: processo encerrou; observar `reason`, `exitCode`, `startedAt` e `finishedAt`.
