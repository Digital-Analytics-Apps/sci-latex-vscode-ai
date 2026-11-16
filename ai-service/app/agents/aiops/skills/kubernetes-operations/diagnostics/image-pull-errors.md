# Diagnóstico: ImagePullBackOff / ErrImagePull

## Significado
O kubelet não conseguiu obter a imagem do container e está repetindo tentativas com backoff.

## Hipóteses
- Tag de imagem inexistente.
- Falha de autenticação no container registry.
- Bloqueio de rede ou timeout de DNS.
