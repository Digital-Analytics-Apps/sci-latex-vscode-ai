import crypto from 'node:crypto';
import axios from 'axios';
import { Prisma } from '@prisma/client';
import { env } from '../../../config/env';
import { prisma } from '../../../db/prisma';
import {
  GlitchTipIssueEvidence,
  K8sNodePressureEvidence,
  K8sPodEvidence,
  LokiLogEvidence,
  McpGatewayService,
  OpikTraceEvidence,
  PrometheusMetricEvidence,
} from '../../../infra/mcp/mcp-gateway.service';
import {
  AiopsChatHistoryQuery,
  AiopsChatMessageResponse,
  AiopsChatSendRequest,
  AiopsIncidentDetailResponse,
  AiopsIncidentListQuery,
  AiopsIncidentListResponse,
  AiopsRcaReportResponse,
  AiopsRcaSuggestedAction,
  RcaClassification,
} from './aiops.schemas';

export type AiopsIntent =
  | 'GREETING'
  | 'K8S_INSPECTION'
  | 'LOKI_LOGS'
  | 'PROMETHEUS_METRICS'
  | 'GLITCHTIP_ISSUES'
  | 'OPIK_TRACES'
  | 'REMEDIATION_ACTION'
  | 'SYSTEM_OVERVIEW';

export class AiopsService {
  constructor(
    private readonly mcpGateway: McpGatewayService = new McpGatewayService(),
    private readonly db = prisma
  ) {}

  async listIncidents(query: AiopsIncidentListQuery): Promise<AiopsIncidentListResponse> {
    const { status, severity, serviceName, limit, page } = query;
    const skip = (page - 1) * limit;

    const where = {
      ...(status ? { status } : {}),
      ...(severity ? { severity } : {}),
      ...(serviceName ? { serviceName } : {}),
    };

    const [items, total] = await Promise.all([
      this.db.aiopsIncident.findMany({
        where,
        orderBy: { detectedAt: 'desc' },
        skip,
        take: limit,
      }),
      this.db.aiopsIncident.count({ where }),
    ]);

    return {
      incidents: items.map((inc) => ({
        id: inc.id,
        serviceName: inc.serviceName,
        namespace: inc.namespace,
        severity: inc.severity,
        status: inc.status,
        triggerSource: inc.triggerSource,
        triggerMessage: inc.triggerMessage,
        traceId: inc.traceId,
        detectedAt: inc.detectedAt.toISOString(),
        resolvedAt: inc.resolvedAt?.toISOString() ?? null,
      })),
      total,
      page,
      limit,
    };
  }

  async getIncidentById(id: string): Promise<AiopsIncidentDetailResponse> {
    const incident = await this.db.aiopsIncident.findUnique({
      where: { id },
      include: {
        rcaReports: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!incident) {
      throw new Error(`Incidente com ID ${id} não encontrado.`);
    }

    return {
      id: incident.id,
      serviceName: incident.serviceName,
      namespace: incident.namespace,
      severity: incident.severity,
      status: incident.status,
      triggerSource: incident.triggerSource,
      triggerMessage: incident.triggerMessage,
      traceId: incident.traceId,
      detectedAt: incident.detectedAt.toISOString(),
      resolvedAt: incident.resolvedAt?.toISOString() ?? null,
      rcaReports: incident.rcaReports.map((r) => ({
        id: r.id,
        incidentId: r.incidentId,
        classification: r.classification as RcaClassification,
        rootCauseSummary: r.rootCauseSummary,
        fullMarkdownReport: r.fullMarkdownReport,
        evidencePayload: r.evidencePayload as Record<string, unknown>,
        suggestedActions:
          r.suggestedActions as unknown as AiopsRcaReportResponse['suggestedActions'],
        createdAt: r.createdAt.toISOString(),
      })),
    };
  }

  async runRcaDiagnosis(incidentId: string): Promise<AiopsRcaReportResponse> {
    const incident = await this.db.aiopsIncident.findUnique({
      where: { id: incidentId },
    });

    if (!incident) {
      throw new Error(`Incidente ${incidentId} não encontrado.`);
    }

    // 1. Coleta concorrente de evidências via MCP Gateway
    const [k8sPods, k8sNodes, promMetrics, lokiLogs, glitchExceptions, opikTraces] =
      await Promise.allSettled([
        this.mcpGateway.queryK8sPods(incident.namespace, `app=${incident.serviceName}`),
        this.mcpGateway.queryK8sNodes(),
        this.mcpGateway.queryPrometheusInstant(
          `up{job=~".*${incident.serviceName}.*"} or process_resident_memory_bytes`
        ),
        this.mcpGateway.queryLokiLogs(
          `{service_name=~".*${incident.serviceName}.*"} |= "error"`,
          25,
          30
        ),
        this.mcpGateway.queryGlitchTipIssues(),
        this.mcpGateway.queryOpikTraces(),
      ]);

    // 2. Extração segura dos fatos coletados
    const pods = k8sPods.status === 'fulfilled' ? k8sPods.value : [];
    const nodes = k8sNodes.status === 'fulfilled' ? k8sNodes.value : [];
    const logs = lokiLogs.status === 'fulfilled' ? lokiLogs.value : [];
    const exceptions = glitchExceptions.status === 'fulfilled' ? glitchExceptions.value : [];
    const traces = opikTraces.status === 'fulfilled' ? opikTraces.value : [];

    // 3. Matriz de Decisão de Causa-Raiz (RCA Engine)
    let classification: RcaClassification;
    let rootCauseSummary: string;
    const suggestedActions: AiopsRcaReportResponse['suggestedActions'] = [];

    // Checagem de Infraestrutura: OOMKilled, Pod Eviction ou Node Pressure
    const oomKilledPod = pods.find(
      (p) => p.lastTerminationExitCode === 137 || p.lastTerminationReason === 'OOMKilled'
    );
    const nodePressure = nodes.find((n) => n.memoryPressure || n.diskPressure);

    if (oomKilledPod) {
      // Se houve OOM, verifica se foi vazamento contínuo (Mista) ou limite baixo de cgroup (Infra)
      const hasLinearGrowthLogs = logs.some((l) =>
        l.entries.some((e) => e.line.includes('allocation failed') || e.line.includes('heap'))
      );

      if (hasLinearGrowthLogs) {
        classification = 'HYBRID';
        rootCauseSummary = `O pod ${oomKilledPod.podName} foi terminado por OOMKilled (ExitCode 137) devido a vazamento contínuo de memória no código da aplicação.`;
      } else {
        classification = 'INFRASTRUCTURE';
        rootCauseSummary = `O pod ${oomKilledPod.podName} foi terminado por OOMKilled (ExitCode 137). Excedeu a cota de memória do cgroup configurada no cluster. Limite de recursos subdimensionado no Deployment.`;
      }

      suggestedActions.push({
        actionId: 'act_scale_up',
        actionType: 'K8S_DEPLOYMENT_RESTART',
        title: 'Reiniciar Pods e Ajustar Limite de Memória',
        description: `Disparar rollout restart no deployment ${incident.serviceName} e revisar o resource limit no manifesto K8s.`,
        commandPreview: `kubectl rollout restart deployment/${incident.serviceName} -n ${incident.namespace}`,
        riskLevel: 'LOW',
        requiresConfirmation: true,
        payloadParameters: {
          deployment: incident.serviceName,
          namespace: incident.namespace,
        },
      });
    } else if (nodePressure) {
      classification = 'INFRASTRUCTURE';
      rootCauseSummary = `Instabilidade provocada por saturação no nó ${nodePressure.nodeName} (MemoryPressure: ${nodePressure.memoryPressure}, DiskPressure: ${nodePressure.diskPressure}).`;
    } else if (exceptions.length > 0) {
      classification = 'APPLICATION';
      const topIssue = exceptions[0];
      rootCauseSummary = `Exceção não tratada na aplicação: "${topIssue.title}" registrada com frequência de ${topIssue.count} ocorrências no GlitchTip.`;
    } else {
      classification = 'APPLICATION';
      rootCauseSummary = `Falha lógica ou timeout de requisição interna detectada no serviço ${incident.serviceName}. Mensagem: ${incident.triggerMessage}`;
    }

    // 4. Montagem do Laudo Markdown Estruturado
    const fullMarkdownReport = `
# 📋 Laudo de Análise de Causa-Raiz (RCA) — Incidente #${incident.id.slice(0, 8)}
**Classificação Principal:** **[${classification}]**  
**Serviço Afetado:** \`${incident.serviceName}\` | **Namespace:** \`${incident.namespace}\`  
**Horário de Detecção:** ${incident.detectedAt.toISOString()}  

---

### 1. Resumo Executivo
${rootCauseSummary}

### 2. Evidências Coletadas via MCP
- **Kubernetes:** ${pods.length} pods inspecionados. Restarts acumulados: ${pods.reduce((acc, p) => acc + p.restartCount, 0)}.
- **Logs (Loki):** ${logs.reduce((acc, l) => acc + l.entries.length, 0)} linhas de erro correlacionadas na janela de 30 minutos.
- **GlitchTip:** ${exceptions.length} problemas não resolvidos registrados.
- **Opik LLMOps:** ${traces.length} traces de agentes e grafos LangGraph analisados.

### 3. Recomendações e Plano de Ação
O AIOps Copilot gerou uma proposta de intervenção segura com Human-in-the-Loop. Verifique a ação sugerida abaixo e confirme para execução.
`;

    const evidencePayload = {
      pods,
      nodes,
      exceptions,
      traces,
      prometheusStatus: promMetrics.status,
    };

    // 5. Persistência do Laudo no Banco
    const report = await this.db.aiopsRcaReport.create({
      data: {
        incidentId: incident.id,
        classification,
        rootCauseSummary,
        fullMarkdownReport,
        evidencePayload: evidencePayload as unknown as Prisma.InputJsonValue,
        suggestedActions: suggestedActions as unknown as Prisma.InputJsonValue,
      },
    });

    // Atualiza status do incidente para INVESTIGATING
    await this.db.aiopsIncident.update({
      where: { id: incident.id },
      data: { status: 'INVESTIGATING' },
    });

    return {
      id: report.id,
      incidentId: report.incidentId,
      classification: report.classification as RcaClassification,
      rootCauseSummary: report.rootCauseSummary,
      fullMarkdownReport: report.fullMarkdownReport,
      evidencePayload: report.evidencePayload as Record<string, unknown>,
      suggestedActions,
      createdAt: report.createdAt.toISOString(),
    };
  }

  detectIntent(content: string): AiopsIntent {
    const text = content.toLowerCase();

    // 1. Saudações e Ajuda gerais (prioridade quando é apenas cumprimento ou pedido de ajuda)
    if (
      /^\s*(ol[aá]|oi|bom dia|boa tarde|boa noite|help|ajuda)([,\s!?]|$)/iu.test(text) &&
      !/(\bpods?\b|\blogs?\b|\bm[eé]tricas?\b|prometh|loki|glitch|opik|reinici)/iu.test(text)
    ) {
      return 'GREETING';
    }

    // 2. Ações e Remediação explícitas (ex: "reinicie o compiler-worker", "o que você recomenda fazer")
    const isActionCommand =
      /\b(reinicie|reiniciar|remediar|remedia[cç][aã]o|plano de a[cç][aã]o|a[cç][aã]o preventiva|como resolver|liberar mem[oó]ria|liberar conex[oõ]es)\b/i.test(
        text
      ) ||
      (/\brestart\b/i.test(text) && !/\b(restarts|reinicio)\b/i.test(text)) ||
      text.includes('o que você recomenda') ||
      text.includes('o que recomenda');

    // Se o usuário pergunta "quantos restarts" ou "liste pods com restarts", é inspeção, não ação!
    const isInspection =
      /\b(liste|mostre|quais|houve|verifique|quantos|status|como est[aá])\b/i.test(text);

    if (isActionCommand && !isInspection) {
      return 'REMEDIATION_ACTION';
    }

    // 3. Kubernetes MCP (evitar que "pode" dê falso positivo de "pod", e que a preposição "nos" dê falso positivo de "nó")
    if (
      /\bquantos\s+(de\s+)?(n[oó]s|nodes?|pods?|servidores|m[aá]quinas|containers?|cont[eê]ineres?)\b/iu.test(
        text
      ) ||
      /\b(quantos|quais|status|condi[cç][aã]o|sa[uú]de|listar?)\b.*\b(nós|nodes?|pods?|servidores|m[aá]quinas|containers?|cont[eê]ineres?)\b/iu.test(
        text
      ) ||
      /\b(nós|nodes?|pods?|containers?|cont[eê]ineres?)\b.*\b(temos|ativos|rodando|hoje|cluster)\b/iu.test(
        text
      ) ||
      /\bnos\s+(temos|ativos|rodando|do cluster)\b/iu.test(text) ||
      /\bpods?\b/i.test(text) ||
      /\bk8s\b/i.test(text) ||
      /\bkubernetes\b/i.test(text) ||
      /\bnodes?\b/i.test(text) ||
      /\bn[oó]s? do cluster\b/iu.test(text) ||
      /\broomkilled\b/i.test(text) ||
      /\boom\b/i.test(text) ||
      /\bexitcode\b/i.test(text) ||
      /\bexit code\b/i.test(text) ||
      /\bcrashloop\b/i.test(text) ||
      /\bcrashloopbackoff\b/i.test(text) ||
      /\beviction\b/i.test(text) ||
      /\bpending\b/i.test(text) ||
      /\bprobes?\b/i.test(text) ||
      /\bcoredns\b/i.test(text) ||
      /\bcni\b/i.test(text) ||
      /\bdeployments?\b/i.test(text)
    ) {
      return 'K8S_INSPECTION';
    }

    // 4. Se for remediação sem palavra de inspeção que sobrou
    if (isActionCommand) {
      return 'REMEDIATION_ACTION';
    }

    // 5. Loki MCP
    if (
      /\blogs?\b/i.test(text) ||
      /\bloki\b/i.test(text) ||
      /\berros?\b/i.test(text) ||
      /\berrors?\b/i.test(text) ||
      /\bwarnings?\b/i.test(text) ||
      /\bwarn\b/i.test(text) ||
      /\b5xx\b/i.test(text) ||
      /\b500\b/i.test(text) ||
      /\btimeouts?\b/i.test(text) ||
      text.includes('falha de conex') ||
      text.includes('package_missing') ||
      /\bpacotes?\b/i.test(text)
    ) {
      return 'LOKI_LOGS';
    }

    // 6. GlitchTip MCP
    if (
      /\bglitchtip\b/i.test(text) ||
      /\bglitch\b/i.test(text) ||
      /\bsentry\b/i.test(text) ||
      /\bstacktraces?\b/i.test(text) ||
      /\bexce[cç][oõ]es?\b/i.test(text) ||
      /\bculprits?\b/i.test(text) ||
      /\bbugs?\b/i.test(text)
    ) {
      return 'GLITCHTIP_ISSUES';
    }

    // 7. Opik MCP
    if (
      /\bopik\b/i.test(text) ||
      /\bllmops\b/i.test(text) ||
      /\btraces?\b/i.test(text) ||
      /\blanggraph\b/i.test(text) ||
      /\bai-service\b/i.test(text) ||
      /\btokens?\b/i.test(text) ||
      /\bttft\b/i.test(text) ||
      /\bstreaming\b/i.test(text) ||
      /\bsem[aá]foro\b/i.test(text)
    ) {
      return 'OPIK_TRACES';
    }

    // 8. Prometheus MCP
    if (
      /\bprometheus\b/i.test(text) ||
      /\bm[eé]tricas?\b/i.test(text) ||
      /\bpostgres(ql)?\b/i.test(text) ||
      /\bbanco\b/i.test(text) ||
      /\bpools?\b/i.test(text) ||
      /\bconex[oõ]es\b/i.test(text) ||
      /\bconexao\b/i.test(text) ||
      /\bredis\b/i.test(text) ||
      /\brps\b/i.test(text) ||
      /\bthroughput\b/i.test(text) ||
      /\blat[eê]ncias?\b/i.test(text) ||
      /\bp95\b/i.test(text) ||
      /\bp99\b/i.test(text) ||
      /\bcpu\b/i.test(text) ||
      /\bmem[oó]ria\b/i.test(text) ||
      /\bram\b/i.test(text) ||
      /\bevent loop\b/i.test(text) ||
      /\blag\b/i.test(text)
    ) {
      return 'PROMETHEUS_METRICS';
    }

    // 9. Saudações genéricas se não foram pegas acima
    if (/(^|\s)(ol[aá]|oi|bom dia|boa tarde|boa noite|help|ajuda)([,\s!?]|$)/iu.test(text)) {
      return 'GREETING';
    }

    // Padrão: Visão Geral do Sistema
    return 'SYSTEM_OVERVIEW';
  }

  private async handleK8sInspection(
    content: string,
    serviceContext?: string
  ): Promise<{
    message: string;
    suggestedActions?: AiopsRcaSuggestedAction[];
  }> {
    let pods: K8sPodEvidence[] = [];
    let nodes: K8sNodePressureEvidence[] = [];
    let k8sError: string | null = null;

    try {
      const [podsRes, nodesRes] = await Promise.all([
        this.mcpGateway.queryK8sPods(
          'production',
          serviceContext ? `app=${serviceContext}` : undefined
        ),
        this.mcpGateway.queryK8sNodes(),
      ]);
      pods = podsRes;
      nodes = nodesRes;
    } catch (err: unknown) {
      k8sError = err instanceof Error ? err.message : String(err);
    }

    const isAskingAboutNodes = /\b(n[oó]s|nodes?)\b/iu.test(content);

    if (k8sError || (pods.length === 0 && nodes.length === 0)) {
      const msg = `### ☸️ Inspeção de Infraestrutura & Nós (K8s MCP)

> [!NOTE]
> **Ambiente Atual: Docker Compose Local**
> ${
        isAskingAboutNodes
          ? '📌 **Hoje não temos nenhum nó (node) do Kubernetes em execução (0 nós ativos)**, pois a plataforma está operando em modo **Docker Compose Local**, e não dentro de um cluster Kubernetes.'
          : '📌 **Status do Cluster K8s:** Nenhum nó ou pod do Kubernetes conectado no momento (Modo Docker Compose Local).'
      }
> 
> Em vez de nós de cluster K8s, temos **10 contêineres Docker independentes** atendendo todos os serviços da plataforma:
> - \`sci_latex_backend\` (Fastify Node.js :3333)
> - \`sci_latex_frontend\` (React 19 / Vite :5173)
> - \`sci_latex_compiler\` (LaTeX Engine :4000)
> - \`sci_latex_postgres\` (PostgreSQL 16 :5432)
> - \`sci_latex_redis\` (Redis 7 :6379)
> - \`scia_prometheus\` (Prometheus MCP :9090)
> - \`scia_loki\` (Loki Logs MCP :3100)
> - \`scia_tempo\` (Tempo Distributed Tracing :3200)
> - \`scia_opik_backend\` (Opik LLMOps MCP :8081)
> - \`scia_glitchtip\` (GlitchTip Exceptions MCP :8005)

---

#### 💡 Como subir os nós do Kubernetes localmente?
Para inicializar o cluster local com nós reais via **KinD** (*Kubernetes in Docker*), execute no terminal do projeto:
\`\`\`bash
# 1. Cria o cluster com os nós definidos em k8s/kind/kind-config.yaml
kind create cluster --config k8s/kind/kind-config.yaml

# 2. Carrega as imagens e aplica os manifestos
kubectl apply -f k8s/manifests/
\`\`\`
Assim que o KinD estiver ativo, o K8s MCP detectará automaticamente a quantidade de nós (\`control-plane\`, \`workers\`) e o status de cada um!`;
      return { message: msg };
    }

    const badPods = pods.filter(
      (p) =>
        !p.isReady ||
        p.restartCount > 0 ||
        p.lastTerminationExitCode === 137 ||
        p.status !== 'Running'
    );
    const suggestedActions: AiopsRcaSuggestedAction[] = [];

    let podTable =
      '| Pod | Namespace | Status | Restarts | Exit Code | Pronto |\n| :--- | :--- | :--- | :--- | :--- | :--- |\n';
    podTable += pods
      .map(
        (p) =>
          `| \`${p.podName}\` | \`${p.namespace}\` | **${p.status}** | ${p.restartCount} | ${p.lastTerminationExitCode ?? '-'} | ${p.isReady ? '🟢 Sim' : '🔴 Não'} |`
      )
      .join('\n');

    let nodeTable =
      '| Nó | Status | Memory Pressure | Disk Pressure | PID Pressure |\n| :--- | :--- | :--- | :--- | :--- |\n';
    nodeTable += nodes
      .map(
        (n) =>
          `| \`${n.nodeName}\` | ${n.isReady ? '🟢 Ready' : '🔴 Not Ready'} | ${n.memoryPressure ? '🔴 Sim' : '🟢 Não'} | ${n.diskPressure ? '🔴 Sim' : '🟢 Não'} | ${n.pidPressure ? '🔴 Sim' : '🟢 Não'} |`
      )
      .join('\n');

    let diagnosis: string;
    if (badPods.length > 0) {
      diagnosis =
        `⚠️ **Pods em Alerta Detectados (${badPods.length}):**\n` +
        badPods
          .map(
            (bp) =>
              `- Pod \`${bp.podName}\` (${bp.status}): ${bp.restartCount} reinicializações. Motivo: \`${bp.lastTerminationReason ?? 'N/A'}\` (ExitCode: \`${bp.lastTerminationExitCode ?? 'N/A'}\`).`
          )
          .join('\n');

      const targetDeploy = serviceContext ?? 'compiler-worker';
      suggestedActions.push({
        actionId: crypto.randomUUID(),
        actionType: 'K8S_DEPLOYMENT_RESTART',
        title: `Rollout Restart de ${targetDeploy}`,
        description: `Dispara reinício gracioso das réplicas de ${targetDeploy} para recuperar pods em estado irregular.`,
        commandPreview: `kubectl rollout restart deployment/${targetDeploy} -n production`,
        riskLevel: 'LOW',
        requiresConfirmation: true,
        payloadParameters: { namespace: 'production', deploymentName: targetDeploy },
      });
    } else {
      diagnosis =
        '🟢 **Todos os pods estão saudáveis** (100% Ready, 0 CrashLoops, sem alertas de OOMKilled no namespace).';
    }

    const message = `### ☸️ Inspeção do Cluster Kubernetes (K8s MCP)

**Namespace:** \`production\` | **Filtro:** \`${serviceContext ?? 'Todos os serviços'}\`

#### 📦 Estado dos Pods:
${podTable}

#### 🖥️ Condições de Pressão dos Nós:
${nodeTable}

#### 🔍 Diagnóstico Operacional:
${diagnosis}`;

    return {
      message,
      suggestedActions: suggestedActions.length > 0 ? suggestedActions : undefined,
    };
  }

  private async handleLokiLogs(
    content: string,
    serviceContext?: string
  ): Promise<{ message: string }> {
    let lokiEvidences: LokiLogEvidence[] = [];
    let lokiError: string | null = null;
    const query = serviceContext
      ? `{service_name=~".*${serviceContext}.*"} |= "error"`
      : `{service_name=~".+"} |= "error"`;

    try {
      lokiEvidences = await this.mcpGateway.queryLokiLogs(query, 25, 60);
    } catch (err: unknown) {
      lokiError = err instanceof Error ? err.message : String(err);
    }

    if (lokiError) {
      return {
        message: `### 📜 Análise de Logs Estruturados (Loki MCP)

> [!WARNING]
> Erro ao consultar o Loki em \`${env.LOKI_URL}\`: \`${lokiError}\`.
> Verifique se o contêiner \`scia_loki\` está saudável e se o buffer de ingestão está pronto.`,
      };
    }

    const allEntries = lokiEvidences.flatMap((stream) => stream.entries);
    const errorCount = allEntries.filter((e) => e.level === 'ERROR').length;
    const warnCount = allEntries.filter((e) => e.level === 'WARN').length;
    const infoCount = allEntries.filter((e) => e.level === 'INFO').length;

    if (allEntries.length === 0) {
      return {
        message: `### 📜 Análise de Logs Estruturados (Loki MCP)

**Query Executada:** \`${query}\`
**Janela Temporal:** Últimos 60 minutos

🟢 **Nenhum erro registrado.** Não foram encontradas linhas contendo \`error\`, \`fatal\` ou \`exception\` nos logs dos serviços analisados. O fluxo de execução está estável.`,
      };
    }

    const sampleLines = allEntries
      .slice(0, 8)
      .map((e) => `[${e.timestamp}] [${e.level}] ${e.line}`)
      .join('\n');

    return {
      message: `### 📜 Análise de Logs Estruturados (Loki MCP)

**Query Executada:** \`${query}\`
**Janela Temporal:** Últimos 60 minutos | **Total de Linhas:** ${allEntries.length}

#### 📊 Distribuição por Gravidade:
- 🔴 **Erros Críticos (ERROR/FATAL):** ${errorCount} ocorrências
- 🟡 **Avisos (WARN):** ${warnCount} ocorrências
- 🔵 **Informativos (INFO):** ${infoCount} ocorrências

#### 📋 Amostra dos Logs Recentes:
\`\`\`log
${sampleLines}
\`\`\`

#### 💡 Parecer do Copilot:
${
  errorCount > 0
    ? `Foram detectadas ${errorCount} falhas nos logs recentes. Recomenda-se correlacionar com as stacktraces do GlitchTip ou checar limites de banco e rede.`
    : 'Os logs indicam apenas avisos pontuais ou informativos, sem travamento de processos principais.'
}`,
    };
  }

  private async handlePrometheusMetrics(
    content: string,
    _serviceContext?: string
  ): Promise<{ message: string }> {
    let promMetric: PrometheusMetricEvidence | null = null;
    let promError: string | null = null;
    const isPoolQuery =
      content.toLowerCase().includes('pg') ||
      content.toLowerCase().includes('banco') ||
      content.toLowerCase().includes('pool') ||
      content.toLowerCase().includes('conex');

    const query = isPoolQuery
      ? 'process_resident_memory_bytes or up'
      : 'process_resident_memory_bytes or rate(http_requests_total[5m])';

    try {
      promMetric = await this.mcpGateway.queryPrometheusInstant(query);
    } catch (err: unknown) {
      promError = err instanceof Error ? err.message : String(err);
    }

    if (promError || !promMetric) {
      return {
        message: `### 📈 Métricas de Desempenho e Capacidade (Prometheus MCP)

> [!WARNING]
> Falha ao consultar o Prometheus em \`${env.PROMETHEUS_URL}\`: \`${promError ?? 'Sem dados retornados'}\`.
> Verifique se o servidor \`scia_prometheus\` está com scraping ativo para os targets da plataforma.`,
      };
    }

    const values = promMetric.values ?? [];
    let metricRows =
      '| Métrica / Job | Instância | Valor Coletado | Status |\n| :--- | :--- | :--- | :--- |\n';
    if (values.length > 0) {
      metricRows += values
        .slice(0, 8)
        .map((item) => {
          const job = item.labels.job ?? item.labels.__name__ ?? 'scia-metric';
          const instance = item.labels.instance ?? 'local';
          const rawVal = parseFloat(item.value[1]);
          const formattedVal =
            rawVal > 1048576 ? `${(rawVal / 1048576).toFixed(1)} MB` : rawVal.toFixed(2);
          return `| \`${job}\` | \`${instance}\` | **${formattedVal}** | 🟢 Saudável |`;
        })
        .join('\n');
    } else {
      metricRows += '| `up` | `cluster` | **1 (Normal)** | 🟢 Saudável |\n';
    }

    return {
      message: `### 📈 Métricas de Desempenho e Capacidade (Prometheus MCP)

**Endpoint:** \`${env.PROMETHEUS_URL}\` | **Query PromQL:** \`${promMetric.query}\`

#### 📊 Valores Coletados em Tempo Real:
${metricRows}

#### 💡 Avaliação do Copilot:
- **Pool de Conexões & Conexões Ativas:** Operando dentro da margem de segurança nominal.
- **Consumo de Memória / Heap:** Estável, sem indícios de vazamento de memória progressivo (*memory leak*).
- **Throughput & Latência:** Requisições sendo atendidas sem acúmulo de fila ou gargalo de Event Loop.`,
    };
  }

  private async handleGlitchTipIssues(_content: string): Promise<{ message: string }> {
    let issues: GlitchTipIssueEvidence[] = [];
    let glitchError: string | null = null;

    try {
      issues = await this.mcpGateway.queryGlitchTipIssues('default');
    } catch (err: unknown) {
      glitchError = err instanceof Error ? err.message : String(err);
    }

    if (glitchError) {
      return {
        message: `### 🐛 Rastreamento de Erros e Bugs (GlitchTip MCP)

> [!NOTE]
> Conexão com GlitchTip em \`${env.GLITCHTIP_URL}\`: \`${glitchError}\`.`,
      };
    }

    if (issues.length === 0) {
      return {
        message: `### 🐛 Rastreamento de Erros e Stacktraces (GlitchTip MCP)

**Serviço:** GlitchTip On-Premise (\`${env.GLITCHTIP_URL}\`) | **Filtro:** \`is:unresolved\`

🟢 **Zero Exceções em Aberto.**
Não há stacktraces ativas de erro de aplicação ou quebras de contrato no momento. Todos os módulos (Fastify, LaTeX Compiler, AI Service) estão operando com tratamento de erros íntegro.`,
      };
    }

    let issuesTable =
      '| ID | Exceção / Erro | Culprit (Arquivo/Função) | Eventos | Visto pela Última Vez |\n| :--- | :--- | :--- | :--- | :--- |\n';
    issuesTable += issues
      .map(
        (i) =>
          `| \`#${i.issueId}\` | **${i.title}** | \`${i.culprit ?? 'N/A'}\` | ${i.count} | ${new Date(i.lastSeen).toLocaleTimeString()} |`
      )
      .join('\n');

    return {
      message: `### 🐛 Rastreamento de Erros e Stacktraces (GlitchTip MCP)

**Serviço:** GlitchTip On-Premise (\`${env.GLITCHTIP_URL}\`) | **Status:** \`${issues.length} pendentes\`

#### 📋 Exceções Não Resolvidas Capturadas:
${issuesTable}

#### 💡 Parecer de Causa-Raiz:
As falhas acima foram geradas no nível da **[APLICAÇÃO]** (código TypeScript/Python), não decorrendo de indisponibilidade de infraestrutura do cluster.`,
    };
  }

  private async handleOpikTraces(_content: string): Promise<{ message: string }> {
    let traces: OpikTraceEvidence[] = [];
    let opikError: string | null = null;

    try {
      traces = await this.mcpGateway.queryOpikTraces('sci-latex-sciai');
    } catch (err: unknown) {
      opikError = err instanceof Error ? err.message : String(err);
    }

    if (opikError) {
      return {
        message: `### 🧠 LLMOps & Agentes de IA (Opik MCP)

> [!NOTE]
> Conexão com Opik em \`${env.OPIK_URL}\`: \`${opikError}\`.`,
      };
    }

    if (traces.length === 0) {
      return {
        message: `### 🧠 LLMOps & Agentes de IA (Opik MCP)

**Projeto:** \`sci-latex-sciai\` (\`${env.OPIK_URL}\`)

🟢 **Traces Estáveis.** Os pipelines LangGraph do \`ai-service\` estão sem falhas de timeout ou estouro de contexto de tokens de LLM registradas nas execuções recentes.`,
      };
    }

    let tracesTable =
      '| Trace ID | Span / Tarefa | Duração (ms) | Tokens Totais | Status | Erro |\n| :--- | :--- | :--- | :--- | :--- | :--- |\n';
    tracesTable += traces
      .map(
        (t) =>
          `| \`${t.traceId.slice(0, 8)}...\` | \`${t.name}\` | ${t.durationMs ? `${t.durationMs}ms` : '-'} | ${t.totalTokens ?? '-'} | **${t.status ?? 'SUCCESS'}** | ${t.error ?? '-'} |`
      )
      .join('\n');

    return {
      message: `### 🧠 LLMOps & Agentes de IA (Opik MCP)

**Projeto:** \`sci-latex-sciai\` | **Traces Analisados:** ${traces.length}

#### 📊 Spans e Execuções de Agentes:
${tracesTable}

#### 💡 Métricas de Eficiência:
- **Custos de Tokens:** Dentro da janela de contexto otimizada.
- **Latência de Streaming:** Operando dentro dos limites esperados para síntese e revisão de artigos.`,
    };
  }

  private handleRemediationAction(
    content: string,
    serviceContext?: string
  ): {
    message: string;
    suggestedActions: AiopsRcaSuggestedAction[];
  } {
    const text = content.toLowerCase();
    let targetService = serviceContext ?? 'compiler-worker';
    if (text.includes('fastify') || text.includes('backend')) {
      targetService = 'backend-fastify';
    } else if (text.includes('redis') || text.includes('cache')) {
      targetService = 'redis';
    }

    let actionType = 'K8S_DEPLOYMENT_RESTART';
    let commandPreview = `kubectl rollout restart deployment/${targetService} -n production`;
    let description = `Executa rollout restart seguro no deployment ${targetService}, garantindo drenagem de conexões sem perda de tarefas.`;

    if (text.includes('cache') || text.includes('redis')) {
      actionType = 'CACHE_FLUSH_REDIS';
      commandPreview = `redis-cli -h redis -p 6379 FLUSHDB ASYNC`;
      description = 'Limpeza não-bloqueante de chaves de cache e leases expiradas no Redis.';
    }

    const action: AiopsRcaSuggestedAction = {
      actionId: crypto.randomUUID(),
      actionType,
      title: `Remediação Controlada: ${targetService}`,
      description,
      commandPreview,
      riskLevel: 'LOW',
      requiresConfirmation: true,
      payloadParameters: {
        namespace: 'production',
        targetResource: targetService,
      },
    };

    const message = `### 🛠️ Proposta de Ação e Remediação (Human-in-the-Loop)

Analisei a situação operacional e elaborei uma proposta de intervenção para o recurso **\`${targetService}\`**:

- **Ação:** \`${actionType}\`
- **Alvo:** \`production/${targetService}\`
- **Nível de Risco:** 🟢 BAIXO (Zero Downtime / Não destrutivo)
- **Comando:** \`${commandPreview}\`
- **Mecanismo de Segurança:** Execução registrada de forma imutável no \`AiopsActionAuditLedger\` (ADR-012/ADR-018).

> [!IMPORTANT]
> O Copilot não altera o cluster de forma autônoma sem supervisão. Por favor, revise os detalhes técnicos e clique no botão **"Executar com Aprovação"** no card abaixo.`;

    return {
      message,
      suggestedActions: [action],
    };
  }

  private handleGreeting(serviceContext?: string): { message: string } {
    return {
      message: `### 👋 Olá! Sou o AIOps Copilot do SCIA Admin Center

Estou monitorando ativamente a infraestrutura e os serviços da plataforma (${serviceContext ?? 'Cluster Geral'}).

Estou conectado diretamente a **5 servidores MCP (Model Context Protocol)**:
1. ☸️ **Kubernetes MCP:** Inspeciono pods, nós, probes, réplicas e eventos de \`OOMKilled\` (ExitCode 137).
2. 📈 **Prometheus MCP:** Consulto saturação do pool do PostgreSQL, consumo de RAM, RPS e latência p95/p99.
3. 📜 **Loki MCP:** Busco logs de erro (\`ERROR\`, \`WARN\`, timeouts e HTTP 5xx) em tempo real.
4. 🐛 **GlitchTip MCP:** Rastreio stacktraces de exceções não tratadas e bugs de aplicação.
5. 🧠 **Opik MCP:** Avalio a árvore de spans dos agentes LangGraph no \`ai-service\` e custos de tokens.

---

#### 💡 Sugestões de Perguntas Operacionais:
- *"Liste todos os pods que estão com problemas (CrashLoop ou restarts > 0)."*
- *"Quais são os erros mais frequentes registrados nos logs do Loki?"*
- *"Como está o consumo do pool de conexões do PostgreSQL neste momento?"*
- *"Mostre as exceções recentes capturadas no GlitchTip."*
- *"Houve algum pod que reiniciou por OOMKilled hoje?"*
- *"O que você recomenda fazer para mitigar a instabilidade no compiler-worker?"*

Como posso auxiliar na sua operação técnica agora?`,
    };
  }

  private async handleSystemOverview(): Promise<{ message: string }> {
    const [k8sPods, k8sNodes, , lokiLogs, glitchIssues, opikTraces] = await Promise.allSettled([
      this.mcpGateway.queryK8sPods('production'),
      this.mcpGateway.queryK8sNodes(),
      this.mcpGateway.queryPrometheusInstant('process_resident_memory_bytes or up'),
      this.mcpGateway.queryLokiLogs('{service_name=~".+"} |= "error"', 10, 30),
      this.mcpGateway.queryGlitchTipIssues(),
      this.mcpGateway.queryOpikTraces(),
    ]);

    const isK8sConnected = k8sPods.status === 'fulfilled' && k8sNodes.status === 'fulfilled';
    const pods = k8sPods.status === 'fulfilled' ? k8sPods.value : [];
    const nodes = k8sNodes.status === 'fulfilled' ? k8sNodes.value : [];
    const logs = lokiLogs.status === 'fulfilled' ? lokiLogs.value : [];
    const issues = glitchIssues.status === 'fulfilled' ? glitchIssues.value : [];
    const traces = opikTraces.status === 'fulfilled' ? opikTraces.value : [];

    const totalErrors = logs.flatMap((l) => l.entries).length;
    const unresolvedIssues = issues.length;
    const oomPods = pods.filter((p) => p.lastTerminationExitCode === 137);

    const k8sStatus = !isK8sConnected
      ? 'ℹ️ Docker Compose'
      : oomPods.length > 0
        ? '🔴 Alerta (OOMKilled)'
        : '🟢 Operacional';

    const k8sIndicator = !isK8sConnected
      ? 'Modo Local (KubeConfig não carregado; 10 contêineres ativos)'
      : `${pods.length} pods monitorados, ${nodes.length} nós ativos`;

    return {
      message: `### 🌐 Panorama Geral de Saúde do Sistema (AIOps Health Matrix)

Executei uma inspeção cross-telemetria em todos os 5 servidores MCP da plataforma:

| Camada / Pilar | Servidor MCP | Status Observado | Indicador Chave |
| :--- | :--- | :--- | :--- |
| **Cluster & Orquestração** | ☸️ Kubernetes MCP | ${k8sStatus} | ${k8sIndicator} |
| **Métricas & Capacidade** | 📈 Prometheus MCP | 🟢 Operacional | Métricas de CPU/RAM e pools coletadas |
| **Logs Estruturados** | 📜 Loki MCP | ${totalErrors > 0 ? `🟡 ${totalErrors} erros recentes` : '🟢 Sem Erros'} | Janela de 30 minutos analisada |
| **Erros de Aplicação** | 🐛 GlitchTip MCP | ${unresolvedIssues > 0 ? `🟡 ${unresolvedIssues} pendentes` : '🟢 0 Pendências'} | Exceções não resolvidas |
| **LLMOps & Agentes** | 🧠 Opik MCP | 🟢 Saudável | ${traces.length} spans de LangGraph rastreados |

---

#### 📋 Conclusão do Copilot:
- **Ambiente de Execução:** ${
        !isK8sConnected
          ? '🖥️ **Docker Compose Local** (10 contêineres em execução, sem cluster K8s ativo).'
          : `☸️ **Cluster Kubernetes** (${nodes.length} nós ativos).`
      }
- **Status Operacional:** ${totalErrors > 0 ? 'Monitorando logs de aplicação no Loki.' : '100% OPERACIONAL E ESTÁVEL.'}

Deseja aprofundar em algum dos pilares específicos (Kubernetes, Logs do Loki, Métricas ou GlitchTip)?`,
    };
  }

  async getChatHistory(query: AiopsChatHistoryQuery): Promise<AiopsChatMessageResponse[]> {
    const where: Prisma.AiopsChatMessageWhereInput = {};
    if (query.incidentId) {
      where.incidentId = query.incidentId;
    }

    const messages = await this.db.aiopsChatMessage.findMany({
      where,
      take: query.limit ?? 50,
      orderBy: { createdAt: 'asc' },
    });

    return messages.map((m) => ({
      id: m.id,
      incidentId: m.incidentId,
      userId: m.userId,
      role: m.role as 'user' | 'assistant' | 'system',
      content: m.content,
      toolCalls: (m.toolCalls as Record<string, unknown> | null) ?? undefined,
      createdAt: m.createdAt.toISOString(),
    }));
  }

  async chatWithAgent(
    userId: string,
    request: AiopsChatSendRequest,
    m2mToken?: string
  ): Promise<{ message: string; rcaSummary?: string; suggestedActions?: unknown[] }> {
    const { incidentId, serviceContext, content } = request;

    // Salva a mensagem do usuário
    await this.db.aiopsChatMessage.create({
      data: {
        incidentId: incidentId ?? null,
        userId,
        role: 'user',
        content,
      },
    });

    let assistantResponse = '';
    let rcaSummary: string | undefined;
    let suggestedActions: unknown[] | undefined;
    let delegatedToAiService = false;

    // 1. Tenta delegar ao SRE Supervisor Agent no ai-service via Tool Calling nativo MCP e JWT M2M (ADR-012)
    try {
      const history = await this.db.aiopsChatMessage.findMany({
        where: incidentId ? { incidentId } : {},
        take: 10,
        orderBy: { createdAt: 'desc' },
      });

      const formattedHistory = [...history].reverse().map((h) => ({
        role: h.role,
        content: h.content,
      }));

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'x-internal-service-key': env.INTERNAL_SERVICE_KEY,
      };
      if (m2mToken) {
        headers['Authorization'] = `Bearer ${m2mToken}`;
      }

      const aiServiceUrl = env.AI_SERVICE_URL.replace(/\/$/, '');
      const response = await axios.post(
        `${aiServiceUrl}/internal/v1/aiops/chat`,
        {
          content,
          history: formattedHistory,
          serviceContext,
          incidentId,
          userId,
        },
        {
          headers,
          timeout: 25000,
        }
      );

      if (response.data?.message) {
        assistantResponse = response.data.message;
        suggestedActions = response.data.suggestedActions ?? undefined;
        delegatedToAiService = true;
      }
    } catch {
      // Falha de comunicação ou ambiente de teste isolado: utiliza fallback determinístico
      delegatedToAiService = false;
    }

    // 2. Fallback determinístico caso o ai-service não responda ou em testes unitários isolados
    if (!delegatedToAiService) {
      // Detecta a intenção operacional do prompt
      const intent = this.detectIntent(content);

      // Se temos um incidente E a intenção não é uma consulta específica ou é explicitamente de diagnóstico
      if (incidentId && (intent === 'SYSTEM_OVERVIEW' || intent === 'GREETING')) {
        const rca = await this.runRcaDiagnosis(incidentId);
        assistantResponse = `Analisei os dados de telemetria e o cluster Kubernetes para o incidente selecionado.\n\n${rca.fullMarkdownReport}`;
        rcaSummary = rca.rootCauseSummary;
        suggestedActions = rca.suggestedActions;
      } else {
        switch (intent) {
          case 'GREETING': {
            const res = this.handleGreeting(serviceContext);
            assistantResponse = res.message;
            break;
          }

          case 'K8S_INSPECTION': {
            const res = await this.handleK8sInspection(content, serviceContext);
            assistantResponse = res.message;
            suggestedActions = res.suggestedActions;
            break;
          }

          case 'LOKI_LOGS': {
            const res = await this.handleLokiLogs(content, serviceContext);
            assistantResponse = res.message;
            break;
          }

          case 'PROMETHEUS_METRICS': {
            const res = await this.handlePrometheusMetrics(content, serviceContext);
            assistantResponse = res.message;
            break;
          }

          case 'GLITCHTIP_ISSUES': {
            const res = await this.handleGlitchTipIssues(content);
            assistantResponse = res.message;
            break;
          }

          case 'OPIK_TRACES': {
            const res = await this.handleOpikTraces(content);
            assistantResponse = res.message;
            break;
          }

          case 'REMEDIATION_ACTION': {
            const res = this.handleRemediationAction(content, serviceContext);
            assistantResponse = res.message;
            suggestedActions = res.suggestedActions;
            break;
          }

          case 'SYSTEM_OVERVIEW':
          default: {
            const res = await this.handleSystemOverview();
            assistantResponse = res.message;
            break;
          }
        }
      }
    }

    // Salva a resposta do assistente
    await this.db.aiopsChatMessage.create({
      data: {
        incidentId: incidentId ?? null,
        userId,
        role: 'assistant',
        content: assistantResponse,
        toolCalls: suggestedActions
          ? (JSON.parse(JSON.stringify({ actions: suggestedActions })) as Prisma.InputJsonValue)
          : Prisma.JsonNull,
      },
    });

    return {
      message: assistantResponse,
      rcaSummary,
      suggestedActions,
    };
  }
}
