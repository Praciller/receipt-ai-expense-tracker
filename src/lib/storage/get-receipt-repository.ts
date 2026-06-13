import type { ReceiptRepository } from './receipt-repository';

let repository: ReceiptRepository | undefined;

export async function getReceiptRepository(): Promise<ReceiptRepository> {
  const mode = process.env.NEXT_PUBLIC_STORAGE_MODE ?? 'indexeddb';
  if (mode !== 'indexeddb') {
    throw new Error(`Unsupported receipt storage mode: ${mode}`);
  }

  if (!repository) {
    const { createIndexedDbReceiptRepository } = await import(
      './indexeddb-receipt-repository'
    );
    repository = createIndexedDbReceiptRepository();
  }

  return repository;
}
