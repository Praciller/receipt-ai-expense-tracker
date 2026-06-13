'use client';

import { Plus, Trash2 } from 'lucide-react';
import {
  RECEIPT_CATEGORIES,
  type ParsedReceipt,
  type ReceiptItem,
} from '@/lib/receipt';
import { Button } from './ui/button';

interface ParsedReceiptReviewProps {
  receipt: ParsedReceipt;
  provider: string;
  model: string;
  isSaving: boolean;
  onChange(receipt: ParsedReceipt): void;
  onSave(): void;
  onCancel(): void;
}

export function ParsedReceiptReview({
  receipt,
  provider,
  model,
  isSaving,
  onChange,
  onSave,
  onCancel,
}: ParsedReceiptReviewProps) {
  const setField = <K extends keyof ParsedReceipt>(
    field: K,
    value: ParsedReceipt[K],
  ) => onChange({ ...receipt, [field]: value });

  const updateItem = (index: number, patch: Partial<ReceiptItem>) => {
    const items = receipt.items.map((item, itemIndex) =>
      itemIndex === index ? { ...item, ...patch } : item,
    );
    setField('items', items);
  };

  return (
    <section aria-labelledby="review-title" className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id="review-title" className="text-xl font-semibold text-slate-950">
            Review extracted receipt
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            AI can misread receipts. Confirm every field before saving.
          </p>
        </div>
        <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-800">
          {provider} · {model}
        </span>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Shop name">
          <input
            value={receipt.shop_name}
            onChange={(event) => setField('shop_name', event.target.value)}
            required
            className="field"
          />
        </Field>
        <Field label="Receipt date">
          <input
            type="date"
            value={receipt.date}
            onChange={(event) => setField('date', event.target.value)}
            required
            className="field"
          />
        </Field>
        <Field label="Total amount (THB)">
          <input
            type="number"
            min="0"
            step="0.01"
            value={receipt.total_amount}
            onChange={(event) =>
              setField('total_amount', Number(event.target.value))
            }
            required
            className="field"
          />
        </Field>
        <Field label="Tax ID">
          <input
            value={receipt.tax_id ?? ''}
            onChange={(event) =>
              setField('tax_id', event.target.value.trim() || null)
            }
            className="field"
          />
        </Field>
        <Field label="Category">
          <select
            value={receipt.category}
            onChange={(event) =>
              setField(
                'category',
                event.target.value as ParsedReceipt['category'],
              )
            }
            className="field capitalize"
          >
            {RECEIPT_CATEGORIES.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Confidence">
          <div className="field flex items-center justify-between bg-slate-50">
            <span>{Math.round(receipt.confidence * 100)}%</span>
            <span className="text-xs capitalize text-slate-500">
              {receipt.parse_status.replace('_', ' ')}
            </span>
          </div>
        </Field>
      </div>

      <div>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-semibold text-slate-900">Line items</h3>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() =>
              setField('items', [
                ...receipt.items,
                { name: '', quantity: 1, unit_price: 0, total_price: 0 },
              ])
            }
          >
            <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
            Add item
          </Button>
        </div>
        {receipt.items.length === 0 ? (
          <p className="rounded-lg bg-slate-50 p-4 text-sm text-slate-600">
            No line items were readable. Shop and total are still available for
            review.
          </p>
        ) : (
          <div className="space-y-3">
            {receipt.items.map((item, index) => (
              <div
                key={`${index}-${item.name}`}
                className="grid gap-3 rounded-xl border border-slate-200 p-3 sm:grid-cols-[minmax(0,1fr)_90px_120px_44px]"
              >
                <input
                  aria-label={`Item ${index + 1} name`}
                  value={item.name}
                  onChange={(event) =>
                    updateItem(index, { name: event.target.value })
                  }
                  className="field min-w-0"
                />
                <input
                  aria-label={`Item ${index + 1} quantity`}
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={item.quantity}
                  onChange={(event) =>
                    updateItem(index, { quantity: Number(event.target.value) })
                  }
                  className="field"
                />
                <input
                  aria-label={`Item ${index + 1} total`}
                  type="number"
                  min="0"
                  step="0.01"
                  value={item.total_price}
                  onChange={(event) =>
                    updateItem(index, {
                      total_price: Number(event.target.value),
                    })
                  }
                  className="field"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label={`Remove item ${index + 1}`}
                  onClick={() =>
                    setField(
                      'items',
                      receipt.items.filter((_, itemIndex) => itemIndex !== index),
                    )
                  }
                >
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      <Field label="Notes">
        <textarea
          rows={3}
          value={receipt.notes}
          onChange={(event) => setField('notes', event.target.value)}
          className="field resize-y"
        />
      </Field>

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <Button type="button" variant="ghost" onClick={onCancel}>
          Choose another image
        </Button>
        <Button type="button" onClick={onSave} disabled={isSaving}>
          {isSaving ? 'Saving…' : 'Save receipt'}
        </Button>
      </div>
    </section>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block text-sm font-medium text-slate-700">
      <span className="mb-1.5 block">{label}</span>
      {children}
    </label>
  );
}
