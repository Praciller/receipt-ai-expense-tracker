# Extraction Methodology

## Fields

The validated application contract includes merchant name, transaction date, line items, total, merchant tax ID when available, category, `THB` currency, confidence, notes, and parse status. The synthetic evidence file also records subtotal and tax availability for reviewer inspection.

## Validation and Normalization

- Merchant name is required and trimmed.
- Dates must be real calendar dates; supported Buddhist Era years normalize to Gregorian years.
- Quantities must be positive; prices and totals must be finite and non-negative.
- Confidence is clamped to `0..1`; values below `0.65` require review.
- Unknown categories normalize to `other`.
- Missing or invalid line items are excluded rather than fabricated.
- A failed provider path returns editable review-required placeholders when safe fallback is enabled.

## Categorization

Provider output is mapped to a fixed category list: food, transport, office, shopping, utilities, health, or other. English and selected Thai aliases are normalized deterministically. The category is editable before save.

## Deterministic Fixture

[`../fixtures/synthetic-receipt.json`](../fixtures/synthetic-receipt.json) is fictional and contains no real person, merchant, account, membership, or transaction. Mock mode validates its expected receipt through the same normalization function used for external provider output. Tests assert that mock mode bypasses providers and cache access.

## Known Limits

- The application contract does not separately persist subtotal or tax amount; those values are evidence metadata in the synthetic fixture.
- The fixed currency contract is currently `THB`.
- Mock mode proves deterministic pipeline behavior, not OCR accuracy.
- Human review remains required because model confidence is not a financial guarantee.

This methodology is for portfolio decision-support only. It is not accounting or tax advice and has not received a compliance audit.
