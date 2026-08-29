# Verification

Verification date: June 21, 2026.

## Local Gates

| Gate | Result |
| --- | --- |
| `npm ci` | completed; dependency audit reported known findings for separate review |
| `npm test` | 25 tests passed across 8 files |
| `npm run lint` | passed |
| `npm run build` | passed |
| `python scripts/test_repo_guardrails.py` | 2 tests passed |
| `python scripts/check_repo_guardrails.py` | passed against the staged file set |
| `git diff --check` | passed |

## Privacy Cleanup

- Seven private or redistribution-unverified image paths were removed from every rewritten local Git ref.
- Current and historical path scans contain no receipt, invoice, or bank-slip image fixture.
- The only remaining tracked images are two application screenshots under `docs/screenshots/`.
- The pre-rewrite bundle is stored outside the repository and remains private.

## Deterministic Review

- Mock mode is the no-key default.
- [`../fixtures/synthetic-receipt.json`](../fixtures/synthetic-receipt.json) is the sole receipt data fixture.
- Mock tests verify that providers and the filesystem cache are bypassed.
- External providers run only when `MOCK_AI_MODE=false` is explicitly selected.

## Amount Reconciliation Verification (August 29, 2026)

- Exact decimal arithmetic uses integer coefficients and a documented one-satang (`฿0.01`) rounding tolerance; no binary floating-point equality is used for money.
- Reconciliation evidence covers per-item arithmetic, line-item sum versus receipt total, mismatch counts, signed deltas, bounded warnings, and the `reconciled`, `review_required`, and `insufficient_evidence` statuses.
- Synthetic evaluation cases cover an exact match, a plausible service-charge mismatch, malformed item arithmetic, an empty-item insufficient-evidence case, and a subtotal/total discrepancy. No real receipt data is used.
- Human review shows reconciliation warnings before save and keeps save available; persistence recomputes reconciliation evidence without correcting extracted financial values.
- `npm test`, `npm run lint`, `npm run build`, `npm run guardrails`, `npm run typecheck`, `npm run test:api`, `npm run test:storage`, `npm run test:evaluation`, and `git diff --check` were run for this change.

## Limits

This verification covers deterministic application behavior and repository hygiene. It does not establish OCR accuracy, accounting correctness, tax correctness, regulatory compliance, or production readiness for sensitive financial data.
