# Inference Routing

## Default Route

`MOCK_AI_MODE=true` is the default. It returns the deterministic synthetic fixture, bypasses network inference and parse-cache reads, and preserves the real validation, review, and IndexedDB persistence flow.

## Optional Generic External Route

When `MOCK_AI_MODE=false`, the server constructs one vendor-neutral `external` adapter only when all required settings are present:

```env
EXTERNAL_AI_API_KEY=
EXTERNAL_AI_BASE_URL=
EXTERNAL_AI_MODEL=
EXTERNAL_AI_CHAT_PATH=/v1/chat/completions
EXTERNAL_AI_SUPPORTS_IMAGE_INPUT=true
EXTERNAL_AI_FALLBACK_MODEL=
EXTERNAL_AI_JSON_REPAIR_MODEL=
```

The repository does not prescribe which inference service implements that endpoint. Credentials remain server-side.

## Capability Rules

- Direct receipt parsing requires `EXTERNAL_AI_SUPPORTS_IMAGE_INPUT=true`.
- The configured primary model is tried first; an optional fallback model may be tried next.
- Malformed structured output may be sent through the configured JSON-repair model using the same generic external interface.
- Capability flags must match the actual endpoint/model; configuration cannot add image support to a text-only model.

## Request Flow

```text
mock mode
  -> deterministic fixture, no cache or network

external mode
  -> cache lookup
  -> verify configured external image capability
  -> attempt primary/fallback model
  -> retry failures up to AI_MAX_RETRIES
  -> validate and normalize structured receipt
  -> on malformed output, optional JSON repair
  -> cache valid result
  -> return review_required safe fallback when all paths fail
```

Network, timeout, malformed output, schema validation, and domain validation failures remain bounded by the router. Retry delay uses `AI_RETRY_BACKOFF_SECONDS`; each request is bounded by `AI_TIMEOUT_SECONDS`.

## Cache

When `ENABLE_AI_PARSE_CACHE=true`, the router hashes the image, MIME type, prompt version, configured external route/model state, and capability state before an external call. Valid parses are cached under `AI_PARSE_CACHE_DIR` for `AI_PARSE_CACHE_TTL_SECONDS`.

Mock results and degraded safe-fallback results are not written to the cache.

## Response Metadata

When `RETURN_PROVIDER_METADATA=true`, parse responses include neutral metadata:

```json
{
  "provider_used": "external",
  "model_used": "receipt-model",
  "fallback_used": false,
  "cached": false,
  "degraded_mode": false
}
```

If external parsing fails and `ENABLE_SAFE_FALLBACK=true`, the route returns an editable receipt with `parse_status="review_required"` and `degraded_mode=true`. It does not fabricate transaction details.

## Privacy Boundary

External mode sends the selected receipt image and extraction instructions to the configured endpoint. Use only an approved endpoint and non-sensitive test receipts until retention, access, and model behavior are verified. Mock mode avoids this data transfer entirely.
