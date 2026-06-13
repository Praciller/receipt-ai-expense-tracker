import { afterEach, describe, expect, it, vi } from 'vitest';
import { getConfiguredProviders } from './providers';

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe('getConfiguredProviders', () => {
  it('uses configured provider priority with 9arm first', () => {
    configureProviderEnvironment();

    const providers = getConfiguredProviders();

    expect(providers.map((provider) => provider.name)).toEqual([
      'ninearm',
      'gemini',
      'groq',
      'cerebras',
    ]);
  });

  it('reads image capability flags from the environment', () => {
    configureProviderEnvironment();
    vi.stubEnv('NINEARM_SUPPORTS_IMAGE_INPUT', 'false');
    vi.stubEnv('GEMINI_SUPPORTS_IMAGE_INPUT', 'true');
    vi.stubEnv('GROQ_SUPPORTS_IMAGE_INPUT', 'false');
    vi.stubEnv('CEREBRAS_SUPPORTS_IMAGE_INPUT', 'false');

    const providers = getConfiguredProviders();

    expect(
      Object.fromEntries(
        providers.map((provider) => [
          provider.name,
          provider.supportsImageInput,
        ]),
      ),
    ).toEqual({
      ninearm: false,
      gemini: true,
      groq: false,
      cerebras: false,
    });
  });

  it('sends 9arm images through OpenAI-compatible chat completions', async () => {
    vi.stubEnv('AI_PROVIDER_PRIORITY', 'ninearm');
    vi.stubEnv('NINEARM_API_KEY', 'test-ninearm');
    vi.stubEnv('NINEARM_BASE_URL', 'https://gateway.example/v1');
    vi.stubEnv('NINEARM_RECEIPT_MODEL', 'ninearm-primary');
    vi.stubEnv('NINEARM_FALLBACK_MODEL', 'ninearm-primary');
    vi.stubEnv('NINEARM_SUPPORTS_IMAGE_INPUT', 'true');
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
      'ninearm-primary',
      new AbortController().signal,
    );

    expect(fetchMock).toHaveBeenCalledWith(
      'https://gateway.example/v1/chat/completions',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'Bearer test-ninearm',
        }),
      }),
    );
    const request = fetchMock.mock.calls[0][1] as RequestInit;
    const body = JSON.parse(String(request.body));
    expect(body.model).toBe('ninearm-primary');
    expect(body.messages[0].content[1].image_url.url).toBe(
      'data:image/jpeg;base64,image-data',
    );
  });

  it('sends Groq JSON repair as text without receipt image data', async () => {
    vi.stubEnv('AI_PROVIDER_PRIORITY', 'groq');
    vi.stubEnv('GROQ_API_KEY', 'test-groq');
    vi.stubEnv('GROQ_BASE_URL', 'https://groq.example/v1');
    vi.stubEnv('GROQ_JSON_REPAIR_MODEL', 'groq-repair');
    vi.stubEnv('GROQ_SUPPORTS_IMAGE_INPUT', 'false');
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
      'groq-repair',
      new AbortController().signal,
    );

    const request = fetchMock.mock.calls[0][1] as RequestInit;
    const body = JSON.parse(String(request.body));
    expect(body.model).toBe('groq-repair');
    expect(body.messages[0].content).toContain('{"shop_name":"broken"}');
    expect(body.messages[0].content).not.toContain('data:image');
  });
});

function configureProviderEnvironment() {
  vi.stubEnv('AI_PROVIDER_PRIORITY', 'ninearm,gemini,groq,cerebras');
  vi.stubEnv('NINEARM_API_KEY', 'test-ninearm');
  vi.stubEnv('NINEARM_RECEIPT_MODEL', 'ninearm-primary');
  vi.stubEnv('NINEARM_FALLBACK_MODEL', 'ninearm-fallback');
  vi.stubEnv('GEMINI_API_KEY', 'test-gemini');
  vi.stubEnv('GEMINI_RECEIPT_MODEL', 'gemini-primary');
  vi.stubEnv('GEMINI_RECEIPT_FALLBACK_MODEL', 'gemini-fallback');
  vi.stubEnv('GROQ_API_KEY', 'test-groq');
  vi.stubEnv('GROQ_RECEIPT_FALLBACK_MODEL', 'groq-fallback');
  vi.stubEnv('GROQ_JSON_REPAIR_MODEL', 'groq-repair');
  vi.stubEnv('CEREBRAS_API_KEY', 'test-cerebras');
  vi.stubEnv('CEREBRAS_RECEIPT_FALLBACK_MODEL', 'cerebras-fallback');
}
