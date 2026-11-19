# Production live inference setup

Production receipt parsing requires a configured image-capable provider. If none is configured, `/api/health` reports `live_ready: false`, the upload control stays disabled, and `/api/receipts/parse` returns HTTP 503 without a receipt object. Production never runs the synthetic fixture or the safe fallback. A successful provider response is shown with its provider and model, then requires human review and explicit save before anything is written to browser IndexedDB.

The public upload screen includes a fictional sample image. It is rasterized to PNG and sent through the same parse API as a user upload, with mock output and the parse cache bypassed. The image still leaves the browser and reaches the configured external AI provider. If inference fails, the UI shows the error; it does not substitute fixture output.

`/api/health` computes readiness from configured image-capable routes. It does not make a provider request, validate credentials with the provider, check quota, or prove image inference succeeds. The successful parse response and its provider/model metadata are evidence for that individual request.

## Preview-only live verification

For the `docs/clarify-production-provider-priority` preview, use a dedicated provider key scoped to that Preview branch. In the Vercel project, open **Settings → Environment Variables** and add `GROQ_API_KEY` as a **Sensitive** variable with the **Preview** target and Git branch `docs/clarify-production-provider-priority`. Do not edit the existing Production variable or select Production or Development. Vercel applies environment changes to new deployments, so redeploy this Preview deployment after saving; do not redeploy Production. See [Vercel environment-variable scopes](https://vercel.com/docs/environment-variables) and [how to manage them](https://vercel.com/docs/environment-variables/managing-environment-variables).

Create a separate Groq key only if the account remains on a no-charge plan. Groq currently lists the pinned `qwen/qwen3.8-27b` model as image-capable, but also publishes paid-tier token pricing; do not upgrade or enable billing for this test. If the model is unavailable on the no-charge plan, stop and request approval before using a paid route. The app's Groq adapter fixes the provider host and model, so `GROQ_API_KEY` is the only provider credential required when Groq is the sole configured route. Optionally set `AI_MAX_RETRIES=0` and `ENABLE_SAFE_FALLBACK=false` as Preview-only values to limit repeat calls and keep failures explicit.

After the Preview redeploy is Ready, `/api/health` should report `live_ready: true` and `image_providers: ["groq"]`. This only confirms configuration. Click **Try fictional sample receipt** once to force an uncached live request, then confirm the successful response's provider and model, compare fields with the visible sample, review/edit, save, and verify browser-local history and dashboard totals. The fictional image is sent to Groq; never use personal or customer receipts for this test. If readiness is false or inference fails, do not treat a fixture, cached result, or safe fallback as live success.

## Google Gemini through the OpenAI-compatible endpoint

In the Vercel project settings, add these as encrypted server-side environment variables for the intended deployment environment. This configures the Gemini route; it does not make Gemini a permanent deployment primary:

```text
MOCK_AI_MODE=false
EXTERNAL_AI_BASE_URL=https://generativelanguage.googleapis.com
EXTERNAL_AI_CHAT_PATH=/v1beta/openai/chat/completions
EXTERNAL_AI_MODEL=gemini-3.8-flash
EXTERNAL_AI_API_KEY=<set directly in Vercel's encrypted environment variable editor>
ENABLE_SAFE_FALLBACK=false
AI_MAX_RETRIES=0
```

Enter the key only in Vercel's encrypted environment variable editor. Never put it in a repository file, commit, issue, chat, browser variable, or log. Redeploy after setting the values, then confirm `/api/health` reports `live_ready: true` and `mock_ai_mode: false`. Gemini 3.8 Flash uses `reasoning_effort=low` and a larger 4096-token maximum to avoid JSON truncation from default thinking. A readiness check confirms only that an image-capable route is configured; it does not prove that the provider can successfully parse an image.

## Groq Qwen 3.8 Vision (independent API key)

Create a *separate* free-tier key in GroqCloud. Store it only as the production secret `GROQ_API_KEY` in Vercel. The application uses the fixed OpenAI-compatible endpoint `https://api.groq.com/openai/v1/chat/completions`, the vision model `qwen/qwen3.8-27b`, and JSON Object Mode. Neither the key nor the image is sent to Google's API by this Groq provider.

The code builds its route list in this order: configured `EXTERNAL_AI_*` provider, then configured Groq. A Google Generative Language base URL names the external route `gemini`; another compatible URL names it `external`. Thus, when Gemini and Groq are both configured, the code default is Gemini then Groq. Set `AI_PROVIDER_PRIORITY=groq` to reverse the configured list; any other value retains configuration order. The deployment can change environment values at any time, so this is not a permanent production priority.

On 2026-11-15, the public `/api/health` reported `provider_priority: ["groq", "gemini"]`, `image_providers: ["groq", "gemini"]`, and `repair_providers: ["gemini"]`. This dated snapshot describes configured routes only. It does not show which provider completed a particular inference. Check the provider/model returned by a successful parse to identify that request's result. A fallback may consume quota from *both* providers. `AI_MAX_RETRIES=0` avoids automatic retry bursts, but does not eliminate failover. With only one configured key the available provider works alone.

This is a provider integration, **not** a real-world accuracy claim. Compare both models against the same non-sensitive printed test images and reviewed reference values before choosing a long-term primary. Do not use personal invoices or customer data on either free tier.

## Public endpoint protection

A Vercel Firewall rule named **Receipt AI Vision Free Quota** is currently enabled for `/api/receipts/parse`: **5 requests per 600 seconds per source IP**, fixed window, deny when exceeded. This is platform-level rate limiting (not an in-memory serverless counter). It protects against a single noisy IP but is **not a daily or organization-wide quota**: distributed traffic can still exhaust Groq/Gemini's account free allowance. Inspect the rule and provider usage after changes; adjust it only after confirming account limits.

The endpoint also validates image MIME type and size. No paid model, key rotation, daily budget enforcement, or inference costs should be assumed safe solely because a rate limit exists. Use only an unbilled free-tier provider project, and verify the current account rate limits in each provider console.

When a provider fallback succeeds, Vercel runtime logs contain only provider/model names, task, result category and sanitized HTTP status; they do **not** contain API keys, source images, receipt text, or raw provider errors. These diagnostics help distinguish rate limits (`http_429`), unavailable providers (`http_503`) and invalid model output (`invalid_schema`).

Receipt images submitted to a live provider leave the browser and are sent to that provider for inference. Upload only non-sensitive images and follow the provider's current data handling terms.

## Local synthetic evaluation

The deterministic fixture and synthetic evaluation remain available for local tests and development explicitly opted into with `MOCK_AI_MODE=true`. This mode is ignored in production. It is not a production extraction path and must not be used to represent live model performance.
