export function LoadingState({ label }: { label: string }) {
  return (
    <div role="status" className="space-y-3 py-6" aria-live="polite">
      <span className="sr-only">{label}</span>
      <div className="h-5 w-40 animate-pulse rounded bg-slate-200" />
      <div className="h-24 animate-pulse rounded-xl bg-slate-100" />
      <div className="h-24 animate-pulse rounded-xl bg-slate-100" />
    </div>
  );
}
