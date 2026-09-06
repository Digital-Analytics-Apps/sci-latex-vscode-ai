import { rabbitMQService, EXCHANGE_NAME } from '../rabbitmq';

export interface GitCommitMessage {
  type: 'COMMIT_PROGRESS';
  projectId: string;
  branchName: string;
  filePath: string;
  content: string;
  commitMessage: string;
  authorName: string;
  authorEmail: string;
}

export class GitProducer {
  async publishCommit(data: GitCommitMessage): Promise<boolean> {
    try {
      const channel = await rabbitMQService.getChannel();
      const payload = Buffer.from(JSON.stringify(data));

      return channel.publish(EXCHANGE_NAME, 'git.commit', payload, {
        persistent: true,
      });
    } catch (err) {
      console.error('❌ Failed to publish Git commit message:', err);
      return false;
    }
  }
}

export const gitProducer = new GitProducer();
