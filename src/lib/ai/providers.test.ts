import { afterEach, describe, expect, it, vi } from 'vitest';
import { getConfiguredProviders } from './providers';

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe('getConfiguredProviders', () => {
  it('returns no external route when configuration is incomplete', () => {
    expect(getConfiguredProviders()).toEqual([]);
  });

  it('creates one generic external route from environment configuration', () => {
    configureExternalEnvironment();

    const providers = getConfiguredProviders();

    expect(providers).toHaveLength(1);
    expect(providers[0].name).toBe('external');
    expect(providers[0].supportsImageInput).toBe(true);
    expect(providers[0].imageModels).toEqual([
      'external-primary',
      'external-fallback',
    ]);
    expect(providers[0].repairModel).toBe('external-repair');
  });

  it('sends image input to the configured endpoint', async () => {
    configureExternalEnvironment();
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          choices: [{ message: { content: '{"shop_name":"Test"}' } }],
        }),
        { status: 200 },
      ),
    );
    const provider = getConfiguredProviders()[0];

    await provider.parseImage(
      { base64Image: 'image-data', mimeType: 'image/jpeg' },
      'external-primary',
      new AbortController().signal,
    );

    expect(fetchMock).toHaveBeenCalledWith(
      'https://inference.example/v1/chat/completions',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'Bearer test-key',
        }),
      }),
    );
    const request = fetchMock.mock.calls[0][1] as RequestInit;
    const body = JSON.parse(String(request.body));
    expect(body.model).toBe('external-primary');
    expect(body.messages[0].content[1].image_url.url).toBe(
      'data:image/jpeg;base64,image-data',
    );
  });

  it('sends JSON repair as text without receipt image data', async () => {
    configureExternalEnvironment();
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          choices: [{ message: { content: '{"shop_name":"Repaired"}' } }],
        }),
        { status: 200 },
      ),
    );
    const provider = getConfiguredProviders()[0];

    await provider.repairJson?.(
      '{"shop_name":"broken"}',
      'external-repair',
      new AbortController().signal,
    );

    const request = fetchMock.mock.calls[0][1] as RequestInit;
    const body = JSON.parse(String(request.body));
    expect(body.model).toBe('external-repair');
    expect(body.messages[0].content).toContain('{"shop_name":"broken"}');
    expect(body.messages[0].content).not.toContain('data:image');
  });
});

function configureExternalEnvironment() {
  vi.stubEnv('EXTERNAL_AI_API_KEY', 'test-key');
  vi.stubEnv('EXTERNAL_AI_BASE_URL', 'https://inference.example');
  vi.stubEnv('EXTERNAL_AI_CHAT_PATH', '/v1/chat/completions');
  vi.stubEnv('EXTERNAL_AI_MODEL', 'external-primary');
  vi.stubEnv('EXTERNAL_AI_FALLBACK_MODEL', 'external-fallback');
  vi.stubEnv('EXTERNAL_AI_JSON_REPAIR_MODEL', 'external-repair');
  vi.stubEnv('EXTERNAL_AI_SUPPORTS_IMAGE_INPUT', 'true');
}
