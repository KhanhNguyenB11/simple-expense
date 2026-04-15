# Architecture & Design Decisions

## Stack Choices

**Backend: NestJS + TypeScript**
NestJS provides structured, opinionated module boundaries that enforce clean separation of concerns.
The built-in DI container, guard/interceptor pattern for RBAC, and first-class TypeScript support made
it the right call for a system that needs clear auth boundaries at every layer. The alternative was plain
Express, which would have been faster to start but harder to keep organized as the surface area grew.

**Frontend: Next.js 14 (App Router)**
Next.js App Router cleanly separates admin and user routes via route groups `(auth)`, `(user)`, `(admin)`.
Server components handle the static shell; client components with TanStack Query handle all data fetching
and cache invalidation. TanStack Query's `refetchInterval` handles the AI extraction polling state with
minimal code.

**Database: PostgreSQL + Prisma**
The domain is inherently relational — User → Report → Items with cascade deletes and computed aggregates.
PostgreSQL handles this naturally. Prisma gives type-safe queries generated from the schema, eliminating
a class of runtime type bugs. The tradeoff is the client generation step in CI, which is minor.

**File Storage: MinIO**
The assessment allows local file storage. MinIO gives us an S3-compatible API locally, meaning zero
code changes are needed to switch to AWS S3 or GCS in production — just update env vars. Files are
stored in MinIO; the backend returns short-lived presigned GET URLs, so we never proxy binary data
through the API server.

**AI Extraction: Synchronous / Same Request**
Receipt extraction happens synchronously within the upload request. The frontend displays an
"Extracting…" state while awaiting the response. The extracted values are returned alongside the
upload response and pre-fill the item form — the user reviews and can override any value before saving.

I chose synchronous over async/polling because:
1. GPT-4o-mini typically responds in 2–4 seconds — acceptable latency for a single file upload action.
2. It eliminates a job queue, a status endpoint, and polling logic on the frontend.
3. User expectation when uploading a file is to see results promptly.

If throughput became a concern (many concurrent uploads, large PDFs), I would move to a background
queue (BullMQ + Redis). See *"One More Day"* below.

## Key Design Decisions

**REJECTED → re-submit path**
When a report is Rejected, users can edit its items (items are editable in DRAFT *and* REJECTED states)
and re-submit directly: `REJECTED → SUBMITTED`. I chose not to force a detour through DRAFT because it
adds no value — the user already has full edit rights in REJECTED state, and re-submission is the
meaningful action. This is encoded in `state-machine.ts` and unit-tested explicitly.

**`total_amount` computed at read time**
Rather than storing `total_amount` as a persisted column and keeping it synchronized across item
mutations, I aggregate `expense_items.amount` on demand. For this scale this is simpler, always
accurate, and avoids an entire class of consistency bugs. If read performance became a concern
at scale, I'd add a materialized column updated via Prisma middleware or a trigger.

**State machine as pure module**
`state-machine.ts` is plain TypeScript — no NestJS decorators, no Prisma imports. This keeps it
trivially unit-testable and makes the transition rules easy to find and audit. Controllers never
directly change report status; they delegate to the service layer, which calls the state machine.

**Presigned URLs for receipts**
Receipt files are served via MinIO presigned URLs (1-hour TTL), not proxied through the API. This
offloads bandwidth and keeps the API surface clean. The `receipt_url` column stores the MinIO object
key, not the presigned URL itself — the URL is generated fresh on each read.

---

## If You Had One More Day, What Would You Build Next and Why?

**1. Per-report audit trail (highest priority)**

The most immediate gap in the current system is visibility into *what happened* to a report and *why*.
When a report is rejected, the user only knows it was rejected — not the reason, not who reviewed it,
not when. I would add a `ReportEvent` table:

```
ReportEvent { id, reportId, fromStatus, toStatus, performedByUserId, note, createdAt }
```

Every status transition (approve, reject, submit) writes a row. The admin UI shows a timeline on the
report detail. The user sees the rejection reason directly on their report page. This single feature
would dramatically reduce back-and-forth between submitters and approvers, which is the most
expensive friction in an approval workflow. It also satisfies audit/compliance requirements that
any real expense system would face.

**2. Background queue for AI receipt extraction**

Currently, a slow OpenAI response blocks the upload request. Moving extraction to a background
job (BullMQ + Redis, or PgBoss which reuses the existing Postgres instance) would:
- Return the upload response immediately with a `processingStatus: pending` field.
- Let the frontend poll `GET /items/:id/extraction-status` (already easy with TanStack Query).
- Handle retries gracefully if the OpenAI call fails transiently.

This also opens the door to processing multi-page PDFs where extraction takes longer. I'd tackle
this second because it's an infrastructure improvement rather than a user-facing feature — the
audit trail has clearer business value and a lower implementation cost.

**3. Admin rejection reason & user notification**

A natural extension of the audit trail: the admin provides a short reason when rejecting a report
(`PATCH /admin/reports/:id/action` with `action: reject, reason: "missing receipts for items 2-4"`).
This reason surfaces on the user's report detail page with a clear "Your report was rejected: …"
call-to-action. Combined with the audit trail, this closes the feedback loop that makes the
approve/reject cycle genuinely useful rather than a black box.

The priority order above reflects a *maximize user × approver value per hour of effort* lens.
The audit trail changes trust in the system. The background queue is infrastructure. The rejection
reason is UX. I'd ship them in that order.
