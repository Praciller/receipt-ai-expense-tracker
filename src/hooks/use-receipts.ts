'use client';

import { useCallback, useEffect, useState } from 'react';
import type { ReceiptRecord } from '@/lib/receipt';
import { getReceiptRepository } from '@/lib/storage/get-receipt-repository';

export function useReceipts(refreshTrigger = 0) {
  const [receipts, setReceipts] = useState<ReceiptRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError('');

    try {
      const repository = await getReceiptRepository();
      setReceipts(await repository.list());
    } catch (caught) {
      setError(toErrorMessage(caught, 'Failed to load local receipts.'));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    let unsubscribe = () => {};

    setIsLoading(true);
    setError('');

    void getReceiptRepository()
      .then((repository) => {
        if (!active) {
          return;
        }

        unsubscribe = repository.observe(
          (nextReceipts) => {
            if (!active) {
              return;
            }
            setReceipts(nextReceipts);
            setIsLoading(false);
          },
          (caught) => {
            if (!active) {
              return;
            }
            setError(toErrorMessage(caught, 'Failed to watch local receipts.'));
            setIsLoading(false);
          },
        );
      })
      .catch((caught) => {
        if (!active) {
          return;
        }
        setError(toErrorMessage(caught, 'Failed to open local receipt storage.'));
        setIsLoading(false);
      });

    return () => {
      active = false;
      unsubscribe();
    };
  }, [refreshTrigger]);

  return { receipts, isLoading, error, refresh };
}

function toErrorMessage(caught: unknown, fallback: string) {
  return caught instanceof Error ? caught.message : fallback;
}
