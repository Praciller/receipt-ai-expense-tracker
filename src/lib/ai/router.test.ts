import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ParsedReceipt } from '../receipt';
import {
  parseReceiptImage,
  parseWithProviders,
  type ParseCache,
  type ReceiptAiProvider,
} from './router';

const validReceipt = {
  shop_name: 'Portfolio Cafe',
  date: '2025-06-13',
  items: [],
  total_amount: 180,
  tax_id: null,
  category: 'food',
  currency: 'THB',
  confidence: 0.92,
  notes: '',
};

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('parseWithProviders', () => {
  it('uses 9arm first when image input is enabled', async () => {
    const ninearm = provider({
      name: 'ninearm',
      supportsImageInput: true,
      imageModels: ['ninearm-primary'],
      imageResult: JSON.stringify(validReceipt),
    });
    const gemini = provider({
      name: 'gemini',
      supportsImageInput: true,
      imageModels: ['gemini-primary'],
      imageResult: JSON.stringify(validReceipt),
    });

    const result = await parseWithProviders(imageInput, [ninearm, gemini], {
      maxRetries: 1,
      retryBackoffMs: 0,
    });

    expect(result.provider_used).toBe('ninearm');
    expect(result.model_used).toBe('ninearm-primary');
    expect(result.fallback_used).toBe(false);
    expect(ninearm.parseImage).toHaveBeenCalledOnce();
    expect(gemini.parseImage).not.toHaveBeenCalled();
  });

  it('skips 9arm when image input is disabled', async () => {
    const ninearm = provider({
      name: 'ninearm',
      supportsImageInput: false,
      imageModels: ['ninearm-primary'],
      imageResult: JSON.stringify(validReceipt),
    });
    const gemini = provider({
      name: 'gemini',
      supportsImageInput: true,
      imageModels: ['gemini-primary'],
      imageResult: JSON.stringify(validReceipt),
    });

    const result = await parseWithProviders(imageInput, [ninearm, gemini], {
      maxRetries: 1,
      retryBackoffMs: 0,
    });

    expect(result.provider_used).toBe('gemini');
    expect(result.fallback_used).toBe(true);
    expect(ninearm.parseImage).not.toHaveBeenCalled();
    expect(gemini.parseImage).toHaveBeenCalledOnce();
    expect(result.attempts).toContainEqual(
      expect.objectContaining({
        provider: 'ninearm',
        task: 'image',
        outcome: 'skipped',
      }),
    );
  });

  it('retries 9arm once before falling back to Gemini', async () => {
    const sleep = vi.fn().mockResolvedValue(undefined);
    const ninearm = provider({
      name: 'ninearm',
      supportsImageInput: true,
      imageModels: ['ninearm-primary'],
      imageError: new Error('gateway unavailable'),
    });
    const gemini = provider({
      name: 'gemini',
      supportsImageInput: true,
      imageModels: ['gemini-primary'],
      imageResult: JSON.stringify(validReceipt),
    });

    const result = await parseWithProviders(imageInput, [ninearm, gemini], {
      maxRetries: 1,
      retryBackoffMs: 2000,
      sleep,
    });

    expect(ninearm.parseImage).toHaveBeenCalledTimes(2);
    expect(sleep).toHaveBeenCalledOnce();
    expect(sleep).toHaveBeenCalledWith(2000);
    expect(gemini.parseImage).toHaveBeenCalledOnce();
    expect(result.provider_used).toBe('gemini');
    expect(result.fallback_used).toBe(true);
  });

  it('uses Groq then Cerebras for text-only JSON repair', async () => {
    const invalidRaw = '{"shop_name":"broken"}';
    const gemini = provider({
      name: 'gemini',
      supportsImageInput: true,
      imageModels: ['gemini-primary'],
      imageResult: invalidRaw,
    });
    const groq = provider({
      name: 'groq',
      supportsImageInput: false,
      repairModel: 'groq-repair',
      repairError: new Error('repair unavailable'),
    });
    const cerebras = provider({
      name: 'cerebras',
      supportsImageInput: false,
      repairModel: 'cerebras-repair',
      repairResult: JSON.stringify(validReceipt),
    });

    const result = await parseWithProviders(
      imageInput,
      [gemini, groq, cerebras],
      {
        maxRetries: 0,
        retryBackoffMs: 0,
      },
    );

    expect(groq.repairJson).toHaveBeenCalledWith(
      invalidRaw,
      'groq-repair',
      expect.any(AbortSignal),
    );
    expect(cerebras.repairJson).toHaveBeenCalledOnce();
    expect(result.provider_used).toBe('cerebras');
    expect(result.model_used).toBe('cerebras-repair');
    expect(result.fallback_used).toBe(true);
    expect(result.degraded_mode).toBe(true);
  });

  it('returns a review-required safe fallback when all providers fail', async () => {
    const ninearm = provider({
      name: 'ninearm',
      supportsImageInput: true,
      imageModels: ['ninearm-primary'],
      imageError: new Error('failed'),
    });
    const gemini = provider({
      name: 'gemini',
      supportsImageInput: true,
      imageModels: ['gemini-primary'],
      imageError: new Error('failed'),
    });

    const result = await parseWithProviders(imageInput, [ninearm, gemini], {
      maxRetries: 0,
      retryBackoffMs: 0,
      now: () => new Date('2026-06-13T00:00:00.000Z'),
    });

    expect(result.receipt.parse_status).toBe('review_required');
    expect(result.receipt.date).toBe('2026-06-13');
    expect(result.provider_used).toBe('safe-fallback');
    expect(result.fallback_used).toBe(true);
    expect(result.degraded_mode).toBe(true);
  });
});

describe('parseReceiptImage', () => {
  it('defaults to deterministic mock mode when no provider mode is selected', async () => {
    vi.stubEnv('MOCK_AI_MODE', '');
    const cache: ParseCache = {
      get: vi.fn(),
      set: vi.fn(),
    };
    const providerCall = provider({
      name: 'gemini',
      supportsImageInput: true,
      imageModels: ['gemini-primary'],
      imageResult: JSON.stringify(validReceipt),
    });

    const result = await parseReceiptImage(imageInput, {
      providers: [providerCall],
      cache,
    });

    expect(result.provider_used).toBe('mock');
    expect(providerCall.parseImage).not.toHaveBeenCalled();
    expect(cache.get).not.toHaveBeenCalled();
  });

  it('returns cached data before calling providers', async () => {
    vi.stubEnv('MOCK_AI_MODE', 'false');
    const cachedReceipt = safeReceipt();
    const cache: ParseCache = {
      get: vi.fn().mockResolvedValue({
        receipt: cachedReceipt,
        provider_used: 'gemini',
        model_used: 'gemini-primary',
        fallback_used: true,
        cached: false,
        degraded_mode: false,
        attempts: [],
      }),
      set: vi.fn(),
    };
    const gemini = provider({
      name: 'gemini',
      supportsImageInput: true,
      imageModels: ['gemini-primary'],
      imageResult: JSON.stringify(validReceipt),
    });

    const result = await parseReceiptImage(imageInput, {
      providers: [gemini],
      cache,
      cacheEnabled: true,
    });

    expect(result.cached).toBe(true);
    expect(cache.get).toHaveBeenCalledOnce();
    expect(gemini.parseImage).not.toHaveBeenCalled();
  });

  it('ignores invalid cached receipts and calls the provider', async () => {
    vi.stubEnv('MOCK_AI_MODE', 'false');
    const cache: ParseCache = {
      get: vi.fn().mockResolvedValue({
        receipt: { ...safeReceipt(), date: 'not-a-date' },
        provider_used: 'gemini',
        model_used: 'gemini-primary',
        fallback_used: false,
        cached: false,
        degraded_mode: false,
        attempts: [],
      }),
      set: vi.fn(),
    };
    const gemini = provider({
      name: 'gemini',
      supportsImageInput: true,
      imageModels: ['gemini-primary'],
      imageResult: JSON.stringify(validReceipt),
    });

    const result = await parseReceiptImage(imageInput, {
      providers: [gemini],
      cache,
      cacheEnabled: true,
      maxRetries: 0,
    });

    expect(result.cached).toBe(false);
    expect(gemini.parseImage).toHaveBeenCalledOnce();
    expect(cache.set).toHaveBeenCalledOnce();
  });

  it('mock mode does not call providers or cache', async () => {
    vi.stubEnv('MOCK_AI_MODE', 'true');
    const cache: ParseCache = {
      get: vi.fn(),
      set: vi.fn(),
    };
    const ninearm = provider({
      name: 'ninearm',
      supportsImageInput: true,
      imageModels: ['ninearm-primary'],
      imageResult: JSON.stringify(validReceipt),
    });

    const result = await parseReceiptImage(imageInput, {
      providers: [ninearm],
      cache,
    });

    expect(result.provider_used).toBe('mock');
    expect(result.receipt.parse_status).toBe('parsed');
    expect(ninearm.parseImage).not.toHaveBeenCalled();
    expect(cache.get).not.toHaveBeenCalled();
    expect(cache.set).not.toHaveBeenCalled();
  });
});

const imageInput = {
  base64Image: 'receipt-image',
  mimeType: 'image/jpeg',
};

function provider(options: {
  name: ReceiptAiProvider['name'];
  supportsImageInput: boolean;
  imageModels?: string[];
  repairModel?: string;
  imageResult?: string;
  imageError?: Error;
  repairResult?: string;
  repairError?: Error;
}): ReceiptAiProvider {
  return {
    name: options.name,
    supportsImageInput: options.supportsImageInput,
    imageModels: options.imageModels ?? [],
    repairModel: options.repairModel,
    parseImage: vi.fn(async () => {
      if (options.imageError) {
        throw options.imageError;
      }
      return options.imageResult ?? '';
    }),
    repairJson: options.repairModel
      ? vi.fn(async () => {
          if (options.repairError) {
            throw options.repairError;
          }
          return options.repairResult ?? '';
        })
      : undefined,
  };
}

function safeReceipt(): ParsedReceipt {
  return {
    ...validReceipt,
    category: 'food',
    currency: 'THB',
    parse_status: 'parsed',
  };
}
