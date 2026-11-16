# Diagnóstico: Pod Pending / FailedScheduling

## Significado
`Pending` pode significar que o Pod ainda aguarda scheduling ou download de imagens/montagem de volumes.

## Hipóteses
- Capacidade insuficiente para atender aos requests de CPU/Memória.
- Taint no nó sem toleration correspondente no Pod.
- PVC pendente ou não vinculado (`VolumeBindingPending`).
