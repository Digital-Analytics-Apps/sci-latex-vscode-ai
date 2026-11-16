# Workflow: evidências para RCA

## Objetivo
Fornecer ao SRE Supervisor evidências Kubernetes que possam ser correlacionadas com telemetria de aplicação e infraestrutura.

## Classificação
- **INFRASTRUCTURE:** Falha de nós, scheduler, runtime ou capacidade física.
- **APPLICATION:** Falha lógica no código, erro fatal de bootstrap ou vazamento de memória.
- **HYBRID:** Carga legítima da aplicação expondo limite subdimensionado de infraestrutura.
- **INCONCLUSIVE:** Evidências insuficientes para determinar o culpado.
