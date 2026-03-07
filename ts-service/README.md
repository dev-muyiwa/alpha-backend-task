# TalentFlow TypeScript Service Starter

NestJS starter service for the backend assessment.

This service includes:

- Nest bootstrap with global validation
- TypeORM + migration setup
- Fake auth context (`x-user-id`, `x-workspace-id`)
- Tiny workspace-scoped sample module
- Queue abstraction module
- LLM provider abstraction with a fake summarization provider
- Jest test setup

The assessment-specific candidate document and summary workflow is intentionally not implemented.

## Prerequisites

- Node.js 22+
- npm
- PostgreSQL running from repository root:

```bash
docker compose up -d postgres
```

## Setup

```bash
cd ts-service
npm install
cp .env.example .env
```

## Environment

- `PORT` - Server port (default: 3000)
- `DATABASE_URL` - PostgreSQL connection string
- `NODE_ENV` - Environment mode
- `GEMINI_API_KEY` - Google Gemini API key (optional, falls back to fake provider)

Do not commit API keys or secrets.

## LLM Provider Configuration

### Provider Used

This service uses **Google Gemini 2.5 Flash** (`gemini-2.5-flash`) for AI-powered candidate summarization via the `@google/generative-ai` SDK.

### Getting a Gemini API Key

1. Visit [Google AI Studio](https://aistudio.google.com/)
2. Sign in with your Google account
3. Click "Get API Key" → "Create API key"
4. Copy the generated key

### Local Configuration

```bash
# In ts-service/.env
GEMINI_API_KEY=your_api_key_here
```

If `GEMINI_API_KEY` is empty or not set, the service automatically falls back to `FakeSummarizationProvider` which returns mock data - useful for development and testing.

### Provider Abstraction

The LLM logic is abstracted behind `SummarizationProvider` interface:

```typescript
interface SummarizationProvider {
  generateCandidateSummary(input: CandidateSummaryInput): Promise<CandidateSummaryResult>;
}
```

Two implementations are available:
- `GeminiSummarizationProvider` - Real LLM calls (requires API key)
- `FakeSummarizationProvider` - Mock responses for testing

### Structured Output

The LLM is configured to return JSON with:
- `score` (0-100): Overall candidate quality score
- `strengths` (string[]): Key candidate strengths
- `concerns` (string[]): Areas of concern
- `summary` (string): Brief candidate summary
- `recommendedDecision` (`advance` | `hold` | `reject`): Hiring recommendation

All responses are validated before being saved to the database.

### Assumptions & Limitations

- **Rate Limits**: Free tier has limited requests per minute. If you hit 429 errors, wait or use the fake provider.
- **Model Availability**: Model names may change. Currently using `gemini-2.5-flash`.
- **Text Only**: Assumes document content is pre-extracted as plain text (no PDF/image parsing).
- **No Retry Logic**: Failed LLM calls are marked as failed immediately without retry.
- **Prompt Version**: Tracked in database (`v1.0`) for audit trail and reproducibility.

### Testing

Tests use `FakeSummarizationProvider` to avoid live API calls:

```typescript
{
  provide: SUMMARIZATION_PROVIDER,
  useValue: new FakeSummarizationProvider(),
}
```

## Run Migrations

```bash
cd ts-service
npm run migration:run
```

## Run Service

```bash
cd ts-service
npm run start:dev
```

## Run Tests

```bash
cd ts-service
npm test
npm run test:e2e
```

## Fake Auth Headers

Sample endpoints in this starter are protected by a fake local auth guard.
Include these headers in requests:

- `x-user-id`: any non-empty string (example: `user-1`)
- `x-workspace-id`: workspace identifier used for scoping (example: `workspace-1`)

## Layout Highlights

- `src/auth/`: fake auth guard, user decorator, auth types
- `src/entities/`: starter entities
- `src/sample/`: tiny example module (controller/service/dto)
- `src/queue/`: in-memory queue abstraction
- `src/llm/`: provider interface + fake provider
- `src/migrations/`: TypeORM migration files
