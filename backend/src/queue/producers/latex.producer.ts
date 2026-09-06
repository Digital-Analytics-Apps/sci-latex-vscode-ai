import { rabbitMQService, EXCHANGE_NAME } from '../rabbitmq';
import { env } from '../../config/env';

export interface LatexCompilationMessage {
  type: 'COMPILE_PR_PDF' | 'COMPILE_MASTER_PDF';
  projectId: string;
  pullRequestId?: string;
  branchName: string;
  requesterId: string;
}

export class LatexProducer {
  async publishCompilation(data: LatexCompilationMessage): Promise<boolean> {
    if (env.NODE_ENV === 'test') {
      return true;
    }

    try {
      const channel = await rabbitMQService.getChannel();
      const payload = Buffer.from(JSON.stringify(data));

      return channel.publish(EXCHANGE_NAME, 'latex.compile', payload, {
        persistent: true,
      });
    } catch (err) {
      console.error('❌ Failed to publish TeX compilation message:', err);
      return false;
    }
  }
}

export const latexProducer = new LatexProducer();
