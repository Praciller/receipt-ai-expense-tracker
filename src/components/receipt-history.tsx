'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp, ReceiptText, RefreshCw, Trash2 } from 'lucide-react';
import { useReceipts } from '@/hooks/use-receipts';
import { getReceiptRepository } from '@/lib/storage/get-receipt-repository';
import { ErrorState } from './error-state';
import { LoadingState } from './loading-state';
import { ReceiptDetail } from './receipt-detail';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';

export function ReceiptHistory({ refreshTrigger = 0 }: { refreshTrigger?: number }) {
  const {
    receipts,
    isLoading,
    error: loadError,
    refresh,
  } = useReceipts(refreshTrigger);
  const [actionError, setActionError] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const error = actionError || loadError;

  const handleRefresh = () => {
    setActionError('');
    void refresh();
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    setActionError('');
    try {
      const repository = await getReceiptRepository();
      await repository.delete(id);
      setConfirmDeleteId(null);
    } catch (caught) {
      setActionError(
        caught instanceof Error ? caught.message : 'Failed to delete receipt.',
      );
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <Card className="overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between border-b border-slate-200">
        <div>
          <CardTitle>Receipt history</CardTitle>
          <p className="mt-1 text-sm text-slate-500">
            Review saved extraction details and source images.
          </p>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={handleRefresh}
          aria-label="Refresh receipt history"
        >
          <RefreshCw className="h-4 w-4" aria-hidden="true" />
        </Button>
      </CardHeader>
      <CardContent className="pt-6">
        {isLoading ? (
          <LoadingState label="Loading receipt history" />
        ) : error ? (
          <ErrorState message={error} onRetry={handleRefresh} />
        ) : receipts.length === 0 ? (
          <div className="py-12 text-center">
            <ReceiptText
              className="mx-auto h-9 w-9 text-slate-400"
              aria-hidden="true"
            />
            <p className="mt-3 font-semibold text-slate-900">No receipts yet</p>
            <p className="mt-1 text-sm text-slate-500">
              Parse and review a receipt, then save it here.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {receipts.map((receipt) => {
              const expanded = expandedId === receipt.id;
              const confirming = confirmDeleteId === receipt.id;
              return (
                <article
                  key={receipt.id}
                  className="overflow-hidden rounded-xl border border-slate-200"
                >
                  <div className="flex flex-col gap-3 bg-slate-50 p-4 sm:flex-row sm:items-center sm:justify-between">
                    <button
                      type="button"
                      className="flex min-h-11 min-w-0 flex-1 items-center justify-between gap-4 rounded-lg text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
                      aria-expanded={expanded}
                      aria-controls={`receipt-${receipt.id}`}
                      onClick={() =>
                        setExpandedId(expanded ? null : receipt.id)
                      }
                    >
                      <span className="min-w-0">
                        <span className="block truncate font-semibold text-slate-950">
                          {receipt.shop_name}
                        </span>
                        <span className="mt-1 block text-sm text-slate-500">
                          {formatDate(receipt.date)} ·{' '}
                          <span className="capitalize">{receipt.category}</span>
                        </span>
                      </span>
                      <span className="flex shrink-0 items-center gap-3">
                        <span className="font-semibold text-slate-950">
                          {formatCurrency(receipt.total_amount)}
                        </span>
                        {expanded ? (
                          <ChevronUp className="h-5 w-5" aria-hidden="true" />
                        ) : (
                          <ChevronDown className="h-5 w-5" aria-hidden="true" />
                        )}
                      </span>
                    </button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label={`Delete receipt from ${receipt.shop_name}`}
                      onClick={() =>
                        setConfirmDeleteId(confirming ? null : receipt.id)
                      }
                    >
                      <Trash2 className="h-4 w-4" aria-hidden="true" />
                    </Button>
                  </div>

                  {confirming && (
                    <div className="flex flex-col gap-3 border-t border-amber-200 bg-amber-50 p-4 text-sm text-amber-950 sm:flex-row sm:items-center sm:justify-between">
                      <p>Delete this receipt permanently?</p>
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setConfirmDeleteId(null)}
                        >
                          Cancel
                        </Button>
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          disabled={deletingId === receipt.id}
                          onClick={() => void handleDelete(receipt.id)}
                        >
                          {deletingId === receipt.id ? 'Deleting…' : 'Delete'}
                        </Button>
                      </div>
                    </div>
                  )}

                  {expanded && (
                    <div id={`receipt-${receipt.id}`}>
                      <ReceiptDetail receipt={receipt} />
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('th-TH', {
    style: 'currency',
    currency: 'THB',
  }).format(value);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(`${value}T00:00:00.000Z`));
}
