# Production live inference setup

Production receipt parsing requires a configured image-capable provider. If none is available, `/api/health` reports `live_ready: false`, the upload control stays disabled, and `/api/receipts/parse` returns HTTP 503 without a receipt object. Production never runs the synthetic fixture or the safe fallback. A real provider response is shown with its provider and model, then requires human review and explicit save before anything is written to browser IndexedDB.

## Google Gemini through the OpenAI-compatible endpoint

In the Vercel project settings, add these as encrypted server-side environment variables for the intended deployment environment:

```text
MOCK_AI_MODE=false
EXTERNAL_AI_BASE_URL=https://generativelanguage.googleapis.com
EXTERNAL_AI_CHAT_PATH=/v1beta/openai/chat/completions
EXTERNAL_AI_MODEL=gemini-3.8-flash
EXTERNAL_AI_API_KEY=<set directly in Vercel's encrypted environment variable editor>
ENABLE_SAFE_FALLBACK=false
AI_MAX_RETRIES=0
```

Enter the key only in Vercel's encrypted environment variable editor. Never put it in a repository file, commit, issue, chat, browser variable, or log. Redeploy after setting the values, then confirm `/api/health` reports `live_ready: true` and `mock_ai_mode: false`. Gemini 3.8 Flash uses `reasoning_effort=low` and a larger 4096-token maximum to avoid JSON truncation from default thinking. A readiness check only confirms credentials are present; it does not prove that the provider can successfully parse an image.

## Groq Qwen 3.8 Vision (independent API key)

Create a *separate* free-tier key in GroqCloud. Store it only as the production secret `GROQ_API_KEY` in Vercel. The application uses the fixed OpenAI-compatible endpoint `https://api.groq.com/openai/v1/chat/completions`, the vision model `qwen/qwen3.8-27b`, and JSON Object Mode. Neither the key nor the image is sent to Google's API by this Groq provider.

If both providers are configured, Gemini runs first and Groq is a fallback when Gemini returns an error or a result that cannot be validated. Set `AI_PROVIDER_PRIORITY=groq` to try Groq first; any other value retains Gemini-first order. A fallback may consume quota from *both* providers. `AI_MAX_RETRIES=0` avoids automatic retry bursts, but does not eliminate failover. With only one configured key the available provider works alone.

This is a provider integration, **not** a real-world accuracy claim. Compare both models against the same non-sensitive printed test images and reviewed reference values before choosing a long-term primary. Do not use personal invoices or customer data on either free tier.

## Public endpoint protection

A Vercel Firewall rule named **Receipt AI Vision Free Quota** is currently enabled for `/api/receipts/parse`: **5 requests per 600 seconds per source IP**, fixed window, deny when exceeded. This is platform-level rate limiting (not an in-memory serverless counter). It protects against a single noisy IP but is **not a daily or organization-wide quota**: distributed traffic can still exhaust Groq/Gemini's account free allowance. Inspect the rule and provider usage after changes; adjust it only after confirming account limits.

The endpoint also validates image MIME type and size. No paid model, key rotation, daily budget enforcement, or inference costs should be assumed safe solely because a rate limit exists. Use only an unbilled free-tier provider project, and verify the current account rate limits in each provider console.

When a provider fallback succeeds, Vercel runtime logs contain only provider/model names, task, result category and sanitized HTTP status; they do **not** contain API keys, source images, receipt text, or raw provider errors. These diagnostics help distinguish rate limits (`http_429`), unavailable providers (`http_503`) and invalid model output (`invalid_schema`).

Receipt images submitted to a live provider leave the browser and are sent to that provider for inference. Upload only non-sensitive images and follow the provider's current data handling terms.

## Local synthetic evaluation

The deterministic fixture and synthetic evaluation remain available for local tests and development explicitly opted into with `MOCK_AI_MODE=true`. This mode is ignored in production. It is not a production extraction path and must not be used to represent live model performance.
