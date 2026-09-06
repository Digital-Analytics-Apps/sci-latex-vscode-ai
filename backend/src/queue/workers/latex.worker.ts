import fs from 'fs/promises';
import path from 'path';
import { rabbitMQService, QUEUE_LATEX_COMPILATION } from '../rabbitmq';
import { LatexCompilationMessage } from '../producers/latex.producer';
import { eventsManager } from '../../modules/events/events.manager';
import { prisma } from '../../db/prisma';
import { env } from '../../config/env';

export class LatexWorker {
  async startConsuming() {
    try {
      const channel = await rabbitMQService.getChannel();

      console.log(`👷 LatexWorker started and listening on queue: ${QUEUE_LATEX_COMPILATION}`);

      channel.consume(
        QUEUE_LATEX_COMPILATION,
        async (msg) => {
          if (!msg) return;

          try {
            const content = JSON.parse(msg.content.toString()) as LatexCompilationMessage;
            console.log(`📥 [LatexWorker] Received TeX compilation job for project: ${content.projectId}`);

            const pdfDir = path.resolve(env.STORAGE_PATH, 'pdf', content.projectId);
            await fs.mkdir(pdfDir, { recursive: true });

            const pdfFileName = content.type === 'COMPILE_PR_PDF'
              ? `pr-${content.pullRequestId || 'latest'}.pdf`
              : `master-consolidated.pdf`;

            const pdfFilePath = path.join(pdfDir, pdfFileName);
            
            // Simula/gera o arquivo PDF compilado
            await fs.writeFile(
              pdfFilePath,
              `% PDF Document Compiled by TeX Live Worker\nProject ID: ${content.projectId}\nType: ${content.type}\nTimestamp: ${new Date().toISOString()}`,
              'utf-8'
            );

            // 1. Registra no AuditLog
            await prisma.auditLog.create({
              data: {
                userId: content.requesterId,
                action: content.type === 'COMPILE_PR_PDF' ? 'PR_PDF_COMPILED' : 'MASTER_PDF_COMPILED',
                entityType: 'Project',
                entityId: content.projectId,
                details: { pdfFilePath, pdfFileName },
              },
            });

            // 2. Emite notificação SSE em tempo real
            eventsManager.broadcastToUser(content.requesterId, 'PDF_COMPILED', {
              projectId: content.projectId,
              pdfUrl: `/api/v1/projects/${content.projectId}/pdf`,
              type: content.type,
              timestamp: new Date().toISOString(),
            });

            console.log(`✅ [LatexWorker] PDF compilation finished: ${pdfFilePath}`);
            channel.ack(msg);
          } catch (err) {
            console.error('❌ [LatexWorker] Error compiling TeX:', err);
            channel.nack(msg, false, false);
          }
        },
        { noAck: false }
      );
    } catch (err) {
      console.error('❌ Failed to start LatexWorker:', err);
    }
  }
}
