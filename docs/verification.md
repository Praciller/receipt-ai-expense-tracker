# Verification

Verification date: June 13, 2026.

## Release

| Item | Value |
| --- | --- |
| Release commit | `961c1023ab030ffcff3c14274959a2bde03f7d24` |
| Branch | `main` |
| Production URL | `https://receipt-ai-expense-tracker-eta.vercel.app` |
| Deployment status | Ready |
| AI verification mode | Mock-only; newly rotated provider keys were not available |

## Automated Gates

| Gate | Status |
| --- | --- |
| `npm install` | Pass |
| `npm run lint` | Pass |
| `npm test` | Pass, 23 tests across 7 files |
| `npm run build` | Pass |
| `npm audit` | Two moderate transitive findings remain; the suggested forced fix is a breaking downgrade |

Production routes:

```text
/
/api/health
/api/receipts/parse
```

No server receipt CRUD, statistics, or Supabase routes remain.

## Runtime

| Check | Status |
| --- | --- |
| Production app load | Pass at the stable Vercel alias |
| `/api/health` | Pass with `mock_ai_mode: true`, cache/safe fallback enabled, and `storage: indexeddb` |
| Mock parse | Pass through production multipart `/api/receipts/parse`; returned mock provider/model metadata with no external call |
| Provider metadata | Pass: `provider_used`, `model_used`, `fallback_used`, `cached`, and `degraded_mode` |
| Review before save | Pass |
| IndexedDB save | Pass |
| Receipt history | Pass |
| Persistence after reload | Pass |
| Dashboard aggregation | Pass at THB 130 across total, average, category, shop, and monthly views |
| Delete flow | Pass; history returned to the empty state |
| Browser console | Zero errors and zero warnings |
| Framework error overlay | Not present |
| Frontend bundle secret scan | Pass across 10 JavaScript assets |
| API response secret scan | Pass |
| Vercel runtime errors/warnings | None during verification |

## Credential State

- `.env.local` contains no non-empty API key, token, or secret values.
- Production is intentionally deployed with `MOCK_AI_MODE=true`.
- No provider API key is configured in Vercel.
- Real provider parsing requires newly rotated server-side keys.
- Previously exposed keys were not reused.
- Repository and tracked-file scans found no provider key patterns.
- `.env`, `.env.local`, `/*-requirements.md`, and `/.cache/` are ignored.

## Provider Router Coverage

- 9arm first when image input is enabled.
- 9arm skipped when image input is disabled.
- Retry once before Gemini fallback.
- Groq then Cerebras text/JSON repair.
- Safe `review_required` result when all providers fail.
- Cache lookup before provider calls and invalid-cache bypass.
- Mock mode bypasses cache and all provider calls.
- API response omits internal attempt errors.

## Browser Tooling

Chrome loaded the production app, but the extension did not have permission to upload a local file. The complete production upload/save/reload/dashboard/delete flow was therefore verified with the Playwright CLI against the stable Vercel URL.

## Remaining Production Task

Rotate every previously posted provider key, configure only the replacement keys in Vercel, set `MOCK_AI_MODE=false`, redeploy, and run one non-sensitive real receipt parse. Real-provider behavior was not tested during this release.
