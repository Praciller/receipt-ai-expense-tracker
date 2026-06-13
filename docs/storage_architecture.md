# Storage Architecture

## Decision

Version 1 uses IndexedDB through Dexie.js. Supabase is no longer a runtime, setup, testing, or deployment requirement.

## Why Supabase Was Removed

- The portfolio flow is single-user and local-first.
- Missing cloud credentials blocked an otherwise complete demo.
- Server CRUD added deployment and secret-management work without improving the core receipt-review experience.
- Receipt images and structured records fit IndexedDB better than `localStorage`.
- Mock AI plus IndexedDB makes the entire review/save/history/dashboard flow testable without external quota or database access.

## Repository Boundary

UI code depends on `ReceiptRepository`, not Dexie:

```ts
interface ReceiptRepository {
  list(): Promise<ReceiptRecord[]>;
  get(id: string): Promise<ReceiptRecord | null>;
  create(receipt: ParsedReceipt, image?: ReceiptImage): Promise<ReceiptRecord>;
  update(id: string, patch: unknown): Promise<ReceiptRecord | null>;
  delete(id: string): Promise<boolean>;
  observe(listener, onError?): () => void;
}
```

`getReceiptRepository()` selects the configured implementation. Version 1 accepts only `NEXT_PUBLIC_STORAGE_MODE=indexeddb`; unsupported values fail explicitly.

## IndexedDB Schema

Database: `receipt-ledger`

Table: `receipts`

Indexes:

- `id`
- `created_at`
- `date`
- `category`
- `shop_name`

Records include normalized receipt fields plus optional base64 image data and MIME type.

## Reactive Reads

Dexie `liveQuery` observes the repository list query. Saving or deleting a receipt updates history and dashboard subscribers without a server request.

## Future Backend Swap

A future synchronized repository can implement the same interface and add:

- authentication and ownership
- encrypted cloud backup
- multi-device sync
- conflict resolution
- image-object storage

The UI and statistics code should not need vendor-specific imports.

## Limitations

- Data is scoped to one origin and browser profile.
- Browser storage can be cleared by the user or browser.
- Base64 images increase storage consumption.
- There is no backup, sync, or encryption layer in version 1.
