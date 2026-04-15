# Project Context for Claude

## Project Overview

Expense Report Management System — full-stack app (NestJS backend, Next.js frontend)
for expense tracking with a multi-step approval workflow and AI receipt extraction.

## Key Architecture Rules

- Business logic (state machine, transition validation) lives ONLY in `backend/src/reports/state-machine.ts`
- Controllers handle HTTP concerns only — they never set `report.status` directly
- All status transitions must go through `applyTransition()` in the service layer
- Item edits must call `assertItemsEditable()` before any mutation

## Domain Rules

1. Items are editable only when the parent report is in DRAFT or REJECTED state
2. Only DRAFT reports can be deleted
3. REJECTED reports go directly to SUBMITTED on re-submit (no intermediate DRAFT step)
4. APPROVED is a terminal state — no further transitions allowed

## State Machine

```
DRAFT     --[submit]--> SUBMITTED --[approve]--> APPROVED (terminal)
REJECTED  --[submit]--> SUBMITTED
SUBMITTED --[reject]-->  REJECTED
```

## File Upload Flow

1. `POST /api/reports/:reportId/items/:itemId/receipt` (multipart/form-data)
2. Multer buffers file in memory (max 10MB)
3. `StorageService` uploads buffer to MinIO, returns object key
4. `ExtractionService` sends base64 to GPT-4o-mini vision endpoint
5. Response: `{ receiptUrl: presignedUrl, extracted: { merchantName, amount, currency, transactionDate } }`
6. Frontend pre-fills item form — user reviews, can override any field, then saves

## Do Not

- Add NestJS/Prisma logic inside controllers beyond routing + DTO validation
- Store computed `total_amount` in the DB — aggregate at read time
- Shortcut the state machine with direct DB status updates in services
- Throw generic 500s — use NestJS `HttpException` subclasses with meaningful messages
