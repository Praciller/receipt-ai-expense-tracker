import { AlertCircle } from 'lucide-react';
import { Button } from './ui/button';

export function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  return (
    <div
      role="alert"
      className="rounded-xl border border-red-200 bg-red-50 p-5 text-red-900"
    >
      <div className="flex items-start gap-3">
        <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
        <div className="min-w-0">
          <p className="font-semibold">Unable to complete this request</p>
          <p className="mt-1 break-words text-sm text-red-800">{message}</p>
          {onRetry && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onRetry}
              className="mt-4 border-red-300 bg-red-50 text-red-900 hover:bg-red-100"
            >
              Try again
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
