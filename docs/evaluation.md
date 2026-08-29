# Extraction Evaluation

`npm run test:evaluation` runs offline against [`../fixtures/evaluation-cases.json`](../fixtures/evaluation-cases.json). Cases cover Thai convenience and restaurant receipts, English/USD, full and short Buddhist Era years, invalid dates, missing totals, mismatches, unsupported currency, and low confidence.

Metrics include merchant/date/currency/category exact match, exact-decimal numeric tolerance, item-count accuracy, completeness, warning accuracy, reconciliation status and item-mismatch accuracy, parse success, schema validity, and invalid-case rejection. Fixtures include a fully reconciled receipt, a plausible service-charge mismatch requiring review, and malformed item arithmetic. Outputs are [`../reports/extraction/summary.md`](../reports/extraction/summary.md) and `metrics.json`.

All cases are synthetic. Results validate deterministic application behavior, not real OCR/provider accuracy. Evaluate provider mode separately without committing private inputs or outputs.
