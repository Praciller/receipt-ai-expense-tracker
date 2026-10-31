import type { ProviderAttempt } from './router';

// Preserve only non-sensitive operational signals. Never log provider errors,
// request bodies, images, extracted values, authorization headers, or API keys.
export function summarizeProviderFailures(attempts: ProviderAttempt[]) {
  return attempts
    .filter((attempt) => attempt.outcome === 'failed' || attempt.outcome === 'invalid')
    .map(({ provider, model, task, outcome, error }) => {
      const status = /^External inference returned HTTP (\d{3})\.$/.exec(error ?? '');
      return {
        provider,
        model,
        task,
        outcome,
        reason: status
          ? `http_${status[1]}`
          : outcome === 'invalid'
            ? 'invalid_schema'
            : 'request_failed',
      };
    });
}
