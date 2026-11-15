# Portfolio Review

## Reviewer Flow

1. Open the [public demo](https://receipt-ai-expense-tracker-eta.vercel.app/).
2. Choose **Try fictional sample receipt**. It uses uncached live inference through the parse API, not the deterministic mock fixture.
3. Compare the returned provider/model and fields with the fictional image, then edit a field and save.
4. Inspect the saved record in Receipts and its totals in Dashboard. The record stays in the current browser on this device.
5. For a zero-cost local review, follow [`local_review.md`](local_review.md) and run `python scripts/check_repo_guardrails.py`.

## What This Demonstrates

- deterministic no-key receipt extraction evidence in local mock/evaluation mode
- live extraction from the public synthetic sample when the configured provider is available
- optional capability-aware external provider routing
- shared validation and normalization
- explicit human review before local persistence
- IndexedDB repository behavior and client-side analytics
- repository checks that reject receipt images, secrets, local databases, and unsafe financial claims

## Limits

- Synthetic mock output does not measure OCR or categorization accuracy on real receipts.
- Browser records are not encrypted, synchronized, or backed up.
- External providers require explicit configuration and may transmit document data to their service.
- The project is decision-support only, not accounting or tax advice, and has not received a compliance audit.
