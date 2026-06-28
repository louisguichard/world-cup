# Local development

## Prerequisites

- Node.js 22+
- Docker Desktop (Postgres + Redis + Redpanda)
- Copy env: `cp .env.example .env.local`

## Startup sequence

```bash
# 1. Infrastructure
npm run stack:up

# 2. Database schema
npm run db:push
npm run db:seed          # optional — identity aliases

# 3. Verify connectivity
npm run verify:db

# 4. App processes (separate terminals)
npm run web:dev          # Vite PWA — http://127.0.0.1:5173 (includes dev /api/qualification + /api/events)
npm run server:dev       # Hono + BullMQ workers (requires Redis)
npm run admin:dev        # Admin console — http://127.0.0.1:5174
```

Vite dev serves `/api/qualification/:groupId`, `/api/events` (SSE heartbeat), and `/api/health` via middleware — no `vercel dev` required for analyst panels.

## Admin writes

Set matching tokens in root and admin app:

```bash
# .env.local
DEV_ADMIN_TOKEN=dev-admin-change-me

# apps/admin/.env.local
VITE_DEV_ADMIN_TOKEN=dev-admin-change-me
```

Correction and quarantine **PUT** routes require the token.

## Testing

```bash
npm run test:all         # client + packages + server
npm run smoke:pipeline   # identity + qual (no Docker)
npm run smoke:db         # Postgres when DATABASE_URL set
npm run verify:db        # Postgres when DATABASE_URL set
```

## SSE vs polling

When SSE connects (`/api/events`), live polling is suppressed. Disconnect or set `LIVE_DATA_FLAGS.ssePrimary = false` in [`src/config/liveDataFlags.ts`](../src/config/liveDataFlags.ts) to force polling fallback.

## Stack services

| Service   | Port  | Purpose              |
|-----------|-------|----------------------|
| Postgres  | 5432  | Canonical + snapshots |
| Redis     | 6379  | Streams + BullMQ     |
| Redpanda  | 9092  | Kafka-compatible (future) |

Compose file: [`infra/local/docker-compose.yml`](../infra/local/docker-compose.yml)
