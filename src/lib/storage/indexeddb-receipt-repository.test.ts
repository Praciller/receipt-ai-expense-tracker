import 'fake-indexeddb/auto';
import { afterEach, describe, expect, it } from 'vitest';
import type { ParsedReceipt } from '../receipt';
import {
  createIndexedDbReceiptRepository,
  type IndexedDbReceiptRepository,
} from './indexeddb-receipt-repository';

const parsedReceipt: ParsedReceipt = {
  shop_name: 'Portfolio Cafe',
  date: '2025-06-13',
  items: [
    {
      name: 'Iced coffee',
      quantity: 1,
      unit_price: 85,
      total_price: 85,
    },
  ],
  total_amount: 85,
  tax_id: null,
  category: 'food',
  currency: 'THB',
  confidence: 0.92,
  notes: '',
  parse_status: 'parsed',
};

const repositories: IndexedDbReceiptRepository[] = [];
let databaseSequence = 0;

afterEach(async () => {
  await Promise.all(repositories.splice(0).map((repository) => repository.destroy()));
});

function createRepository() {
  databaseSequence += 1;
  const repository = createIndexedDbReceiptRepository({
    databaseName: `receipt-ledger-test-${databaseSequence}`,
  });
  repositories.push(repository);
  return repository;
}

describe('IndexedDbReceiptRepository', () => {
  it('creates, reads, updates, lists, and deletes validated receipts', async () => {
    const repository = createRepository();
    const first = await repository.create(parsedReceipt, {
      base64: 'ZmFrZS1pbWFnZQ==',
      mimeType: 'image/jpeg',
    });
    const second = await repository.create({
      ...parsedReceipt,
      shop_name: 'Later Shop',
      total_amount: 120,
    });

    expect(first.id).toBeTruthy();
    expect(first.image_base64).toBe('ZmFrZS1pbWFnZQ==');
    expect(await repository.get(first.id)).toEqual(first);
    expect((await repository.list()).map((receipt) => receipt.id)).toEqual([
      second.id,
      first.id,
    ]);

    const updated = await repository.update(first.id, {
      shop_name: 'Edited Cafe',
      date: '27/11/2568',
    });
    expect(updated?.shop_name).toBe('Edited Cafe');
    expect(updated?.date).toBe('2025-11-27');

    await expect(
      repository.update(first.id, { total_amount: -1 }),
    ).rejects.toThrow('Total amount must be non-negative');

    expect(await repository.delete(first.id)).toBe(true);
    expect(await repository.delete(first.id)).toBe(false);
    expect(await repository.get(first.id)).toBeNull();
  });

  it('observes IndexedDB changes through the repository abstraction', async () => {
    const repository = createRepository();
    const observedCounts: number[] = [];

    const observed = new Promise<void>((resolve, reject) => {
      const unsubscribe = repository.observe(
        (receipts) => {
          observedCounts.push(receipts.length);
          if (receipts.length === 1) {
            unsubscribe();
            resolve();
          }
        },
        reject,
      );
    });

    await repository.create(parsedReceipt);
    await observed;

    expect(observedCounts.at(-1)).toBe(1);
  });
});
