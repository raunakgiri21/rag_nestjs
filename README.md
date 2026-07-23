# RAG API

Compact NestJS backend for the RAG project. The app entrypoint is intentionally small: [`src/app.controller.ts`](src/app.controller.ts) returns `Hello World!`, [`src/app.service.ts`](src/app.service.ts) owns that response, and [`src/main.ts`](src/main.ts) bootstraps the API with the `api` prefix, `ZodValidationPipe`, `ResponseInterceptor`, and `HttpExceptionFilter`.

## Phase 1 Auth Setup

Phase 1 is a full JWT auth flow with Prisma-backed users and refresh tokens.

- `POST /api/auth/register` creates a user, hashes the password with `bcrypt`, and issues tokens.
- `POST /api/auth/login` checks email, `isActive`, and password before issuing tokens.
- `POST /api/auth/refresh` verifies the refresh token, validates it against the hashed DB copy, and rotates tokens.
- `POST /api/auth/logout` verifies the refresh token and deletes the stored refresh record.
- `GET /api/auth/me` is protected by JWT + role checks and currently requires `ADMIN`.

## Run

```bash
npm install
docker compose up -d
npx prisma generate
npx prisma migrate dev
npm run start:dev
```

## Prisma

- Schema: [`prisma/schema.prisma`](prisma/schema.prisma)
- Database: Postgres from [`docker-compose.yml`](docker-compose.yml)
- Useful commands: `npx prisma generate`, `npx prisma migrate dev`, `npx prisma studio`

## Auth Architecture

- Configs: `src/config/app.config.ts`, `src/config/database.config.ts`, `src/config/jwt.config.ts`
- App module: global `ConfigModule`, plus `PrismaModule` and `AuthModule`
- Prisma layer: `PrismaService` uses `PrismaPg` and connects with `database.url`
- User schema (`User`): `id` (uuid), unique `email`, hashed `password`, `role` (`USER|ADMIN`), `isActive`, `createdAt`, `updatedAt`
- Refresh token schema (`RefreshToken`): `id`, `tokenHash`, `expiresAt`, `createdAt`, unique `userId` FK -> `User.id` (`onDelete: Cascade`)
- User-token relation: one-to-one (`User.refreshToken`), so each user keeps one active refresh token record at a time
- JWT layer: `AuthModule` registers `JwtModule` asynchronously with `jwt.accessSecret` and `jwt.accessExpiresIn`
- Strategy: `src/auth/jwt.ts` reads Bearer tokens, verifies access tokens, and loads the user from Prisma
- Passwords: `bcrypt.hash(..., 10)` on register, `bcrypt.compare(...)` on login
- Tokens: access and refresh tokens are signed from the same payload; refresh/logout hash the token with Node `crypto` SHA-256, compare it in constant time, and then delete/save the stored refresh record; old refresh token rows are deleted before saving a new hashed refresh token
- Guards: `JwtAuthGuard` protects auth routes, `RolesGuard` checks `@Roles(...)` metadata
- Decorators: `@CurrentUser()` reads `request.user`, `@Roles(...)` marks role-restricted routes
- DTO validation: `nestjs-zod` DTOs define request schemas for login, register, refresh, and logout
- Error/response handling: global `ResponseInterceptor` wraps success responses, and `HttpExceptionFilter` standardizes failures

## Redis Rate Limiter

- Redis stores a counter for each IP and route handled by `RateLimitGuard`.
- Each counter gets a TTL, so the limit resets automatically after the configured window.
- When the counter goes over the limit, the API returns `429 Too Many Requests`.

## Phase 2 RAG Setup

Phase 2 adds the retrieval-augmented generation pipeline around the auth foundation.

- `POST /api/kb/upload` accepts a file upload, validates that a file exists, and forwards it to the ingestion pipeline.
- The ingestion flow lives under [`src/kb`](src/kb):
  - [`src/kb/kb.controller.ts`](src/kb/kb.controller.ts) exposes the upload endpoint.
  - [`src/kb/services/ingestion/ingestion.service.ts`](src/kb/services/ingestion/ingestion.service.ts) chooses the right loader based on MIME type, validates the input, splits the content into chunks, embeds those chunks, and writes them to the vector store.
  - [`src/kb/loaders/pdf-loader.service.ts`](src/kb/loaders/pdf-loader.service.ts) loads PDF files into LangChain documents.
  - [`src/kb/loaders/text-loader.service.ts`](src/kb/loaders/text-loader.service.ts) loads plain text files into a single document.
  - [`src/kb/splitters/text-splitter.service.ts`](src/kb/splitters/text-splitter.service.ts) uses a recursive character splitter with chunk size `1000` and overlap `200`.
  - [`src/kb/embeddings/embeddings.service.ts`](src/kb/embeddings/embeddings.service.ts) sends the chunk text to the Gemini embedding model and returns embeddings for each chunk.
  - [`src/kb/vector-store/vector-store.service.ts`](src/kb/vector-store/vector-store.service.ts) connects to Qdrant, ensures the expected collection exists, and upserts vector payloads containing the chunk text and metadata.
- The current retrieval service is scaffolded in [`src/kb/services/retriever/retriever.service.ts`](src/kb/services/retriever/retriever.service.ts) and is ready for the next step: querying stored vectors and returning relevant context.

## Scripts

```bash
npm run start:dev
npm run build
npm run test
npm run test:e2e
```

## Env

Required env keys:

- Core: `PORT`, `DATABASE_URL`, `JWT_ACCESS_SECRET`, `JWT_ACCESS_EXPIRES_IN`, `JWT_REFRESH_SECRET`, `JWT_REFRESH_EXPIRES_IN`
- Postgres: `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD`
- Redis: `REDIS_HOST`, `REDIS_PORT`
- AI / RAG: `GEMINI_API_KEY`, `GEMINI_MODEL`, `GEMINI_EMBEDDING_MODEL`, `QDRANT_URL`, `QDRANT_COLLECTION`
