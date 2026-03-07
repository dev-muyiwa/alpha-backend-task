# Backend Engineering Assessment Starter

This repository is a standalone starter for the backend engineering take-home assessment.
It contains two independent services in a shared mono-repo:

- `python-service/` (InsightOps): FastAPI + SQLAlchemy + manual SQL migrations
- `ts-service/` (TalentFlow): NestJS + TypeORM

The repository is intentionally incomplete for assessment features. Candidates should build within the existing structure and patterns.

## Prerequisites

- Docker
- Python 3.12
- Node.js 22+
- npm

## Start Postgres

From the repository root:

```bash
docker compose up -d postgres
```

This starts PostgreSQL on `localhost:5432` with:

- database: `assessment_db`
- user: `assessment_user`
- password: `assessment_pass`

## Service Guides

- Python service setup and commands: [python-service/README.md](python-service/README.md)
- TypeScript service setup and commands: [ts-service/README.md](ts-service/README.md)

## Notes

- Keep your solution focused on the assessment tasks.
- Do not replace the project structure with a different architecture.

---

## Implementation Notes

### Design Decisions

**Part A (Python/FastAPI):**
- **HTML stored in database** - Generated once, served directly. No re-rendering on each request.
- **409 Conflict** - Returned when HTML requested before generation (resource exists but not ready).
- **View Model pattern** - `BriefingReportViewModel` separates DB model from template rendering.
- **Normalized points table** - Key points and risks in single table with `point_type` discriminator.

**Part B (NestJS/TypeScript):**
- **Provider abstraction** - `SummarizationProvider` interface decouples business logic from LLM.
- **Non-blocking processing** - `void this.processor.process()` returns immediately, processes async.
- **Workspace isolation** - All queries filter by `workspaceId`. Returns 404 (not 403) to prevent leakage.
- **Audit trail** - Tracks `provider` and `promptVersion` on each summary for debugging.

### Schema Decisions

**Briefings:** Stores `html_content` and `is_generated` flag to track generation state. Points normalized with `sort_order` for ordering. Metrics enforce unique names per briefing via DB constraint.

**Candidates:** Documents require `rawText` (not optional) since LLM needs content. Summaries use JSONB for `strengths`/`concerns` arrays. Status enum: `pending` → `completed` | `failed`.

### Improvements with More Time

- **Retry logic** - Exponential backoff for transient LLM failures (429, 503)
- **Real queue** - Replace in-memory queue with Redis/BullMQ for persistence
- **File upload** - Accept actual files with S3 storage, extract text server-side
- **PDF export** - Generate PDF reports from briefings
- **Integration tests** - E2E tests with testcontainers