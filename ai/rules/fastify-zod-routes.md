# Project Rule - Fastify Zod Type-Provider Routes

All Fastify route definitions in this project MUST use `fastify-type-provider-zod` schemas for runtime validation, automatic static type inference, and Swagger/OpenAPI documentation generation.

## Mandatory Rules:
1. **No Manual Type Casting**: Never use `request.params as { ... }`, `request.body as { ... }`, or `request.query as { ... }`.
2. **Schema Property Required**: Provide `params`, `body`, `querystring` using Zod (`z.object(...)`) inside the route config `schema` object.
3. **OpenAPI Metadata**: Include `tags`, `summary`, and `security` inside `schema`.
