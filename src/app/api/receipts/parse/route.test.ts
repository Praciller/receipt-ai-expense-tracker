import { afterEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe('POST /api/receipts/parse', () => {
  it('returns a mock structured result without saving it', async () => {
    vi.stubEnv('MOCK_AI_MODE', 'true');
    const { POST } = await import('./route');
    const request = new NextRequest('http://localhost/api/receipts/parse', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        image: Buffer.from('mock image').toString('base64'),
        mimeType: 'image/jpeg',
      }),
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status, JSON.stringify(body)).toBe(200);
    expect(body.provider_used).toBe('mock');
    expect(body.model_used).toBe('deterministic-fixture');
    expect(body.fallback_used).toBe(false);
    expect(body.degraded_mode).toBe(false);
    expect(body.receipt.shop_name).toContain('Portfolio Cafe');
    expect(body.receipt.id).toBeUndefined();
    expect(body.attempts).toBeUndefined();
  });
});
