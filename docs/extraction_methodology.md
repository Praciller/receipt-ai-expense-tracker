# Extraction Methodology

## Fields

The validated contract includes merchant, normalized and raw date, Buddhist Era conversion metadata, supported currency, line items, subtotal, tax, discount, service charge, grand total, category, confidence, warnings, evidence spans, notes, and parse status.

## Validation and Normalization

- Merchant name is required and trimmed.
- Dates must be real calendar dates; supported Buddhist Era years normalize to Gregorian years.
- Quantities must be positive; prices and totals must be finite and non-negative.
- Confidence is clamped to `0..1`; values below `0.65` require review.
- Unsupported currencies fail validation; THB, USD, EUR, GBP, SGD, and JPY are accepted.
- After normalization, each item is checked with exact decimal arithmetic: `quantity × unit_price` is compared with extracted `total_price`, and the line-item sum is compared with `total_amount`.
- The result records `reconciliation_status`, per-item expected/extracted/delta evidence, mismatch count, aggregate deltas, and bounded warnings. Empty items produce `insufficient_evidence`; arithmetic mismatches produce `review_required` without changing extracted amounts.
- A one-satang (`฿0.01`) tolerance is explicitly allowed for rounding. A difference may reflect a discount, tax, service charge, promotion, deposit, fee, or receipt rounding, so it is a review signal rather than an automatic error.
- Subtotal and financial-breakdown mismatches also remain warnings when those fields are available.
- Unknown categories normalize to `other`.
- Missing or invalid line items fail validation rather than being fabricated or silently repaired.
- A failed provider path returns editable review-required placeholders when safe fallback is enabled.

## Categorization

Provider output is mapped to a fixed category list: food, transport, office, shopping, utilities, health, or other. English and selected Thai aliases are normalized deterministically. The category is editable before save.

## Deterministic Fixture

[`../fixtures/synthetic-receipt.json`](../fixtures/synthetic-receipt.json) is fictional and contains no real person, merchant, account, membership, or transaction. Mock mode validates its expected receipt through the same normalization function used for external provider output. Tests assert that mock mode bypasses providers and cache access.

## Known Limits

- Money comparisons use exact decimal coefficients backed by `bigint`; no binary floating-point equality is used for reconciliation.
- The only reconciliation tolerance is one minor unit (`฿0.01` for THB), and it does not replace human review. Normalized amounts are bounded at 1,000,000,000,000 currency units.
- Mock mode proves deterministic pipeline behavior, not OCR accuracy.
- Human review remains required because model confidence is not a financial guarantee.

This methodology is for portfolio decision-support only. It is not accounting or tax advice and has not received a compliance audit.
