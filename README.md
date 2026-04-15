# Expense Report Management System

A full-stack expense report system with JWT auth, role-based access control,
AI receipt extraction via GPT-4o-mini, and a Next.js frontend backed by NestJS.

## Tech Stack

| Layer        | Technology                                          |
| ------------ | --------------------------------------------------- |
| Frontend     | Next.js 14 (App Router), TypeScript, TanStack Query, Tailwind CSS |
| Backend      | NestJS, TypeScript, Prisma ORM                      |
| Database     | PostgreSQL 16                                       |
| File Storage | MinIO (S3-compatible)                               |
| AI Extraction| OpenAI GPT-4o-mini (vision)                        |

## Prerequisites

- Docker & Docker Compose
- An OpenAI API key (optional — the app works without it; extraction returns nulls)

## Running Locally

1. Clone the repo and configure environment:
   ```bash
   cp backend/.env.example backend/.env
   # Add your OPENAI_API_KEY to backend/.env (optional)
   ```

2. Start all services:
   ```bash
   docker compose up --build
   ```

3. Run database migrations:
   ```bash
   docker compose exec backend npx prisma migrate deploy
   ```

4. Open:
   - Frontend:     http://localhost:3000
   - Backend API:  http://localhost:3001/api
   - MinIO Console: http://localhost:9001 (minioadmin / minioadmin)

## Creating an Admin User

Sign up via the UI, then promote to admin directly in the database:
```sql
UPDATE users SET role = 'admin' WHERE email = 'admin@example.com';
```

## Running Tests

```bash
# Unit tests — state machine + business logic
cd backend && npm test

# Integration test — DRAFT → SUBMITTED → APPROVED happy path
cd backend && npm run test:integration
```

## Project Structure

```
backend/
  src/
    auth/           JWT signup/login, RBAC guards & decorators
    reports/        Report CRUD + state machine (state-machine.ts)
    items/          Expense item CRUD + receipt upload
    admin/          Admin approve/reject endpoints
    storage/        MinIO service
    extraction/     OpenAI receipt parsing
    prisma/         PrismaService (global)
  prisma/
    schema.prisma   Data model
  test/             Integration tests

frontend/
  src/
    app/
      (auth)/       Login, Signup pages
      (user)/       Report list, Report detail
      (admin)/      Admin review panel
    components/     StatusBadge, ReceiptUpload
    lib/            api.ts (Axios instance), auth.ts (token helpers)
    providers/      React Query client provider
```

Business logic (state machine, transition validation) lives entirely in
`backend/src/reports/state-machine.ts` — pure functions, no DB dependencies,
fully unit-tested. Controllers never touch transition logic directly.

## AI Usage

I used GitHub Copilot (Claude Sonnet) throughout this project as a primary accelerator.
AI helped with: initial NestJS module scaffolding, Prisma schema generation, the OpenAI
extraction service, Tailwind-styled frontend components, and the integration test structure.

I overrode or corrected AI output in several key places:
- The state machine initially allowed admin to submit reports — I fixed the role gating.
- The RolesGuard reflector call only checked the handler; I added the class-level check.
- The ReceiptUpload component had a status racing condition; I rewrote the state transitions.
- AI generated `total_amount` as a stored column; I replaced it with runtime aggregation
  to avoid sync bugs.

Evidence of AI tool usage is in `.claude/` and `docs/`.
