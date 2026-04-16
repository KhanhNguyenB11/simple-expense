# Expense Report Management System

A full-stack expense report system with JWT auth, role-based access control,
AI receipt extraction via Google Gemini, and a Next.js frontend backed by NestJS.

## Tech stack

| Layer        | Technology                                                         |
| ----------- | ------------------------------------------------------------------ |
| Frontend    | Next.js 14 (App Router), TypeScript, TanStack Query, Tailwind CSS |
| Backend     | NestJS, TypeScript, Prisma ORM                                     |
| Database    | PostgreSQL 16                                                      |
| File Storage| MinIO (S3-compatible)                                              |
| AI          | Google Gemini (multimodal)                                         |

## Prerequisites

- Docker & Docker Compose
- A Google Gemini API key (optional — the app runs without it; extraction returns nulls)

## Running locally

1. Clone the repo and configure environment variables:

   ```bash
   cp .env.example .env
   cp backend/.env.example backend/.env
   # Add your GEMINI_API_KEY to backend/.env (optional)
   ```

2. Start all services:

   ```bash
   docker compose up --build
   ```

3. Run database migrations:

   ```bash
   docker compose exec backend npx prisma migrate deploy
   docker compose exec backend npm run prisma:seed
   ```

4. Open:

   - Frontend: `http://localhost:3000`
   - Backend API: `http://localhost:3001/api`
   - MinIO Console: `http://localhost:9001` (minioadmin / minioadmin)

## Creating an admin user

The simplest way to create an admin for local testing:

1. Sign up via the UI as a regular user.  
2. Promote that user to admin directly in the database:

   ```sql
   UPDATE users SET role = 'admin' WHERE email = 'admin@example.com';
   ```

Adjust the email to match the account you created.

## Running tests

```bash
# Unit tests — state machine + business logic
cd backend && npm test

# Integration test — DRAFT → SUBMITTED → APPROVED happy path
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

I used AI coding tools (Cursor with Claude / Copilot-style assistance) throughout this project as a
primary accelerator. AI helped with: initial NestJS module scaffolding, Prisma schema generation,
the Gemini extraction service, Tailwind-styled frontend components, and the integration test
structure.

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
