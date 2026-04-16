# Expense Report Management System

A full-stack expense report system with JWT auth, role-based access control,
AI receipt extraction via Google Gemini, and a Next.js frontend backed by NestJS.

## Tech stack

| Layer        | Technology                                                         |
| ----------- | ------------------------------------------------------------------ |
| Frontend    | Next.js 16 (App Router), TypeScript, TanStack Query, Tailwind CSS |
| Backend     | NestJS, TypeScript, Prisma ORM                                     |
| Database    | PostgreSQL 16                                                      |
| File Storage| MinIO (S3-compatible)                                              |
| AI          | Google Gemini (multimodal)                                         |

## Prerequisites

- Docker & Docker Compose
- A Google Gemini API key (optional — the app runs without it; extraction returns nulls)

## Running locally

### Setup Gemini API key (optional) 

- Docker mode: set GEMINI_API_KEY in root .env
- Local backend mode: set GEMINI_API_KEY in backend/.env



### Quickstart (recommended)

```bash
./scripts/dev.sh
```

### Manual steps

1. Clone the repo and configure environment variables:

   ```bash
   cp .env.example .env
   cp backend/.env.example backend/.env
   cp frontend/.env.example frontend/.env
   # Add your GEMINI_API_KEY to .env (optional)
   ```

   Env loading rules:
   - Docker Compose reads variables from root `.env`.
   - `backend/.env` is used when you run backend commands directly from `backend/`.
   - `frontend/.env` is used when you run frontend directly from `frontend/`.

2. Start all services:

   ```bash
   docker compose up --build
   ```

3. Run database migrations:

   ```bash
   docker compose exec backend npx prisma migrate dev
   docker compose exec backend npx prisma db seed
   ```

4. Open:

   - Frontend: `http://localhost:3000`
   - Backend API: `http://localhost:8001/api`
   - MinIO Console: `http://localhost:9001` (minioadmin / minioadmin)

## Creating an admin user

`npx prisma db seed` (step 3 above) automatically creates or updates an admin user using
`ADMIN_EMAIL` / `ADMIN_PASSWORD` from root `.env` in Docker mode (defaults to `admin@expense.local` /
`Admin123!`). You can log in with those credentials immediately after seeding.

## Running tests

```bash
# Run tests without installing Node locally (recommended)
docker compose exec backend npm test
docker compose exec backend npm run test:integration

# Or run locally (requires Node/npm)
cd backend && npm test
cd backend && npm run test:integration
```


## Project structure

```text
backend/
  src/
    auth/        JWT signup/login, RBAC guards & decorators
    reports/     Report CRUD + state machine (state-machine.ts)
    items/       Expense item CRUD + receipt upload
    admin/       Admin approve/reject endpoints
    storage/     MinIO service
    extraction/  Receipt parsing via Gemini
    prisma/      PrismaService (global)
  prisma/
    schema.prisma   Data model
  test/          Integration tests

frontend/
  src/
    app/
      (auth)/    Login, Signup pages
      (user)/    Report list, Report detail
      (admin)/   Admin review panel
    components/  StatusBadge, ReceiptUpload, report UI
    lib/         api.ts (Axios instance), auth.ts (current user helper)
    providers/   React Query client provider
```

Business logic (state machine + transition validation) lives entirely in
`backend/src/reports/state-machine.ts` as pure functions — no DB dependencies. Controllers never
touch transition logic directly; they delegate to services that call the state machine.

## AI usage

I used AI coding tools (Cursor with Claude / Copilot-style assistance) throughout this project as a primary accelerator. AI helped with: initial NestJS module scaffolding, Prisma schema generation, the Gemini extraction service, Tailwind-styled frontend components, and the integration test structure.

I overrode or corrected AI output in several key places:

- **State machine and roles**: the initial AI draft allowed admin users to submit reports; I tightened
  the role gating and ensured all transitions go through the state machine instead of direct updates.
- **Auth storage model**: AI first used `localStorage` for JWTs; I switched to HTTP‑only cookies and a
  `/api/auth/me` endpoint so the frontend never touches the raw token.
- **Form + UI integration**: I rewrote parts of the ReceiptUpload + `ItemForm` integration to avoid
  race conditions and to surface a clear “AI pre‑filled” summary instead of opaque status text.
- **Data model**: AI initially proposed storing `total_amount` as a persisted column; I replaced it
  with runtime aggregation to avoid sync bugs.

Evidence of AI tool usage is in `.cursor/`, `CLAUDE.md`, and the `docs/` directory.
