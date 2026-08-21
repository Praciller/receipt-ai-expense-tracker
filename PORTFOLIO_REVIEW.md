# Portfolio Review

## Current Verdict

Local-first multimodal receipt workflow with a deterministic synthetic review path and an optional vendor-neutral external GenAI boundary. Browser persistence remains local through IndexedDB/Dexie.

## Material Changes

- Replaced server/database persistence with IndexedDB and Dexie.js for the current local-first product path.
- Added a storage-neutral `ReceiptRepository` interface.
- Moved receipt CRUD, live history reads, and analytics aggregation into the browser.
- Kept `/api/receipts/parse` as the server-only inference boundary.
- Kept deterministic mock parsing as the default zero-key review path.
- Replaced vendor-specific inference adapters with one generic `external` server-side adapter.
- Preserved image capability checks, retry, fallback, JSON repair, parse caching, and inference metadata.
- Added a non-fabricating `review_required` degraded result when parsing cannot produce validated receipt data.
- Retained Thai/English parsing, Buddhist Era normalization, structured validation, and human review.
- Removed vendor-specific runtime SDK coupling and provider-specific public configuration.
- Added repository CRUD/live-query tests with `fake-indexeddb`.

## Verified Behavior

- Mock upload returns editable structured fields without a network inference call.
- Saving writes a validated record to IndexedDB only after explicit confirmation.
- Receipt history observes local changes and dashboard statistics derive from the same local records.
- Delete removes the local record.
- External inference credentials remain server-side.
- The generic external route is used only when mock mode is disabled and its endpoint settings are configured.
- Tests, lint, production build, dependency audit, and repository guardrails run in CI.

## Remaining Limitations

- Data is limited to one browser profile and has no built-in backup or synchronization.
- IndexedDB contents are not encrypted by the application.
- Base64 receipt images can consume browser quota.
- External inference must be separately verified against the configured endpoint, model capabilities, privacy requirements, and quota.
- The parse cache is per server filesystem and is not distributed.
- No authentication, multi-user ownership, import/export, or cloud recovery.

## Reviewer Path

1. Read the README flow and storage decision.
2. Follow [`docs/local_review.md`](docs/local_review.md) with mock mode enabled.
3. Upload only the generated synthetic placeholder.
4. Review and edit extracted fields.
5. Save and inspect receipt history.
6. Open the dashboard and verify aggregates.
7. Reload the page to confirm IndexedDB persistence.
8. Delete the receipt and confirm both views update.
9. Review [`docs/model_routing.md`](docs/model_routing.md) for the optional generic external GenAI boundary.

## Resume Positioning

Built a local-first multimodal receipt expense tracker using Next.js, deterministic mock-first parsing, a vendor-neutral optional external GenAI adapter, Dexie/IndexedDB persistence, Thai and English normalization, Buddhist Era date handling, human review, reactive history, and client-side analytics.

This is a portfolio decision-support demo, not accounting or tax advice, and it has not received a compliance audit.
