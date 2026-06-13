import Image from 'next/image';
import type { ReceiptRecord } from '@/lib/receipt';

export function ReceiptDetail({ receipt }: { receipt: ReceiptRecord }) {
  return (
    <div className="grid gap-6 border-t border-slate-200 bg-white p-4 sm:grid-cols-2 sm:p-5">
      <div>
        <h4 className="text-sm font-semibold text-slate-900">Line items</h4>
        {receipt.items.length ? (
          <ul className="mt-3 divide-y divide-slate-100">
            {receipt.items.map((item, index) => (
              <li
                key={`${item.name}-${index}`}
                className="flex min-w-0 justify-between gap-4 py-2 text-sm"
              >
                <span className="min-w-0 break-words text-slate-600">
                  {item.name} × {item.quantity}
                </span>
                <span className="shrink-0 font-medium text-slate-900">
                  {formatCurrency(item.total_price)}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-sm text-slate-500">No line items recorded.</p>
        )}
        <dl className="mt-5 space-y-2 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-slate-500">Tax ID</dt>
            <dd className="break-all text-right text-slate-800">
              {receipt.tax_id ?? 'Not provided'}
            </dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-slate-500">Parse confidence</dt>
            <dd className="text-slate-800">
              {Math.round(receipt.confidence * 100)}%
            </dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-slate-500">Status</dt>
            <dd className="capitalize text-slate-800">
              {receipt.parse_status.replace('_', ' ')}
            </dd>
          </div>
        </dl>
      </div>

      <div>
        <h4 className="text-sm font-semibold text-slate-900">Receipt image</h4>
        {receipt.image_base64 ? (
          <Image
            src={`data:${receipt.image_mime_type ?? 'image/jpeg'};base64,${receipt.image_base64}`}
            alt={`Receipt from ${receipt.shop_name}`}
            width={640}
            height={800}
            unoptimized
            className="mt-3 max-h-72 w-full rounded-lg border border-slate-200 object-contain"
          />
        ) : (
          <p className="mt-2 text-sm text-slate-500">No image stored.</p>
        )}
        {receipt.notes && (
          <>
            <h4 className="mt-5 text-sm font-semibold text-slate-900">Notes</h4>
            <p className="mt-2 break-words text-sm text-slate-600">
              {receipt.notes}
            </p>
          </>
        )}
      </div>
    </div>
  );
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('th-TH', {
    style: 'currency',
    currency: 'THB',
  }).format(value);
}
