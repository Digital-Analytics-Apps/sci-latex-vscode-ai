import fastify from 'fastify';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import cookie from '@fastify/cookie';
import sensible from '@fastify/sensible';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import {
  jsonSchemaTransform,
  serializerCompiler,
  validatorCompiler,
  ZodTypeProvider,
} from 'fastify-type-provider-zod';
import { env } from './config/env';
import { authRoutes } from './modules/auth/auth.routes';
import { eventsRoutes } from './modules/events/events.routes';
import { projectsRoutes } from './modules/projects/projects.routes';

export async function buildApp() {
  const app = fastify({
    logger: true,
  }).withTypeProvider<ZodTypeProvider>();

  // Configura os compiladores de validação e serialização do Zod
  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);

  // Registra os plugins de documentação interativa Swagger/OpenAPI
  await app.register(swagger, {
    openapi: {
      info: {
        title: 'SCI-LaTeX-VSCode API Documentation',
        description: 'Self-Hosted Scientific Article Platform Backend REST API & Events',
        version: '1.0.0',
      },
      components: {
        securitySchemes: {
          bearerAuth: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT',
          },
        },
      },
    },
    transform: jsonSchemaTransform,
  });

  await app.register(swaggerUi, {
    routePrefix: '/docs',
  });

  // Registra plugins do ecossistema Fastify
  await app.register(sensible);
  await app.register(cors, {
    origin: true,
    credentials: true,
  });
  await app.register(cookie);
  await app.register(jwt, {
    secret: env.JWT_SECRET,
    cookie: {
      cookieName: 'refreshToken',
      signed: false,
    },
  });

  // Registra rotas de módulos com prefixo /api/v1
  await app.register(authRoutes, { prefix: '/api/v1/auth' });
  await app.register(eventsRoutes, { prefix: '/api/v1/events' });
  await app.register(projectsRoutes, { prefix: '/api/v1/projects' });

  // Rota de Health Check
  app.get('/health', async () => {
    return {
      status: 'ok',
      service: 'sci-latex-backend',
      timestamp: new Date().toISOString(),
    };
  });

  return app;
}
