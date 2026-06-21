# Local Review

The review path is zero-cost, synthetic, local-first, and does not require provider keys.

## Windows PowerShell

```powershell
npm ci
$env:MOCK_AI_MODE="true"
$env:NEXT_PUBLIC_STORAGE_MODE="indexeddb"
npm test
npm run dev
```

In another PowerShell window, create an ignored one-pixel synthetic upload input:

```powershell
New-Item -ItemType Directory -Force uploads | Out-Null
$bytes = [Convert]::FromBase64String("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=")
[IO.File]::WriteAllBytes("$PWD\uploads\synthetic-placeholder.png", $bytes)
```

Open `http://localhost:3000`, upload `uploads/synthetic-placeholder.png`, review the synthetic fields, and save. Expected values are recorded in [`../fixtures/synthetic-receipt.json`](../fixtures/synthetic-receipt.json). Saving writes only to the current browser's IndexedDB.

## Expected Evidence

- Provider: `mock`
- Model: `deterministic-fixture`
- Total: `130 THB`
- Category: `food`
- External AI calls: none
- API keys: none

## Troubleshooting

- If real providers are contacted, remove the shell override or set `MOCK_AI_MODE=true` and restart the development server.
- If port 3000 is busy, run `npm run dev -- --port 3001`.
- If saved data is missing, use the same browser profile and origin; IndexedDB is origin-scoped.
- Do not use real receipts or sensitive financial documents for portfolio review.

This project is not accounting or tax advice and has not received a compliance audit.
