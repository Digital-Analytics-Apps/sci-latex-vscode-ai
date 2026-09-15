# Project Architecture Standards (Clean 3-Tier, Infra & Utils Separation, Parameter Property DI)

All modules in this repository MUST follow the unified architecture and TypeScript constructor parameter properties dependency injection.

## 1. Clean Directory Structure
- **`src/modules/`**: Contains ONLY pure domain REST feature modules (`projects`, `tasks`, `teams`, `pull-requests`, `users`, `auth`, `releases`, `academic-periods`, `dashboard`, `events`, `editor-proxy`). Every REST module MUST have `*.routes.ts` and `*.controller.ts`.
- **`src/infra/`**: Contains technical infrastructure services and external API wrappers (`git/git.service.ts`, `k8s/k8s-pod-manager.service.ts`).
- **`src/utils/`**: Contains pure stateless helper utilities (`deadlines.ts`, `hash.ts`, `audit.ts`).
- **`src/repositories/`**: Contains Prisma ORM database repositories.

## 2. 3-Tier Layer Separation
Every REST feature module must be separated into:
- **`*.routes.ts`**: Defines routes, Fastify Zod schemas, auth/RBAC hooks, and binds handler methods to the controller. Must export `FastifyPluginAsyncZod`.
- **`*.controller.ts`**: Handles HTTP request parsing, status codes, and delegates business operations to the Service.
- **`*.service.ts`**: Encapsulates core business logic and delegates database queries to Repositories. Is free of Fastify HTTP objects (`request`/`reply`).
- **`*.repository.ts`**: Encapsulates Prisma ORM calls behind an interface (`I<Entity>Repository`).

## 3. Constructor Parameter Properties Dependency Injection
Always use TypeScript parameter properties for dependency injection with default instances:

```typescript
// Controller Example
export class TasksController {
  constructor(
    private service: TasksService = new TasksService()
  ) {}
}

// Service Example
export class TasksService {
  constructor(
    private tasksRepository: ITasksRepository = new PrismaTasksRepository(),
    private k8sPodManager: K8sPodManagerService = new K8sPodManagerService()
  ) {}
}
```

## 4. Fastify Zod Type-Provider Routes
- Always use `FastifyPluginAsyncZod` for route plugin functions.
- Never use TypeScript type assertions (`as { ... }`) on `request.params`, `request.body`, or `request.query`.
- Always provide Zod schemas in `schema: { tags: [...], summary: '...', params, body, querystring }`.
