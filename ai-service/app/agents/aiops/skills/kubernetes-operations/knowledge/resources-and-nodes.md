# Recursos, QoS e saúde de Nodes

## Requests e limits
- `requests` são usados pelo scheduler para avaliar a colocação do Pod e representam a solicitação de recurso.
- `limits` definem limites de uso aplicados pelo runtime/kernel.
- CPU acima do limite sofre throttling.
- Memória acima do limite leva a OOM kill.

## Node conditions e pressão
Observar: `Ready`, `MemoryPressure`, `DiskPressure`, `PIDPressure`, `NetworkUnavailable`.
