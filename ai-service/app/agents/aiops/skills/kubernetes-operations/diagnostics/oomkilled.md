# Diagnóstico: OOMKilled

## Significado
`OOMKilled` indica que o container foi encerrado em contexto de falta de memória (out-of-memory). Exit code 137 pode aparecer em encerramentos por SIGKILL, mas isoladamente não prova OOM.

## Diferenciar hipóteses
1. **Limite do container:** uso se aproxima do limite cgroup enquanto o Node permanece saudável (`MemoryPressure: False`).
2. **Pressão do Node:** condição `MemoryPressure: True` no nó e múltiplos pods sofrendo eviction simultânea.
