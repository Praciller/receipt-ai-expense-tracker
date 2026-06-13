import Dexie, { liveQuery, type Table } from 'dexie';
import {
  validateAndNormalizeReceipt,
  type ParsedReceipt,
  type ReceiptRecord,
} from '../receipt';
import type { ReceiptImage, ReceiptRepository } from './receipt-repository';

const DEFAULT_DATABASE_NAME = 'receipt-ledger';

class ReceiptDatabase extends Dexie {
  receipts!: Table<ReceiptRecord, string>;

  constructor(databaseName: string) {
    super(databaseName);
    this.version(1).stores({
      receipts: 'id, created_at, date, category, shop_name',
    });
  }
}

export class IndexedDbReceiptRepository implements ReceiptRepository {
  private readonly database: ReceiptDatabase;
  private lastCreatedAt = 0;

  constructor(databaseName = DEFAULT_DATABASE_NAME) {
    this.database = new ReceiptDatabase(databaseName);
  }

  async list() {
    return this.database.receipts.orderBy('created_at').reverse().toArray();
  }

  async get(id: string) {
    return (await this.database.receipts.get(id)) ?? null;
  }

  async create(receipt: ParsedReceipt, image?: ReceiptImage) {
    const normalized = validateAndNormalizeReceipt(receipt);
    if (!normalized.success) {
      throw new TypeError(normalized.error);
    }

    const record: ReceiptRecord = {
      ...normalized.data,
      id: createId(),
      created_at: this.nextCreatedAt(),
      image_base64: image?.base64 ?? null,
      image_mime_type: image?.mimeType ?? null,
    };

    await this.database.receipts.add(record);
    return record;
  }

  async update(id: string, patch: unknown) {
    const current = await this.get(id);
    if (!current) {
      return null;
    }

    const normalized = validateAndNormalizeReceipt({
      ...current,
      ...(patch && typeof patch === 'object' ? patch : {}),
    });
    if (!normalized.success) {
      throw new TypeError(normalized.error);
    }

    const updated: ReceiptRecord = {
      ...current,
      ...normalized.data,
    };
    await this.database.receipts.put(updated);
    return updated;
  }

  async delete(id: string) {
    if (!(await this.database.receipts.get(id))) {
      return false;
    }

    await this.database.receipts.delete(id);
    return true;
  }

  observe(
    listener: (receipts: ReceiptRecord[]) => void,
    onError?: (error: unknown) => void,
  ) {
    const subscription = liveQuery(() => this.list()).subscribe({
      next: listener,
      error: onError,
    });

    return () => subscription.unsubscribe();
  }

  async destroy() {
    this.database.close();
    await this.database.delete();
  }

  private nextCreatedAt() {
    const now = Date.now();
    this.lastCreatedAt = Math.max(now, this.lastCreatedAt + 1);
    return new Date(this.lastCreatedAt).toISOString();
  }
}

export function createIndexedDbReceiptRepository(options?: {
  databaseName?: string;
}) {
  return new IndexedDbReceiptRepository(
    options?.databaseName ?? DEFAULT_DATABASE_NAME,
  );
}

function createId() {
  if (typeof globalThis.crypto?.randomUUID === 'function') {
    return globalThis.crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}
