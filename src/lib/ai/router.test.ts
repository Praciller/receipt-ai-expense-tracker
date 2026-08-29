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

const imageInput = {
  base64Image: 'receipt-image',
  mimeType: 'image/jpeg',
};

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('parseWithProviders', () => {
  it('uses the first image-capable route', async () => {
    const primary = provider({
      name: 'primary',
      supportsImageInput: true,
      imageModels: ['primary-model'],
      imageResult: JSON.stringify(validReceipt),
    });
    const fallback = provider({
      name: 'fallback',
      supportsImageInput: true,
      imageModels: ['fallback-model'],
      imageResult: JSON.stringify(validReceipt),
    });

    const result = await parseWithProviders(imageInput, [primary, fallback], {
      maxRetries: 1,
      retryBackoffMs: 0,
    });

    expect(result.provider_used).toBe('primary');
    expect(result.model_used).toBe('primary-model');
    expect(result.fallback_used).toBe(false);
    expect(primary.parseImage).toHaveBeenCalledOnce();
    expect(fallback.parseImage).not.toHaveBeenCalled();
  });

  it('skips a route that cannot accept image input', async () => {
    const primary = provider({
      name: 'primary',
      supportsImageInput: false,
      imageModels: ['primary-model'],
      imageResult: JSON.stringify(validReceipt),
    });
    const fallback = provider({
      name: 'fallback',
      supportsImageInput: true,
      imageModels: ['fallback-model'],
      imageResult: JSON.stringify(validReceipt),
    });

    const result = await parseWithProviders(imageInput, [primary, fallback], {
      maxRetries: 1,
      retryBackoffMs: 0,
    });

    expect(result.provider_used).toBe('fallback');
    expect(result.fallback_used).toBe(true);
    expect(primary.parseImage).not.toHaveBeenCalled();
    expect(fallback.parseImage).toHaveBeenCalledOnce();
    expect(result.attempts).toContainEqual(
      expect.objectContaining({
        provider: 'primary',
        task: 'image',
        outcome: 'skipped',
      }),
    );
  });

  it('retries the primary route before using the fallback', async () => {
    const sleep = vi.fn().mockResolvedValue(undefined);
    const primary = provider({
      name: 'primary',
      supportsImageInput: true,
      imageModels: ['primary-model'],
      imageError: new Error('endpoint unavailable'),
    });
    const fallback = provider({
      name: 'fallback',
      supportsImageInput: true,
      imageModels: ['fallback-model'],
      imageResult: JSON.stringify(validReceipt),
    });

    const result = await parseWithProviders(imageInput, [primary, fallback], {
      maxRetries: 1,
      retryBackoffMs: 2000,
      sleep,
    });

    expect(primary.parseImage).toHaveBeenCalledTimes(2);
    expect(sleep).toHaveBeenCalledOnce();
    expect(fallback.parseImage).toHaveBeenCalledOnce();
    expect(result.provider_used).toBe('fallback');
    expect(result.fallback_used).toBe(true);
  });

  it('can repair invalid JSON through a later route', async () => {
    const invalidRaw = '{"shop_name":"broken"}';
    const imageRoute = provider({
      name: 'image-route',
      supportsImageInput: true,
      imageModels: ['image-model'],
      imageResult: invalidRaw,
    });
    const repairRoute = provider({
      name: 'repair-route',
      supportsImageInput: false,
      repairModel: 'repair-model',
      repairResult: JSON.stringify(validReceipt),
    });

    const result = await parseWithProviders(
      imageInput,
      [imageRoute, repairRoute],
      { maxRetries: 0, retryBackoffMs: 0 },
    );

    expect(repairRoute.repairJson).toHaveBeenCalledOnce();
    expect(result.provider_used).toBe('repair-route');
    expect(result.model_used).toBe('repair-model');
    expect(result.fallback_used).toBe(true);
    expect(result.degraded_mode).toBe(true);
  });

  it('returns a review-required safe fallback when all routes fail', async () => {
    const primary = provider({
      name: 'primary',
      supportsImageInput: true,
      imageModels: ['primary-model'],
      imageError: new Error('failed'),
    });

    const result = await parseWithProviders(imageInput, [primary], {
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
  it('defaults to deterministic mock mode', async () => {
    vi.stubEnv('MOCK_AI_MODE', '');
    const cache: ParseCache = { get: vi.fn(), set: vi.fn() };
    const external = provider({
      name: 'external',
      supportsImageInput: true,
      imageModels: ['external-model'],
      imageResult: JSON.stringify(validReceipt),
    });

    const result = await parseReceiptImage(imageInput, {
      providers: [external],
      cache,
    });

    expect(result.provider_used).toBe('mock');
    expect(external.parseImage).not.toHaveBeenCalled();
    expect(cache.get).not.toHaveBeenCalled();
  });

  it('returns valid cached data before calling external inference', async () => {
    vi.stubEnv('MOCK_AI_MODE', 'false');
    const cache: ParseCache = {
      get: vi.fn().mockResolvedValue({
        receipt: safeReceipt(),
        provider_used: 'external',
        model_used: 'external-model',
        fallback_used: false,
        cached: false,
        degraded_mode: false,
        attempts: [],
      }),
      set: vi.fn(),
    };
    const external = provider({
      name: 'external',
      supportsImageInput: true,
      imageModels: ['external-model'],
      imageResult: JSON.stringify(validReceipt),
    });

    const result = await parseReceiptImage(imageInput, {
      providers: [external],
      cache,
      cacheEnabled: true,
    });

    expect(result.cached).toBe(true);
    expect(external.parseImage).not.toHaveBeenCalled();
  });

  it('ignores invalid cached data and calls the configured route', async () => {
    vi.stubEnv('MOCK_AI_MODE', 'false');
    const cache: ParseCache = {
      get: vi.fn().mockResolvedValue({
        receipt: { ...safeReceipt(), date: 'not-a-date' },
        provider_used: 'external',
        model_used: 'external-model',
        fallback_used: false,
        cached: false,
        degraded_mode: false,
        attempts: [],
      }),
      set: vi.fn(),
    };
    const external = provider({
      name: 'external',
      supportsImageInput: true,
      imageModels: ['external-model'],
      imageResult: JSON.stringify(validReceipt),
    });

    const result = await parseReceiptImage(imageInput, {
      providers: [external],
      cache,
      cacheEnabled: true,
      maxRetries: 0,
    });

    expect(result.cached).toBe(false);
    expect(external.parseImage).toHaveBeenCalledOnce();
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
    expect(result.receipt.reconciliation_status).toBe('reconciled');
    expect(result.receipt.item_mismatch_count).toBe(0);
    expect(result.receipt.reconciliation_warnings).toEqual([]);
    expect(ninearm.parseImage).not.toHaveBeenCalled();
    expect(cache.get).not.toHaveBeenCalled();
    expect(cache.set).not.toHaveBeenCalled();
  });
});

function provider(options: {
  name: string;
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
      if (options.imageError) throw options.imageError;
      return options.imageResult ?? '';
    }),
    repairJson: options.repairModel
      ? vi.fn(async () => {
          if (options.repairError) throw options.repairError;
          return options.repairResult ?? '';
        })
      : undefined,
  };
}

function safeReceipt(): ParsedReceipt {
  return {
    ...validReceipt,
    raw_date_text: '2025-06-13',
    date_normalization: {
      calendar: 'gregorian',
      original_year: 2025,
      converted: false,
    },
    subtotal: null,
    tax_amount: null,
    discount: null,
    service_charge: null,
    warnings: [],
    evidence: [],
    reconciliation_status: 'reconciled',
    item_reconciliation: [],
    item_mismatch_count: 0,
    item_total_delta: 0,
    receipt_total_delta: 0,
    reconciliation_warnings: [],
    category: 'food',
    currency: 'THB',
    parse_status: 'parsed',
  };
}
