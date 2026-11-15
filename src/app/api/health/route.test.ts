import { afterEach, describe, expect, it, vi } from 'vitest';
import { GET } from './route';

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('GET /api/health', () => {
  it('reports mock mode by default', async () => {
    vi.stubEnv('MOCK_AI_MODE', '');
    vi.stubEnv('NODE_ENV', 'test');

    const body = await GET().json();

    expect(body.mock_ai_mode).toBe(false);
    expect(body.live_ready).toBe(false);
    expect(body.readiness_message).toMatch(/configure a server-side image provider/i);
  });

  it('reports production as not ready without a live image provider', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('MOCK_AI_MODE', 'true');
    vi.stubEnv('EXTERNAL_AI_API_KEY', '');
    vi.stubEnv('EXTERNAL_AI_BASE_URL', '');
    vi.stubEnv('EXTERNAL_AI_MODEL', '');
    const response = GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.ok).toBe(false);
    expect(body.mock_ai_mode).toBe(false);
    expect(body.live_ready).toBe(false);
  });

  it('reports configured routes without claiming inference success or exposing credentials', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('MOCK_AI_MODE', 'true');
    vi.stubEnv('EXTERNAL_AI_API_KEY', 'test-only-key');
    vi.stubEnv('EXTERNAL_AI_BASE_URL', 'https://generativelanguage.googleapis.com');
    vi.stubEnv('EXTERNAL_AI_MODEL', 'test-model');
    vi.stubEnv('GROQ_API_KEY', '');

    const body = await GET().json();

    expect(body.live_ready).toBe(true);
    expect(body.mock_ai_mode).toBe(false);
    expect(body.image_providers).toEqual(['gemini']);
    expect(body.readiness_message).toMatch(/does not test inference success/i);
    expect(JSON.stringify(body)).not.toContain('test-only-key');
  });
});
