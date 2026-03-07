# manage-meals-api

Backend API for [ManageMeals](https://managemeals.com), a recipe manager application.

## Project Overview

This repo contains the main Fastify API plus several supporting services, each running in its own Docker container:

| Service | Directory | Description |
|---|---|---|
| API | `src/` | Main Fastify HTTP API |
| Queue Consumer | `queue/` | RabbitMQ consumer (Node.js) |
| Recipe Scraper | `scraper/` | Python service that scrapes recipes from URLs |
| Search Sync | `search/` | Syncs MongoDB data to Typesense |
| Webhooks Handler | `webhooks/` | Cronjob that processes webhook data saved to DB |

## Tech Stack

- **Runtime**: Node.js (ESM, TypeScript)
- **Framework**: Fastify v5 with `@fastify/type-provider-typebox` and `@sinclair/typebox` for schema validation
- **Database**: MongoDB (`@fastify/mongodb`)
- **Cache**: Redis (`@fastify/redis`)
- **Search**: Typesense
- **Queue**: RabbitMQ (amqplib)
- **Storage**: S3-compatible object storage (`@aws-sdk/client-s3`)
- **Auth**: JWT (access + refresh tokens), bcrypt, OAuth2 (Google, Facebook)
- **Payments**: GoCardless, PayPal
- **Email**: Nodemailer (SMTP)

## Development

```bash
# Run API in dev mode (hot reload via tsx)
npm run dev

# Build TypeScript
npm run build

# Run built output
npm start
```

## Infrastructure

Docker Compose is split into separate files. Use `make` commands:

```bash
# Infrastructure only (mongo, redis, rabbitmq, typesense, scrapers, etc.)
make up-infra
make stop-infra
make clean-infra   # tears down + removes volumes

# Full app (infra + API container)
make up-app
make upd-app       # detached
make stop-app

# Self-hosted setup
make up-selfhost
make upd-selfhost
```

Override files (`*.override.yaml`) allow local config on top of base compose files.

## Project Structure

```
src/
  index.ts          # Entry point, starts Fastify server
  app.ts            # Plugin and route registration
  types.ts          # Shared TypeScript types
  custom-types.d.ts # Fastify type augmentations
  plugins/          # Fastify plugins (one per concern)
    env.ts          # Config via @fastify/env (reads .env in non-prod)
    mongo.ts
    redis.ts
    jwt.ts
    bcrypt.ts
    amqp.ts         # RabbitMQ connection
    typesense.ts
    s3.ts
    oauth.ts        # Google + Facebook OAuth
    gocardless.ts
    globalconfig.ts
    mailer.ts
    slugify.ts
    multipart.ts
    axios.ts
  routes/
    v1/
      index.ts
      authed/       # Routes requiring JWT auth
        recipes.ts
        categories.ts
        tags.ts
        meal-plans.ts
        shopping-lists.ts
        search.ts
        settings.ts
        subscriptions.ts
        share.ts
        help.ts
        premium/
        admin/
      unauthed/     # Public routes
        auth.ts     # Login, register, token refresh
        share.ts
    infra/          # Internal/health endpoints (protected by INFRA_ENDPOINT_KEY)
    webhooks/       # Webhook receivers (GoCardless, PayPal)

queue/              # Node.js RabbitMQ consumer
scraper/            # Python recipe scraper
search/             # Node.js Typesense sync service
webhooks/           # Node.js webhooks cronjob handler
```

## Configuration

All config is via environment variables, loaded through `src/plugins/env.ts`. In non-production, a `.env` file is read automatically. Key variables:

- `MONGO_URL`, `MONGO_DB` — MongoDB connection
- `REDIS_URL` — Redis connection
- `RABBITMQ_URL` — RabbitMQ connection
- `TYPESENSE_HOST`, `TYPESENSE_PORT`, `TYPESENSE_API_KEY`
- `ACCESS_JWT_SECRET`, `REFRESH_JWT_SECRET` — JWT signing
- `S3_KEY`, `S3_SECRET`, `S3_ENDPOINT`, `S3_REGION`, `S3_BUCKET` — Object storage
- `RECIPE_SCRAPER_URL` — URL of the scraper service
- `SMTP_HOST`, `SMTP_USER`, `SMTP_PASS`, `SMTP_PORT`, `SMTP_DEFAULT_FROM`
- `GOCARDLESS_ACCESS_TOKEN`, `GOCARDLESS_ENV`, `GOCARDLESS_WEBHOOK_SECRET`
- `OAUTH_GOOGLE_CLIENT_ID`, `OAUTH_GOOGLE_CLIENT_SECRET`
- `OAUTH_FACEBOOK_CLIENT_ID`, `OAUTH_FACEBOOK_CLIENT_SECRET`
- `MOCK_INSTANCE` — Set to `"yes"` to block all non-GET requests (demo mode)
- `EMAIL_VERIFY_ENABLED` — Toggle email verification flow
- `USER_REGISTER_ENABLED` — Toggle user self-registration
- `OAUTH_ENABLED` — Toggle OAuth login

Infra endpoints use `INFRA_ENDPOINT_KEY` for basic auth.

## Patterns & Conventions

- TypeBox schemas are defined inline with route handlers for request/response validation
- Plugins are registered conditionally based on config (e.g. S3, RabbitMQ, GoCardless, OAuth only load if env vars are set)
- Auth is handled via JWT preHandler hooks on authed routes
- Pagination uses `ITEMS_PER_PAGE` (default 20)
- File uploads go through `@fastify/multipart` then to S3; `MAX_FILE_SIZE_BYTES` defaults to 10 MB
- Health check: `GET /infra/health` (excluded from request logging)
