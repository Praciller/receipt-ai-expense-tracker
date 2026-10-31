# Testing

## Automated

```powershell
npm run lint
npm test
npm run build
npm audit --audit-level=high
python scripts/test_repo_guardrails.py
python scripts/check_repo_guardrails.py
```

Focused tests:

```powershell
npm test -- src/lib/receipt.test.ts
npm test -- src/lib/stats.test.ts
npm test -- src/lib/storage/indexeddb-receipt-repository.test.ts
npm test -- src/lib/ai/router.test.ts
npm test -- src/lib/ai/providers.test.ts
npm test -- src/app/api/receipts/parse/route.test.ts
npm test -- src/components/receipt-upload.test.tsx
```

`fake-indexeddb` runs the Dexie repository contract in Vitest.

Reconciliation coverage includes exact matches, quantity multiplication, satang values, one-satang rounding tolerance, item and receipt mismatches, multiple mismatches with cancelling deltas, empty items, bounded large values, invalid amounts, mock/API propagation, review warnings before save, and persistence-time recomputation. Tests assert that extracted totals are never silently corrected.

## Mock End-to-End

Set:

```env
MOCK_AI_MODE=true
NEXT_PUBLIC_STORAGE_MODE=indexeddb
```

Mock mode must be explicitly opted into locally. Then verify with a synthetic, non-sensitive placeholder image:

1. Upload a JPG, PNG, or WebP.
2. Parsed fields appear without automatic save.
3. Confirm the review screen identifies mock output.
4. Confirm mock output cannot be saved to receipt history.

To exercise IndexedDB save/history/dashboard behavior, use a controlled non-sensitive receipt and a configured provider. Production only permits genuine provider results to be reviewed and saved.

Never commit the placeholder, a real receipt, or generated extraction output.

## Optional External GenAI

Use only a controlled non-sensitive test receipt. Set `MOCK_AI_MODE=false` and configure the generic server-side `EXTERNAL_AI_*` settings from `.env.example`.

Verify both capability paths:

1. `EXTERNAL_AI_SUPPORTS_IMAGE_INPUT=false` prevents direct image inference. Production reports not-ready and returns HTTP 503 when no eligible image route exists.
2. `EXTERNAL_AI_SUPPORTS_IMAGE_INPUT=true` allows the configured external model to receive the image; valid structured output must pass shared receipt validation before review.
3. Force the primary external request to fail and verify retry/model fallback metadata.
4. Return malformed structured output and verify optional JSON repair through the same generic external interface.
5. Fail all external paths and verify `parse_status="review_required"`, `degraded_mode=true`, and no fabricated transaction values.

`/api/health` may report external capability state but must never expose endpoint credentials.
