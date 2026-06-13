# Receipt Image Test Matrix

Verification date: June 13, 2026.

The three supplied images were tested against the production upload UI and
`POST /api/receipts/parse`.

Production currently uses `MOCK_AI_MODE=true`. These results prove file-format,
size, multipart upload, API, and review-UI compatibility. They do not prove OCR
or field-extraction accuracy because mock mode intentionally returns the same
deterministic receipt for every valid image.

## Results

| Test image | Type | Size | Production result | Fixture role |
| --- | --- | ---: | --- | --- |
| `03_ใบเสร็จรับเงิน_ใบกำกับภาษีอย่างย่อ-1118x1536.jpg` | JPEG | 93,905 bytes | HTTP 200; review UI rendered | Positive Thai printed receipt |
| `04_บิลเงินสด-1118x1536.jpg` | JPEG | 161,838 bytes | HTTP 200; review UI rendered | Positive Thai handwritten receipt |
| `expense-report-template.webp` | WebP | 55,860 bytes | HTTP 200; review UI rendered | Negative non-receipt document |

All three requests returned:

```json
{
  "provider_used": "mock",
  "model_used": "deterministic-fixture",
  "fallback_used": false,
  "cached": false,
  "degraded_mode": false
}
```

The browser console reported zero errors and zero warnings.

## Expected Real-AI Checks

### Thai printed receipt

- Shop: `บริษัท โฟลว์แอคเคาท์ ทดสอบ จำกัด`
- Date: `2025-02-27`
- Total: `11875.00 THB`
- Tax ID: `0105558096348`
- Item: `เมล็ดกาแฟคั่วเข้ม`
- Quantity: `50`
- Category: `food`
- Review note: the document shows a pre-discount amount of `12500.00`, a
  discount of `625.00`, and a final total of `11875.00`.

### Thai handwritten cash bill

- Shop: `ESDES`
- Date: `2025-02-27`
- Total: `12500.00 THB`
- Item: `เมล็ดกาแฟคั่วเข้ม`
- Quantity: `50`
- Unit price: `250.00`
- Category: `food`
- Tax ID: expected `null`; the visible tax ID belongs to the customer, not the
  merchant.

### English expense report template

This is a multi-expense report denominated in USD, not a single receipt. It is
outside the current receipt contract and should be treated as a negative test.
A real-provider test should require manual review rather than silently treating
the document as a valid THB receipt.

## File Integrity

| Test image | SHA-256 |
| --- | --- |
| Thai printed receipt | `5C5BC016A7B8EB57616913823011CDCEB1580E2DA3BC3432C859B991666B8A6C` |
| Thai handwritten cash bill | `CEE1D69970DE27F828E1E7BAB1A6A77471448738BC1C938AD555014CE5A5ED5C` |
| English expense report template | `324184AB8CA3E2F9B8586D037771C431A2ECA0DB267C3C89C01950D516B24A81` |

## Repository Policy

The image binaries are not committed because they contain third-party branding
and their redistribution license has not been established. Add sanitized or
explicitly licensed copies before using them as public automated fixtures.
