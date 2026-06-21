# Portfolio Review

## Reviewer Flow

1. Run the commands in [`local_review.md`](local_review.md).
2. Generate the ignored synthetic placeholder image.
3. Upload it and compare the result with [`../fixtures/synthetic-receipt.json`](../fixtures/synthetic-receipt.json).
4. Edit one field, save, reload, inspect history/dashboard totals, then delete the record.
5. Run `python scripts/check_repo_guardrails.py`.

## What This Demonstrates

- deterministic no-key receipt extraction evidence
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
