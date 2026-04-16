# Architecture & Design Decisions

## Stack Choices

**Backend: NestJS + TypeScript**  
NestJS provides opinionated module boundaries and a DI container that make it easy to keep auth,
RBAC guards, and business logic clearly separated. I chose it over plain Express because the extra
structure pays off quickly as the API surface grows.

**Frontend: Next.js 16 (App Router)**  
App Router route groups (`(auth)`, `(user)`, `(admin)`) give a clean separation between user and
admin flows. React Server Components handle the static shell; client components with TanStack Query
own data fetching and caching. This keeps network logic out of UI primitives.

**Database: PostgreSQL + Prisma**  
The domain is naturally relational — User → Report → Items with cascade deletes and computed
aggregates. PostgreSQL handles this well. Prisma generates type-safe queries from the schema, which
removes a class of runtime type bugs at the cost of a small generate step.

**File Storage: MinIO**  
The assessment allows local file storage. MinIO exposes an S3-compatible API locally, so switching to
AWS S3 or GCS later is a matter of configuration. Files are stored in MinIO; the backend returns
short-lived presigned GET URLs so the API never proxies binary data.

**AI Extraction (Gemini): synchronous / same request**  
Receipt extraction happens synchronously within the upload request via Google Gemini (multimodal).
The frontend displays an “Uploading & extracting…” state while awaiting the response. The extracted
values are returned alongside the upload response and pre-fill the item form — the user reviews and
can override any value before saving.

I chose synchronous over async/polling because:

1. Gemini typically responds in 2–4 seconds — acceptable latency for a single file upload action.
2. It eliminates a job queue, a status endpoint, and polling logic on the frontend.
3. When a user uploads a receipt, the natural expectation is to see results immediately.

If throughput became a concern (many concurrent uploads, large PDFs), I would move extraction to a
background queue (BullMQ + Redis or PgBoss). See *“One More Day”* below.

## Key Design Decisions

**REJECTED → re-submit path**  
When a report is REJECTED, users can edit its items (items are editable in DRAFT *and* REJECTED) and
re-submit directly: `REJECTED → SUBMITTED`. I chose not to force a detour through DRAFT because it
adds no value — the user already has full edit rights in REJECTED, and re-submission is the
meaningful action. This is encoded in `state-machine.ts` and explicitly unit-tested.

**`total_amount` computed at read time**  
Instead of storing `total_amount` as a persisted column and keeping it synchronized across item
mutations, I aggregate `expense_items.amount` on demand. For this scale it is simpler, always
accurate, and avoids an entire class of consistency bugs. If read performance became a concern at
scale, I would add a materialized column updated via Prisma middleware or a trigger.

**State machine as a pure module**  
`state-machine.ts` is plain TypeScript — no NestJS decorators, no Prisma imports. This keeps it
trivially unit-testable and makes transition rules easy to find and audit. Controllers never change
report status directly; they delegate to the service layer, which calls the state machine.

**Presigned URLs for receipts**  
Receipt files are served via MinIO presigned URLs (1‑hour TTL), not proxied through the API. This
offloads bandwidth and keeps the API surface small. The `receipt_url` column stores the MinIO object
key, not the presigned URL — the URL is generated fresh on each read.

---

## If You Had One More Day, What Would You Build Next and Why?

**1. Per-report audit trail (highest priority)**  
The biggest gap is visibility into *what happened* to a report and *why*. When a report is rejected,
the user only sees the current status — not the reason, who reviewed it, or when. I would add a
`ReportEvent` table:

```text
ReportEvent { id, reportId, fromStatus, toStatus, performedByUserId, note, createdAt }
```

Every status transition (approve, reject, submit) would write a row. The admin UI would show a
timeline on the report detail. The user would see the rejection reason directly on their report
page. This single feature would dramatically reduce back-and-forth between submitters and approvers
and satisfies audit/compliance requirements any real expense system would face.

**2. Background queue for AI receipt extraction**  
Currently, a slow Gemini response blocks the upload request. Moving extraction to a background job
(BullMQ + Redis, or PgBoss which reuses the existing Postgres instance) would:

- Return the upload response immediately with a `processingStatus: pending` field.
- Let the frontend poll `GET /items/:id/extraction-status` (easy with TanStack Query).
- Handle retries gracefully if the Gemini call fails transiently.

This also opens the door to processing multi-page PDFs where extraction takes longer. I would tackle
this second because it is an infrastructure improvement; the audit trail has clearer business value
for end users.

**3. Admin rejection reason & user notification**  
As a follow-on to the audit trail, the admin would provide a short reason when rejecting a report
(`PATCH /admin/reports/:id/action` with `action: reject, reason: "missing receipts for items 2–4"`).
This reason would surface on the user’s report detail page with a clear “Your report was rejected…”
message and guidance on what to fix. Combined with the audit trail, this closes the feedback loop
that makes the approve/reject cycle genuinely useful rather than a black box.

The priority order above follows a *maximize user × approver value per hour of effort* lens: the
audit trail changes trust in the system, the background queue is infrastructure, and the rejection
reason is UX polish. I would ship them in that order.

---

## How I Steered and Overrode AI Output

**Keeping business rules in the state machine**  
AI’s first drafts occasionally updated `report.status` directly inside controllers and Prisma calls.
I rejected that approach and funneled all transitions through `state-machine.ts` and
`applyTransition`, with `assertItemsEditable` enforced from services. This keeps controllers thin
and ensures status rules live in one place.

**Normalizing API shapes for the frontend**  
Early AI output returned raw Prisma models with inconsistent field names and optional relations.
I simplified the responses (for example, always including an `items` array and computing
`total_amount` in the service) so the frontend can render reports without defensive null checks
everywhere.

**Receipt upload and attachment endpoints**  
AI initially suggested a single, generic upload endpoint. I split this into:

- `POST /reports/:id/receipt` for draft items.  
- `POST /reports/:id/items/:itemId/receipt` for existing items.  
- `GET/DELETE /reports/:id[/items/:itemId]/files` for listing and deleting attachments.

This separation made ownership checks, MinIO key prefixes, and permissions significantly clearer.

**Error handling and messages**  
Instead of the generic 500s/`Error` instances that AI often produced, I standardized on Nest’s
`BadRequestException`, `ForbiddenException`, and `NotFoundException` with targeted messages such as
“Item does not belong to this report”. This improves both DX (debugging) and UX.

**Auth model: cookies over localStorage**  
AI’s first pass stored JWTs in `localStorage`. I replaced this with HTTP‑only cookies and a
`/api/auth/me` endpoint so the frontend only holds a minimal current-user object and never the raw
token. This aligns better with security best practices.

**Frontend modularization and UI consistency**  
AI tended to generate large, one-off pages with duplicated markup. I refactored into reusable
components like `ReportDetailsShared`, `ItemForm`, `ReceiptUpload`, `ReceiptViewer`, and `FileList`.
Combined with react-hook-form, Zod, and shadcn/ui, this keeps the UI consistent across user and
admin flows.
