# Synthetic Receipt Test Matrix

No receipt, invoice, bank-slip, or other private financial image is committed. The default test path uses [`../fixtures/synthetic-receipt.json`](../fixtures/synthetic-receipt.json).

| Check | Expected result |
| --- | --- |
| Mock provider | `mock` |
| Model | `deterministic-fixture` |
| External call | none |
| Merchant | `Synthetic Portfolio Cafe` |
| Date | `2025-06-13` |
| Currency | `THB` |
| Subtotal evidence | `130` |
| Tax | unavailable; warning recorded |
| Total | `130` and equal to line-item sum |
| Reconciliation status | `reconciled` |
| Item evidence | no mismatches; `item_total_delta=0` |
| Receipt evidence | `receipt_total_delta=0` |
| Reconciliation warnings | none |
| Category | `food` |
| Confidence | `0.91` |
| Review status | `parsed`, still requiring human confirmation before save |

This matrix demonstrates deterministic routing, validation, normalization, reconciliation, review, and local persistence. Additional synthetic cases cover plausible fee/discount differences and malformed item arithmetic. It does not measure OCR accuracy and is not accounting or tax advice.
