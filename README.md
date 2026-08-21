# Receipt AI Expense Tracker

Local-first expense tracker for Thai and English receipts. The default review path returns a deterministic synthetic result without external credentials or network inference. An optional generic server-side endpoint can parse receipt images; users review the structured result before confirmed receipts are stored in the browser through IndexedDB and Dexie.js.

Live deployment: [receipt-ai-expense-tracker-eta.vercel.app](https://receipt-ai-expense-tracker-eta.vercel.app)

## Product flow

```text
Receipt image
  -> upload validation
  -> POST /api/receipts/parse
  -> deterministic mock or generic external inference
  -> Zod validation and Buddhist Era date normalization
  -> editable human review
  -> IndexedDB save
  -> receipt history and dashboard analytics
```

Parsing never saves automatically. The user confirms the shop, date, items, total, category, tax ID, confidence, and notes before persistence.

## Screenshots

| Upload flow | Expense dashboard |
| --- | --- |
| ![Receipt upload flow](docs/screenshots/upload-review.png) | ![Expense analytics dashboard](docs/screenshots/dashboard.png) |

## Tech stack

| Layer | Technology |
| --- | --- |
| App | Next.js 16, React 19, TypeScript |
| Styling | Tailwind CSS 4 |
| Inference | Deterministic mock by default; optional generic external endpoint |
| Validation | Zod plus domain normalization |
| Persistence | IndexedDB through Dexie.js |
| Analytics | Client-side aggregation and Recharts |
| Testing | Vitest, Testing Library, fake-indexeddb |

## Zero-cost local review

```powershell
npm ci
$env:MOCK_AI_MODE="true"
$env:NEXT_PUBLIC_STORAGE_MODE="indexeddb"
npm test
npm run dev
```

Open `http://localhost:3000`. Mock mode uses [`fixtures/synthetic-receipt.json`](fixtures/synthetic-receipt.json), requires no external key, and makes no network inference call. See [`docs/local_review.md`](docs/local_review.md) for the synthetic review path and expected output.

## Environment

Local-first storage requires no database credentials:

```env
NEXT_PUBLIC_STORAGE_MODE=indexeddb
```

Mock mode is the default:

```env
MOCK_AI_MODE=true
```

Optional external parsing is explicit and server-side only:

```env
MOCK_AI_MODE=false
EXTERNAL_AI_API_KEY=
EXTERNAL_AI_BASE_URL=
EXTERNAL_AI_CHAT_PATH=/v1/chat/completions
EXTERNAL_AI_MODEL=
EXTERNAL_AI_FALLBACK_MODEL=
EXTERNAL_AI_JSON_REPAIR_MODEL=
EXTERNAL_AI_SUPPORTS_IMAGE_INPUT=true
```

Never expose an inference credential through a public frontend variable. See [`docs/model_routing.md`](docs/model_routing.md) for retry, cache, validation, and degraded-mode behavior.

## Local-first storage

- Reviewed receipts are written directly to IndexedDB in the current browser profile.
- History and dashboard views subscribe to Dexie live queries.
- Receipt statistics are calculated from the same local records.
- No database service account or migration is required for the default path.
- Clearing site data or changing browser profiles removes access to that local ledger.

The app uses a `ReceiptRepository` interface so a synchronized backend can be added later without coupling UI components to a specific service SDK.

Detailed rationale: [`docs/storage_architecture.md`](docs/storage_architecture.md)

Receipt fixture compatibility and extraction checks: [`docs/extraction_methodology.md`](docs/extraction_methodology.md)

## Deterministic extraction evidence

The committed synthetic fixture records the expected merchant, date, currency, line items, subtotal evidence, tax availability, total, category, confidence, and validation warnings. Mock responses are validated through the same normalization code used for optional external output.

```powershell
npm test -- src/lib/ai/router.test.ts src/app/api/receipts/parse/route.test.ts
Get-Content fixtures/synthetic-receipt.json
```

No real receipt image, OCR output, bank slip, membership record, or private financial record is required or permitted in the repository.

## API routes

| Method | Route | Purpose |
| --- | --- | --- |
| `POST` | `/api/receipts/parse` | Validate and parse an image; returns review data only |
| `GET` | `/api/health` | Report non-secret inference and storage capabilities |

Receipt CRUD and statistics are browser-side operations, not server APIs.

## Receipt contract

```json
{
  "shop_name": "string",
  "date": "YYYY-MM-DD",
  "items": [
    {
      "name": "string",
      "quantity": 1,
      "unit_price": 0,
      "total_price": 0
    }
  ],
  "total_amount": 0,
  "tax_id": null,
  "category": "food",
  "currency": "THB",
  "confidence": 0.9,
  "notes": ""
}
```

Buddhist Era years such as `2568` normalize to `2025`. Short Thai years are converted only for the cautious `60-99` range. Impossible dates and negative totals fail validation.

## Verification

```powershell
npm ci
npm run lint
npm test
npm run build
python scripts/test_repo_guardrails.py
python scripts/check_repo_guardrails.py
```

Automated coverage includes:

- Thai Buddhist Era and invalid-date normalization
- structured receipt validation
- inference routing, capability filtering, retry, cache, repair, and fallback behavior
- deterministic parse API behavior
- IndexedDB repository CRUD and live observation
- local stats aggregation
- upload, review, and explicit local save

## Security

- Receipt images reach the server only for parsing.
- Mock mode is the default and does not send images to a network inference endpoint.
- Optional external credentials remain server-side.
- The parse endpoint returns data but does not persist it.
- Real receipts, uploads, OCR output, local databases, and environment files are ignored and rejected by repository guardrails.
- Local IndexedDB records are not encrypted by this app.
- Do not upload sensitive receipts to a public deployment.

This portfolio demo is decision-support only. It is not accounting or tax advice, has not received a compliance audit, and does not guarantee financial accuracy.

## Known limitations

- Data is local to one browser profile and is not synchronized or backed up.
- Stored base64 images can consume browser quota faster than text-only records.
- No user authentication, cloud sync, export/import, or multi-device support.
- External image parsing requires an explicitly configured compatible endpoint unless mock mode is enabled.
- The deterministic fixture demonstrates pipeline behavior, not OCR accuracy on real documents.
- The filesystem parse cache is local to one server instance and is not shared across deployments.
- Short two-digit Thai years below `60` require manual review because they are ambiguous.

## Portfolio review

See [`docs/portfolio_review.md`](docs/portfolio_review.md) for the reviewer flow and [`docs/extraction_methodology.md`](docs/extraction_methodology.md) for validation limits.

## License

MIT
