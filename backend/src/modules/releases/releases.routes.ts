import { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { verifyJwt } from '../../middlewares/auth.middleware';
import { ReleasesController } from './releases.controller';

export const releasesRoutes: FastifyPluginAsyncZod = async (fastify) => {
  const controller = new ReleasesController();

  // Hook de autenticação JWT
  fastify.addHook('onRequest', verifyJwt);

  // POST /api/v1/projects/:projectId/release-candidates - Criar nova Release Candidate (RC)
  fastify.post(
    '/api/v1/projects/:projectId/release-candidates',
    {
      schema: {
        tags: ['Releases'],
        summary: 'Criar nova Release Candidate (RC)',
        security: [{ bearerAuth: [] }],
        params: z.object({
          projectId: z.string().min(1),
        }),
        body: z.object({
          versionTag: z.string().optional(),
          reviewerId: z.string().optional(),
          feedback: z.string().optional(),
        }),
      },
    },
    controller.createReleaseCandidate.bind(controller)
  );

  // GET /api/v1/projects/:projectId/release-candidates - Listar RCs
  fastify.get(
    '/api/v1/projects/:projectId/release-candidates',
    {
      schema: {
        tags: ['Releases'],
        summary: 'Listar Release Candidates do projeto',
        security: [{ bearerAuth: [] }],
        params: z.object({
          projectId: z.string().min(1),
        }),
      },
    },
    controller.listReleaseCandidates.bind(controller)
  );

  // POST /api/v1/projects/:projectId/releases - Publicar Release oficial na main
  fastify.post(
    '/api/v1/projects/:projectId/releases',
    {
      schema: {
        tags: ['Releases'],
        summary: 'Publicar Release oficial na branch main',
        security: [{ bearerAuth: [] }],
        params: z.object({
          projectId: z.string().min(1),
        }),
        body: z.object({
          versionTag: z.string().min(1),
          title: z.string().min(1),
          conference: z.string().optional(),
        }),
      },
    },
    controller.createRelease.bind(controller)
  );

  // GET /api/v1/projects/:projectId/releases - Listar Releases publicadas
  fastify.get(
    '/api/v1/projects/:projectId/releases',
    {
      schema: {
        tags: ['Releases'],
        summary: 'Listar Releases publicadas do projeto',
        security: [{ bearerAuth: [] }],
        params: z.object({
          projectId: z.string().min(1),
        }),
      },
    },
    controller.listReleases.bind(controller)
  );
};
