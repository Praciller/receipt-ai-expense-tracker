import { describe, expect, it } from 'vitest';
import { summarizeProviderFailures } from './provider-diagnostics';

describe('summarizeProviderFailures', () => {
  it('keeps only public model and categorized failure metadata', () => {
    const failures = summarizeProviderFailures([
      { provider: 'gemini', model: 'gemini-3.8-flash', task: 'image', attempt: 1, outcome: 'failed', error: 'External inference returned HTTP 429.' },
      { provider: 'groq', model: 'qwen/qwen3.8-27b', task: 'image', attempt: 1, outcome: 'success' },
    ]);
    expect(failures).toEqual([
      { provider: 'gemini', model: 'gemini-3.8-flash', task: 'image', outcome: 'failed', reason: 'http_429' },
    ]);
  });

  it('never discloses arbitrary error text such as receipt details or secrets', () => {
    const result = summarizeProviderFailures([
      { provider: 'gemini', model: 'gemini-3.8-flash', task: 'image', attempt: 1, outcome: 'failed', error: 'secret-key 1234 receipt customer data' },
      { provider: 'gemini', model: 'gemini-3.8-flash', task: 'json_repair', attempt: 1, outcome: 'invalid', error: 'Sensitive raw receipt from response' },
    ]);
    const text = JSON.stringify(result);
    expect(text).not.toMatch(/secret-key|customer|Sensitive|receipt from response/);
    expect(result.map((x) => x.reason)).toEqual(['request_failed', 'invalid_schema']);
  });
});
