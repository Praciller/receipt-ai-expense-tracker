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

describe('Gemini 3.8 Flash request configuration', () => {
  it('uses low reasoning and a sufficient JSON output budget, without deprecated sampling values', async () => {
    configureExternalEnvironment();
    vi.stubEnv('EXTERNAL_AI_BASE_URL', 'https://generativelanguage.googleapis.com');
    vi.stubEnv('EXTERNAL_AI_CHAT_PATH', '/v1beta/openai/chat/completions');
    vi.stubEnv('EXTERNAL_AI_MODEL', 'gemini-3.8-flash');
    vi.stubEnv('EXTERNAL_AI_FALLBACK_MODEL', '');
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({ choices: [{ message: { content: '{"shop_name":"Test"}' } }] }),
        { status: 200 },
      ),
    );
    const provider = getConfiguredProviders()[0];
    expect(provider.name).toBe('gemini');
    await provider.parseImage(
      { base64Image: 'image-data', mimeType: 'image/png' },
      'gemini-3.8-flash',
      new AbortController().signal,
    );
    const body = JSON.parse(String(fetchMock.mock.calls[0][1]?.body));
    expect(body.reasoning_effort).toBe('low');
    expect(body.max_tokens).toBe(4096);
    expect(body.temperature).toBeUndefined();
    expect(fetchMock.mock.calls[0][0]).toBe(
      'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions',
    );
  });
});

describe('Groq free vision provider', () => {
  it('keeps Groq unconfigured until a dedicated API key exists', () => {
    vi.stubEnv('GROQ_API_KEY', '');
    expect(getConfiguredProviders()).toEqual([]);
  });

  it('uses the documented Qwen vision model without a shared Gemini key', () => {
    vi.stubEnv('GROQ_API_KEY', 'test-groq-secret');
    const providers = getConfiguredProviders();
    expect(providers).toHaveLength(1);
    expect(providers[0].name).toBe('groq');
    expect(providers[0].imageModels).toEqual(['qwen/qwen3.8-27b']);
    expect(providers[0].supportsImageInput).toBe(true);
    expect(providers[0].repairModel).toBeUndefined();
  });

  it('uses the Groq API host, its own key, vision data and JSON mode', async () => {
    vi.stubEnv('GROQ_API_KEY', 'test-groq-secret');
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({ choices: [{ message: { content: '{"shop_name":"Demo"}' } }] }),
        { status: 200 },
      ),
    );
    const provider = getConfiguredProviders()[0];
    await provider.parseImage(
      { base64Image: 'test-png', mimeType: 'image/png' },
      'qwen/qwen3.8-27b',
      new AbortController().signal,
    );

    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.groq.com/openai/v1/chat/completions',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ Authorization: 'Bearer test-groq-secret' }),
      }),
    );
    const body = JSON.parse(String(fetchMock.mock.calls[0][1]?.body));
    expect(body.model).toBe('qwen/qwen3.8-27b');
    expect(body.response_format).toEqual({ type: 'json_object' });
    expect(body.messages[0].content[1].image_url.url).toBe('data:image/png;base64,test-png');
  });

  it('prefers Gemini and supports an explicit Groq-primary order without changing keys', () => {
    configureExternalEnvironment();
    vi.stubEnv('GROQ_API_KEY', 'test-groq-secret');
    expect(getConfiguredProviders().map((p) => p.name)).toEqual(['external', 'groq']);
    vi.stubEnv('AI_PROVIDER_PRIORITY', 'groq');
    expect(getConfiguredProviders().map((p) => p.name)).toEqual(['groq', 'external']);
  });
});
