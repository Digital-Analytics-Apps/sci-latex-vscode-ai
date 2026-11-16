# Workflow: investigação de Pod

1. Consultar status do Pod (`k8s_inspect_environment`).
2. Extrair fase, condições, Node, readiness, restart count e `lastState`.
3. Consultar eventos recentes do recurso.
4. Se houve reinício, consultar logs anteriores.
5. Selecionar guia de diagnóstico conforme o sintoma observado.
6. Correlacionar com Prometheus (CPU/RAM) e Loki (logs de erro).
