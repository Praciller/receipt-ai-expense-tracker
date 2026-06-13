# Portfolio Review

## Current Verdict

Portfolio-ready as a local-first multimodal receipt workflow. Supabase is no longer a blocker or dependency.

## Material Changes

- Replaced Supabase and process-memory persistence with IndexedDB and Dexie.js.
- Added a storage-neutral `ReceiptRepository` interface.
- Moved receipt CRUD, live history reads, and analytics aggregation into the browser.
- Removed server receipt CRUD and statistics routes.
- Kept `/api/receipts/parse` as the server-only AI boundary.
- Added environment-driven 9arm, Gemini, Groq, and Cerebras providers.
- Added capability-aware image routing, retry, fallback, JSON repair, parse caching, and provider metadata.
- Added a non-fabricating `review_required` degraded result when every provider fails.
- Retained Thai/English parsing, Buddhist Era normalization, structured validation, and human review.
- Added deterministic mock AI while keeping real IndexedDB persistence.
- Removed exposed provider values from `.env.local`; replacement keys must be newly rotated.
- Added repository CRUD/live-query tests with `fake-indexeddb`.

## Verified Behavior

- Mock upload returns editable structured fields.
- Saving writes a validated record to IndexedDB.
- Receipt history observes local changes.
- Dashboard statistics derive from local records.
- Delete removes the local record.
- Provider credentials are absent from client code.
- Tests, lint, and production build pass.

## Remaining Limitations

- Data is limited to one browser profile and has no backup or synchronization.
- IndexedDB contents are not encrypted by the application.
- Base64 receipt images can consume browser quota.
- Real provider verification requires newly rotated keys and available quota.
- 9arm, Groq, and Cerebras are text-only with the documented default capability flags; Gemini handles direct image parsing.
- The parse cache is per server filesystem and is not distributed.
- No authentication, multi-user ownership, import/export, or cloud recovery.

## Reviewer Path

1. Read the README flow and storage decision.
2. Run with `MOCK_AI_MODE=true`.
3. Upload any supported image.
4. Review and edit extracted fields.
5. Save and inspect receipt history.
6. Open the dashboard and verify aggregates.
7. Reload the page to confirm IndexedDB persistence.
8. Delete the receipt and confirm both views update.

## Resume Positioning

Built a local-first multimodal receipt expense tracker using Next.js, a capability-aware server-side AI provider router, Dexie/IndexedDB persistence, Thai and English normalization, Buddhist Era date handling, human review, reactive history, and client-side analytics.
