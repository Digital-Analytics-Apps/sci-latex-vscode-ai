# Probes e saúde de aplicações

## Tipos de probe
- **Startup:** permite que uma aplicação demorada inicialize; enquanto não obtém sucesso, liveness e readiness ficam suspensas.
- **Liveness:** detecta quando o processo deve ser reiniciado por estar sem progresso ou travado.
- **Readiness:** indica se o container está apto a receber tráfego. Falha remove o Pod dos endpoints do Service sem reiniciar o container.
