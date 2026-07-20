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

## Scripts

```bash
npm run start:dev
npm run build
npm run test
npm run test:e2e
```

## Env

Required env keys: `PORT`, `DATABASE_URL`, `JWT_ACCESS_SECRET`, `JWT_ACCESS_EXPIRES_IN`, `JWT_REFRESH_SECRET`, `JWT_REFRESH_EXPIRES_IN`, `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD`, `REDIS_HOST`, `REDIS_PORT`.
