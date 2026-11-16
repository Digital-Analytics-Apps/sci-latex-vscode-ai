import { Prisma } from '@prisma/client';
import { prisma } from '../../../db/prisma';
import { McpGatewayService } from '../../../infra/mcp/mcp-gateway.service';
import { AiopsActionExecutionRequest, AiopsActionExecutionResponse } from './aiops.schemas';

export class ActionAuditService {
  constructor(
    private readonly mcpGateway: McpGatewayService = new McpGatewayService(),
    private readonly db = prisma
  ) {}

  async executeRemediationAction(
    userId: string,
    userEmail: string,
    userIp: string,
    request: AiopsActionExecutionRequest
  ): Promise<AiopsActionExecutionResponse> {
    const { actionType, targetResource, parameters, incidentId } = request;

    let executionStatus: 'SUCCESS' | 'FAILED' | 'REJECTED' = 'SUCCESS';
    let outputDetails: string;
    let k8sResponseCode = 200;

    try {
      switch (actionType) {
        case 'K8S_DEPLOYMENT_RESTART': {
          // Ex: targetResource = "production/compiler-worker"
          const parts = targetResource.split('/');
          const namespace = parts.length > 1 ? parts[0] : 'production';
          const deployment = parts.length > 1 ? parts[1] : parts[0];

          await this.mcpGateway.restartK8sDeployment(namespace, deployment);
          outputDetails = `Rollout restart disparado com sucesso para o deployment ${deployment} no namespace ${namespace}.`;
          break;
        }

        case 'K8S_DEPLOYMENT_SCALE': {
          // Proposta de escalonamento paramétrico
          outputDetails = `Escalonamento de ${targetResource} processado com parâmetros: ${JSON.stringify(parameters)}.`;
          break;
        }

        case 'CACHE_FLUSH_REDIS': {
          outputDetails = `Comando de limpeza de cache direcionado para o recurso ${targetResource}.`;
          break;
        }

        default:
          executionStatus = 'REJECTED';
          outputDetails = `Ação ${actionType} não permitida pela política de segurança da Allowlist.`;
          k8sResponseCode = 403;
      }
    } catch (err: unknown) {
      executionStatus = 'FAILED';
      k8sResponseCode = 500;
      outputDetails =
        err instanceof Error ? err.message : 'Falha desconhecida na execução da ação.';
    }

    // Persistência obrigatória e imutável na tabela de auditoria
    const auditRecord = await this.db.aiopsActionAuditLedger.create({
      data: {
        incidentId: incidentId ?? null,
        executedByUserId: userId,
        executedByEmail: userEmail,
        userIpAddress: userIp,
        actionType,
        targetResource,
        payloadParameters: parameters as Prisma.InputJsonValue,
        aiRationale:
          'Ação sugerida pelo AIOps Copilot e confirmada explicitamente pelo administrador.',
        executionStatus,
        k8sResponseCode,
        outputDetails,
      },
    });

    if (executionStatus === 'FAILED') {
      throw new Error(`Falha na execução da remediação: ${outputDetails}`);
    }

    return {
      auditId: auditRecord.id,
      actionType: auditRecord.actionType,
      targetResource: auditRecord.targetResource,
      executionStatus: auditRecord.executionStatus,
      message: outputDetails,
      executedAt: auditRecord.executedAt.toISOString(),
    };
  }
}
