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

Enter the key only in Vercel's encrypted environment variable editor. Never put it in a repository file, commit, issue, chat, browser variable, or log. Redeploy after setting the values, then confirm `/api/health` reports `live_ready: true` and `mock_ai_mode: false`. This project has not verified a live Gemini request unless a valid key was supplied and the deployment was exercised; local tests do not establish provider connectivity.

## Public endpoint protection

The application does not implement shared quota enforcement or distributed rate limiting. A per-instance process limit would not reliably protect a serverless deployment. Before inviting public traffic, use Vercel or an upstream gateway/WAF to enforce request quotas and rate limits on `/api/receipts/parse`, and monitor provider-side usage. The endpoint validates MIME type and image size, but those checks are not abuse controls. Do not publish hardcoded model pricing or cost estimates; consult the provider's current pricing for the account and region in use.

Receipt images submitted to a live provider leave the browser and are sent to that provider for inference. Upload only non-sensitive images and follow the provider's current data handling terms.

## Local synthetic evaluation

The deterministic fixture and synthetic evaluation remain available for local tests and development explicitly opted into with `MOCK_AI_MODE=true`. This mode is ignored in production. It is not a production extraction path and must not be used to represent live model performance.
