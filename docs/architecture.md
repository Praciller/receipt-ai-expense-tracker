# Architecture

## Boundaries

- The browser owns image selection, editable review, receipt persistence, history, and analytics.
- `/api/receipts/parse` owns image validation and all server-side AI provider calls.
- `src/lib/ai/router.ts` owns capability filtering, retry, fallback, validation, caching, and degraded results.
- `src/lib/ai/providers.ts` owns environment-driven provider construction.
- `src/lib/receipt.ts` owns structured validation and date/category normalization.
- `src/lib/storage/receipt-repository.ts` defines the persistence boundary.
- `src/lib/storage/indexeddb-receipt-repository.ts` implements that boundary with Dexie.
- `src/lib/stats.ts` calculates dashboard aggregates from local records.

## Parse Sequence

```text
JPG/PNG/WebP validation
  -> mock fixture when MOCK_AI_MODE=true
  -> parse cache lookup
  -> image-capable providers in configured priority
  -> retry and model/provider fallback
  -> optional Groq/Cerebras JSON repair
  -> Zod/domain validation
  -> valid parse or review_required safe fallback
```

AI output is never saved automatically. If every provider fails, safe fallback returns an editable `review_required` record; the user must still validate and explicitly save it.

## Persistence Sequence

```text
reviewed ParsedReceipt
  -> shared validation
  -> ReceiptRepository.create
  -> Dexie receipts table
  -> liveQuery notification
  -> history and dashboard refresh
```

The server has no receipt CRUD or analytics routes. This keeps local data local and removes database credentials from version 1.

## Trust Model

- AI output is untrusted input.
- User edits are validated before IndexedDB writes.
- Provider API keys exist only in server environment variables.
- IndexedDB is private to the browser origin but is not application-level encryption.
- Clearing site data deletes the local ledger.
