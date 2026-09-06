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
import { pullRequestsRoutes } from './modules/pull-requests/pull-requests.routes';
import { dashboardRoutes } from './modules/dashboard/dashboard.routes';
import { teamsRoutes } from './modules/teams/teams.routes';
import { academicPeriodsRoutes } from './modules/academic-periods/academic-periods.routes';

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
      tags: [
        {
          name: 'Auth',
          description:
            'Autenticação e Gestão de Sessão (Register, Login, Refresh, Logout, Profile)',
        },
        {
          name: 'Teams',
          description:
            'Gestão de Equipes, Laboratórios de Pesquisa e Membros (Gerente e Coordenador)',
        },
        {
          name: 'Projects',
          description: 'Gestão de Artigos Científicos, Repositórios e Congressos (Target/Backup)',
        },
        {
          name: 'PullRequests',
          description: 'Fluxo de Revisão de PRs, Parecer do NIT e Trava de Merge',
        },
        {
          name: 'Dashboard',
          description: 'Painel Consolidado de Gestão e Métricas para Gerente e Admin',
        },
        { name: 'AcademicPeriods', description: 'Ciclos e Períodos Acadêmicos' },
        { name: 'Events', description: 'Notificações em Tempo Real via Server-Sent Events (SSE)' },
        { name: 'Health', description: 'Health Check e Status do Servidor' },
      ],
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
    uiConfig: {
      docExpansion: 'list',
      deepLinking: true,
    },
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
  await app.register(pullRequestsRoutes, { prefix: '/api/v1/pull-requests' });
  await app.register(dashboardRoutes, { prefix: '/api/v1/dashboard' });
  await app.register(teamsRoutes, { prefix: '/api/v1/teams' });
  await app.register(academicPeriodsRoutes, { prefix: '/api/v1/academic-periods' });

  // Rota de Health Check
  app.get(
    '/health',
    {
      schema: {
        tags: ['Health'],
        summary: 'Verificação de Saúde do Servidor',
        description: 'Retorna o status atual do serviço backend SCI-LaTeX.',
      },
    },
    async () => {
      return {
        status: 'ok',
        service: 'sci-latex-backend',
        timestamp: new Date().toISOString(),
      };
    }
  );

  return app;
}
