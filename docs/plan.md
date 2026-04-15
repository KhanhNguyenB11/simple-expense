# Build Plan

## Phase 1 — Foundation

- [x] Define Prisma schema and enums
- [x] Set up docker-compose (Postgres, MinIO, backend, frontend)
- [x] Add backend/frontend Dockerfiles

## Phase 2 — Auth & RBAC

- [x] Signup/Login endpoints with JWT
- [x] JwtAuthGuard + RolesGuard
- [x] Role decorator (`@Roles`)

## Phase 3 — Expense Report Domain

- [x] Implement state machine module
- [x] Report CRUD
- [x] Submit transition
- [x] Admin approve/reject actions

## Phase 4 — Expense Items + Upload + AI

- [x] Item CRUD gated by report status
- [x] Receipt upload endpoint
- [x] MinIO integration
- [x] GPT extraction integration

## Phase 5 — Frontend

- [x] Login/Signup screens
- [x] Report list and detail
- [x] Item add/delete flow
- [x] Receipt upload UI state
- [x] Admin review view

## Phase 6 — Testing & Finalization

- [x] Unit tests for state machine
- [x] Integration test happy path
- [x] README + DECISIONS + AI notes
