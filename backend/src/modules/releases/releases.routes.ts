import { FastifyInstance } from 'fastify';
import { releasesService } from './releases.service';

export async function releasesRoutes(fastify: FastifyInstance) {
  // Hook de autenticação JWT
  fastify.addHook('onRequest', async (request, reply) => {
    try {
      await request.jwtVerify();
    } catch {
      reply.status(401).send({ error: 'UNAUTHORIZED', message: 'Token JWT ausente ou inválido' });
    }
  });

  // POST /api/v1/projects/:projectId/release-candidates - Criar nova Release Candidate (RC)
  fastify.post('/api/v1/projects/:projectId/release-candidates', async (request, reply) => {
    const { projectId } = request.params as { projectId: string };
    const body = request.body as { versionTag?: string; reviewerId?: string; feedback?: string };

    try {
      const rc = await releasesService.createReleaseCandidate({
        projectId,
        versionTag: body.versionTag || '',
        reviewerId: body.reviewerId,
        feedback: body.feedback,
      });

      return reply.status(201).send(rc);
    } catch (err: any) {
      return reply.status(400).send({ error: 'CREATE_RC_FAILED', message: err.message });
    }
  });

  // GET /api/v1/projects/:projectId/release-candidates - Listar RCs
  fastify.get('/api/v1/projects/:projectId/release-candidates', async (request, reply) => {
    const { projectId } = request.params as { projectId: string };

    try {
      const rcs = await releasesService.listReleaseCandidates(projectId);
      return reply.send(rcs);
    } catch (err: any) {
      return reply.status(500).send({ error: 'GET_RCS_FAILED', message: err.message });
    }
  });

  // POST /api/v1/projects/:projectId/releases - Publicar Release oficial na main
  fastify.post('/api/v1/projects/:projectId/releases', async (request, reply) => {
    const { projectId } = request.params as { projectId: string };
    const body = request.body as { versionTag: string; title: string; conference?: string };

    try {
      const release = await releasesService.createRelease({
        projectId,
        versionTag: body.versionTag,
        title: body.title,
        conference: body.conference,
      });

      return reply.status(201).send(release);
    } catch (err: any) {
      return reply.status(400).send({ error: 'CREATE_RELEASE_FAILED', message: err.message });
    }
  });

  // GET /api/v1/projects/:projectId/releases - Listar Releases publicadas
  fastify.get('/api/v1/projects/:projectId/releases', async (request, reply) => {
    const { projectId } = request.params as { projectId: string };

    try {
      const releases = await releasesService.listReleases(projectId);
      return reply.send(releases);
    } catch (err: any) {
      return reply.status(500).send({ error: 'GET_RELEASES_FAILED', message: err.message });
    }
  });
}
