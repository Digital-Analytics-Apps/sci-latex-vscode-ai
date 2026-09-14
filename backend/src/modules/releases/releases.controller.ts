import { FastifyReply, FastifyRequest } from 'fastify';
import { ReleasesService } from './releases.service';

export class ReleasesController {
  constructor(private service: ReleasesService = new ReleasesService()) {}

  async createReleaseCandidate(request: FastifyRequest, reply: FastifyReply) {
    const { projectId } = request.params as { projectId: string };
    const { versionTag, reviewerId, feedback } = request.body as {
      versionTag?: string;
      reviewerId?: string;
      feedback?: string;
    };

    try {
      const rc = await this.service.createReleaseCandidate({
        projectId,
        versionTag: versionTag || '',
        reviewerId,
        feedback,
      });

      return reply.status(201).send(rc);
    } catch (err: any) {
      return reply.status(400).send({ error: 'CREATE_RC_FAILED', message: err.message });
    }
  }

  async listReleaseCandidates(request: FastifyRequest, reply: FastifyReply) {
    const { projectId } = request.params as { projectId: string };

    try {
      const rcs = await this.service.listReleaseCandidates(projectId);
      return reply.send(rcs);
    } catch (err: any) {
      return reply.status(500).send({ error: 'GET_RCS_FAILED', message: err.message });
    }
  }

  async createRelease(request: FastifyRequest, reply: FastifyReply) {
    const { projectId } = request.params as { projectId: string };
    const { versionTag, title, conference } = request.body as {
      versionTag: string;
      title: string;
      conference?: string;
    };

    try {
      const release = await this.service.createRelease({
        projectId,
        versionTag,
        title,
        conference,
      });

      return reply.status(201).send(release);
    } catch (err: any) {
      return reply.status(400).send({ error: 'CREATE_RELEASE_FAILED', message: err.message });
    }
  }

  async listReleases(request: FastifyRequest, reply: FastifyReply) {
    const { projectId } = request.params as { projectId: string };

    try {
      const releases = await this.service.listReleases(projectId);
      return reply.send(releases);
    } catch (err: any) {
      return reply.status(500).send({ error: 'GET_RELEASES_FAILED', message: err.message });
    }
  }
}
