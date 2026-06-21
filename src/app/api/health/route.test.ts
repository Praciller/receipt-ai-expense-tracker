import { afterEach, describe, expect, it, vi } from 'vitest';
import { GET } from './route';

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('GET /api/health', () => {
  it('reports mock mode by default', async () => {
    vi.stubEnv('MOCK_AI_MODE', '');

    const body = await GET().json();

    expect(body.mock_ai_mode).toBe(true);
  });
});
