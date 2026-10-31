# Architecture

## Boundaries

- The browser owns image selection, editable review, receipt persistence, history, and analytics.
- `/api/receipts/parse` owns image validation and all server-side inference calls.
- `src/lib/ai/router.ts` owns capability filtering, retry, fallback, validation, caching, and degraded results.
- `src/lib/ai/providers.ts` constructs the optional generic external inference adapter from server-side environment settings.
- `src/lib/receipt.ts` owns structured validation, date/category normalization, and exact-decimal amount reconciliation.
- `src/lib/storage/receipt-repository.ts` defines the persistence boundary.
- `src/lib/storage/indexeddb-receipt-repository.ts` implements that boundary with Dexie.
- `src/lib/stats.ts` calculates dashboard aggregates from local records.

## Parse Sequence

```text
production readiness check (live image provider required)
  -> JPG/PNG/WebP validation
  -> parse cache lookup when live mode is active
  -> configured external image-capable endpoint
  -> retry and model fallback
  -> optional JSON repair through the same neutral external interface
  -> Zod/domain validation and deterministic reconciliation evidence
  -> valid provider parse or HTTP 503
```

An explicitly opted-in local mock mode is available for development and tests only. Production ignores mock mode and never returns a synthetic receipt or safe fallback.

Only a genuine provider result can enter receipt review and be explicitly saved. Inference output is never saved automatically. If live parsing fails in production, the API returns HTTP 503 without receipt data.

## Persistence Sequence

```text
reviewed ParsedReceipt
  -> shared validation and reconciliation recomputation
  -> ReceiptRepository.create
  -> Dexie receipts table
  -> liveQuery notification
  -> history and dashboard refresh
```

The server has no receipt CRUD or analytics routes. This keeps the current ledger local to the browser and avoids a server database dependency for the portfolio flow.

## Trust Model

- Inference output is untrusted input.
- User edits are validated before IndexedDB writes.
- External inference credentials exist only in server environment variables.
- Enabling external parsing transmits the selected receipt image to the configured external endpoint.
- The generic endpoint and model capability must be approved separately before sensitive receipts are used.
- IndexedDB is private to the browser origin but is not application-level encryption.
- Clearing site data deletes the local ledger.
