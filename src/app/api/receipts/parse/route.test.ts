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

  it('fails closed in production without an image provider and never emits a receipt', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('MOCK_AI_MODE', 'true');
    vi.stubEnv('ENABLE_SAFE_FALLBACK', 'true');
    vi.stubEnv('EXTERNAL_AI_API_KEY', '');
    vi.stubEnv('EXTERNAL_AI_BASE_URL', '');
    vi.stubEnv('EXTERNAL_AI_MODEL', '');
    const { POST } = await import('./route');
    const request = new NextRequest('http://localhost/api/receipts/parse', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image: Buffer.from('not sensitive').toString('base64'), mimeType: 'image/jpeg' }),
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body.error).toMatch(/configure an image-capable provider/i);
    expect(body.receipt).toBeUndefined();
    expect(JSON.stringify(body)).not.toMatch(/Portfolio Cafe|safe-fallback|deterministic-fixture/i);
  });

  it('returns 503 without synthetic or fallback output when live inference fails', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('MOCK_AI_MODE', 'true');
    vi.stubEnv('ENABLE_SAFE_FALLBACK', 'true');
    vi.stubEnv('ENABLE_AI_PARSE_CACHE', 'false');
    vi.stubEnv('AI_MAX_RETRIES', '0');
    vi.stubEnv('EXTERNAL_AI_API_KEY', 'test-only-key');
    vi.stubEnv('EXTERNAL_AI_BASE_URL', 'https://provider.invalid');
    vi.stubEnv('EXTERNAL_AI_MODEL', 'test-model');
    vi.stubEnv('RETURN_PROVIDER_METADATA', 'false');
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('unavailable', { status: 502 }));
    const { POST } = await import('./route');
    const request = new NextRequest('http://localhost/api/receipts/parse', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image: Buffer.from('test').toString('base64'), mimeType: 'image/jpeg' }),
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body.error).toMatch(/temporarily unavailable/i);
    expect(body.receipt).toBeUndefined();
    expect(JSON.stringify(body)).not.toMatch(/Portfolio Cafe|safe-fallback|deterministic-fixture/i);
  });
});
