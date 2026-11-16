# Diagnóstico: CrashLoopBackOff

## Significado
`CrashLoopBackOff` indica que o container falhou repetidamente e o kubelet está aplicando atraso progressivo antes de nova tentativa. Não é a causa-raiz.

## Coleta mínima
1. Capturar container afetado, restart count, `state`, `lastState.terminated.reason`, `exitCode` e timestamps.
2. Inspecionar eventos de `BackOff`, `Unhealthy`, `Killing`.
3. Consultar logs da instância anterior (`previous=true`).
