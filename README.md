# Receipt AI Expense Tracker

Local-first multimodal expense tracker for Thai and English receipts. A server-side, capability-aware AI router parses receipt images, users review the structured result, and confirmed receipts stay in the browser through IndexedDB and Dexie.js.

Live deployment: [receipt-ai-expense-tracker-eta.vercel.app](https://receipt-ai-expense-tracker-eta.vercel.app)

The current public deployment uses mock AI until newly rotated provider keys are configured.

## Product Flow

```text
Receipt image
  -> upload validation
  -> POST /api/receipts/parse
  -> mock AI or capability-aware provider routing
  -> Zod validation and Buddhist Era date normalization
  -> editable human review
  -> IndexedDB save
  -> receipt history and dashboard analytics
```

AI parsing never saves automatically. The user confirms the shop, date, items, total, category, tax ID, confidence, and notes before persistence.

## Screenshots

| Upload flow | Expense dashboard |
| --- | --- |
| ![Receipt upload flow](docs/screenshots/upload-review.png) | ![Expense analytics dashboard](docs/screenshots/dashboard.png) |

## Tech Stack

| Layer | Technology |
| --- | --- |
| App | Next.js 16, React 19, TypeScript |
| Styling | Tailwind CSS 4 |
| AI | 9arm Gateway, Gemini, Groq, and Cerebras server-side router |
| Validation | Zod plus domain normalization |
| Persistence | IndexedDB through Dexie.js |
| Analytics | Client-side aggregation and Recharts |
| Testing | Vitest, Testing Library, fake-indexeddb |

## Local Setup

```powershell
npm install
Copy-Item .env.example .env.local
npm run dev
```

Open `http://localhost:3000`.

## Environment

Local-first storage requires no database credentials:

```env
NEXT_PUBLIC_STORAGE_MODE=indexeddb
```

For a quota-free demo:

```env
MOCK_AI_MODE=true
```

For real receipt parsing, disable mock mode and configure newly rotated server-side keys:

```env
MOCK_AI_MODE=false
AI_PROVIDER_PRIORITY=ninearm,gemini,groq,cerebras
NINEARM_API_KEY=
NINEARM_SUPPORTS_IMAGE_INPUT=false
GEMINI_API_KEY=your-newly-rotated-server-key
GEMINI_SUPPORTS_IMAGE_INPUT=true
GROQ_API_KEY=
CEREBRAS_API_KEY=
```

With the default capability flags, 9arm remains first in configured priority but is skipped for image input, so Gemini handles direct receipt extraction. Groq and Cerebras remain available for text/JSON repair. Set `NINEARM_SUPPORTS_IMAGE_INPUT=true` only when the configured 9arm model and gateway actually accept image content.

All provider keys are read only by server modules. Never prefix a provider key with `NEXT_PUBLIC_`. See [`docs/model_routing.md`](docs/model_routing.md) for routing, retry, cache, and degraded-mode behavior.

## Local-First Storage

- Reviewed receipts are written directly to IndexedDB in the current browser profile.
- History and dashboard views subscribe to Dexie live queries.
- Receipt statistics are calculated from the same local records.
- No Supabase project, database migration, account, or service key is required.
- Clearing site data or changing browser profiles removes access to that local ledger.

The app uses a `ReceiptRepository` interface so a synchronized backend can be added later without coupling UI components to a vendor SDK.

Detailed rationale: [`docs/storage_architecture.md`](docs/storage_architecture.md)

## API Routes

| Method | Route | Purpose |
| --- | --- | --- |
| `POST` | `/api/receipts/parse` | Validate and parse an image; returns review data only |
| `GET` | `/api/health` | Report non-secret AI routing capabilities and storage mode |

Receipt CRUD and statistics are browser-side operations, not server APIs.

## Receipt Contract

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
npm install
npm run lint
npm test
npm run build
```

Automated coverage includes:

- Thai Buddhist Era and invalid-date normalization
- structured receipt validation
- provider priority, capability filtering, retry, cache, and fallback behavior
- mock parse API behavior
- IndexedDB repository CRUD and live observation
- local stats aggregation
- upload, review, and explicit local save

## Security

- Receipt images reach the server only for parsing.
- AI provider credentials remain server-side.
- The parse endpoint returns data but does not persist it.
- Exposed provider keys from development must be revoked and replaced before real-AI testing.
- Local IndexedDB records are not encrypted by this app.

## Known Limitations

- Data is local to one browser profile and is not synchronized or backed up.
- Stored base64 images can consume browser quota faster than text-only records.
- No user authentication, cloud sync, export/import, or multi-device support.
- Direct image parsing requires at least one configured image-capable provider unless mock mode is enabled.
- The filesystem parse cache is local to one server instance and is not shared across deployments.
- Short two-digit Thai years below `60` require manual review because they are ambiguous.

## Portfolio Review

See [`PORTFOLIO_REVIEW.md`](PORTFOLIO_REVIEW.md) for verified behavior and remaining production limitations.

## License

MIT
