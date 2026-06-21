# Testing

## Automated

```powershell
npm run lint
npm test
npm run build
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

## Mock End-to-End

Set:

```env
MOCK_AI_MODE=true
NEXT_PUBLIC_STORAGE_MODE=indexeddb
```

Mock mode is the default. Then verify with a synthetic, non-sensitive placeholder image:

1. Upload a JPG, PNG, or WebP.
2. Parsed fields appear without automatic save.
3. Edit at least one field.
4. Save.
5. Confirm receipt history.
6. Confirm dashboard totals.
7. Delete the receipt through inline confirmation.

Never commit the placeholder, a real receipt, or generated OCR output.

## Optional Real AI

Set `MOCK_AI_MODE=false`, add only newly rotated provider keys, and use a non-sensitive test receipt. `/api/health` reports configured provider capabilities but never returns keys.

Verify both capability paths:

1. `NINEARM_SUPPORTS_IMAGE_INPUT=false` skips 9arm and routes direct image parsing to Gemini.
2. `NINEARM_SUPPORTS_IMAGE_INPUT=true` tries 9arm first when its key is configured and its selected model genuinely supports image input.
