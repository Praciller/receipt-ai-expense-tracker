# AI Provider Routing

## Priority

`AI_PROVIDER_PRIORITY` defaults to:

```text
ninearm,gemini,groq,cerebras
```

The router constructs only providers with configured server-side API keys. Priority does not override capability checks.

## Capability Rules

- Receipt image parsing requires `supportsImageInput=true`.
- 9arm is attempted first only when `NINEARM_SUPPORTS_IMAGE_INPUT=true`.
- With the default `NINEARM_SUPPORTS_IMAGE_INPUT=false`, 9arm is skipped and Gemini is the first direct image provider.
- Groq and Cerebras are text-only by default and can repair malformed JSON returned by an image provider.
- Capability flags must match the real model and gateway. They do not add multimodal support to a text-only model.

## Request Flow

```text
mock mode
  -> deterministic fixture, no cache or network

real mode
  -> cache lookup
  -> filter configured providers for image capability
  -> attempt provider/model in priority order
  -> retry failures up to AI_MAX_RETRIES
  -> validate and normalize structured receipt
  -> on malformed output, try text/JSON repair providers
  -> cache valid result
  -> return safe review_required result when all paths fail
```

Network, timeout, malformed output, schema validation, and domain validation failures move routing to the next eligible model or provider. Retry delay uses `AI_RETRY_BACKOFF_SECONDS`; each request is bounded by `AI_TIMEOUT_SECONDS`.

## Provider Implementations

| Provider | Transport | Default role |
| --- | --- | --- |
| 9arm | OpenAI-compatible `/chat/completions` | First image candidate when explicitly enabled |
| Gemini | Google GenAI SDK | Default direct image parser |
| Groq | OpenAI-compatible chat completions | JSON repair fallback |
| Cerebras | OpenAI-compatible chat completions | Last JSON repair fallback |

All base URLs, keys, models, capability flags, priority, timeout, retry, and cache settings come from environment variables.

## Cache

When `ENABLE_AI_PARSE_CACHE=true`, the router hashes the image, MIME type, prompt version, provider order, models, and capability state before any provider call. Valid parses are cached under `AI_PARSE_CACHE_DIR` for `AI_PARSE_CACHE_TTL_SECONDS`.

Mock results and degraded safe-fallback results are not written to the cache.

## Response Metadata

When `RETURN_PROVIDER_METADATA=true`, parse responses include:

```json
{
  "provider_used": "gemini",
  "model_used": "gemini-2.5-flash",
  "fallback_used": true,
  "cached": false,
  "degraded_mode": false
}
```

If all providers fail and `ENABLE_SAFE_FALLBACK=true`, the route returns a valid editable receipt with `parse_status="review_required"` and `degraded_mode=true`. It does not fabricate transaction details.

## Mock Mode

`MOCK_AI_MODE=true` bypasses provider construction, cache reads, and all real API calls. Local persistence still uses the real IndexedDB repository.
