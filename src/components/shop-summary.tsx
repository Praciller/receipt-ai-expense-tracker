import { Store } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';

export function ShopSummary({
  shops,
}: {
  shops: Array<{ name: string; amount: number }>;
}) {
  return (
    <Card>
      <CardHeader className="border-b border-slate-200">
        <CardTitle className="flex items-center gap-2">
          <Store className="h-5 w-5 text-blue-700" aria-hidden="true" />
          Shop summary
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-6">
        {shops.length ? (
          <ol className="divide-y divide-slate-100">
            {shops.slice(0, 5).map((shop, index) => (
              <li
                key={shop.name}
                className="flex min-w-0 items-center justify-between gap-4 py-3"
              >
                <span className="flex min-w-0 items-center gap-3">
                  <span className="text-xs font-semibold text-slate-400">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <span className="truncate font-medium text-slate-800">
                    {shop.name}
                  </span>
                </span>
                <span className="shrink-0 text-sm font-semibold text-slate-950">
                  {formatCurrency(shop.amount)}
                </span>
              </li>
            ))}
          </ol>
        ) : (
          <p className="py-12 text-center text-sm text-slate-500">
            No shop totals yet.
          </p>
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
