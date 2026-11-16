# Workflow: investigação de Node

1. Identificar o Node associado ao workload.
2. Consultar condições e pressão usando `k8s_get_node_status`.
3. Verificar se múltiplos Pods no mesmo Node apresentam falhas simultâneas.
4. Correlacionar com métricas de nó no Prometheus.
