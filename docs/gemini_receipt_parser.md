# Gemini Receipt Parser

Gemini is the default image-capable fallback in the multi-provider router. It is used for direct receipt parsing when higher-priority providers are unavailable, disabled for image input, or fail.

## Server Boundary

The browser sends the selected image to `POST /api/receipts/parse`. The route reads `GEMINI_API_KEY` only when the router selects Gemini, validates the structured result, and returns review data. The key is never included in browser code or API responses.

## Request

The server sends:

- Thai and English receipt extraction instructions
- inline image bytes and MIME type
- `application/json` response mode
- a JSON response schema
- deterministic temperature and abort timeout

Provider-level JSON mode is not trusted by itself. The shared validator normalizes dates, categories, totals, line items, and confidence before returning data.

See [`model_routing.md`](model_routing.md) for provider order, capability filtering, retries, cache behavior, and degraded fallback.
