import { rabbitMQService, QUEUE_GIT_OPERATIONS } from '../rabbitmq';
import { GitService } from '../../modules/git/git.service';
import { GitCommitMessage } from '../producers/git.producer';

export class GitWorker {
  constructor(private gitService: GitService) {}

  async startConsuming() {
    try {
      const channel = await rabbitMQService.getChannel();

      console.log(`👷 GitWorker started and listening on queue: ${QUEUE_GIT_OPERATIONS}`);

      channel.consume(
        QUEUE_GIT_OPERATIONS,
        async (msg) => {
          if (!msg) return;

          try {
            const content = JSON.parse(msg.content.toString()) as GitCommitMessage;
            console.log(`📥 [GitWorker] Received job for project: ${content.projectId}`);

            if (content.type === 'COMMIT_PROGRESS') {
              const commitHash = await this.gitService.commitFile({
                projectId: content.projectId,
                branchName: content.branchName,
                filePath: content.filePath,
                content: content.content,
                commitMessage: content.commitMessage,
                authorName: content.authorName,
                authorEmail: content.authorEmail,
              });

              console.log(`✅ [GitWorker] Commit created successfully: ${commitHash}`);
            }

            channel.ack(msg);
          } catch (err) {
            console.error('❌ [GitWorker] Error processing job:', err);
            // Nack e não re-enfileira se for erro fatal
            channel.nack(msg, false, false);
          }
        },
        { noAck: false }
      );
    } catch (err) {
      console.error('❌ Failed to start GitWorker:', err);
    }
  }
}
