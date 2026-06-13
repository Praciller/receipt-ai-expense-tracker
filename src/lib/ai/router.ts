import { createHash } from 'node:crypto';
import type { ParsedReceipt } from '../receipt';
import {
  parseReceiptJson,
  validateAndNormalizeReceipt,
} from '../receipt';
import { getFileParseCache } from './cache';
import { RECEIPT_PROMPT } from './prompt';
import { getConfiguredProviders } from './providers';

export type AiProviderName = 'ninearm' | 'gemini' | 'groq' | 'cerebras';

export interface ReceiptImageInput {
  base64Image: string;
  mimeType: string;
}

export interface ReceiptAiProvider {
  name: AiProviderName;
  supportsImageInput: boolean;
  imageModels: string[];
  repairModel?: string;
  parseImage(
    input: ReceiptImageInput,
    model: string,
    signal: AbortSignal,
  ): Promise<string>;
  repairJson?(
    raw: string,
    model: string,
    signal: AbortSignal,
  ): Promise<string>;
}

export interface ProviderAttempt {
  provider: string;
  model: string;
  task: 'image' | 'json_repair';
  attempt: number;
  outcome: 'skipped' | 'failed' | 'invalid' | 'success';
  error?: string;
}

export interface ParsedReceiptResult {
  receipt: ParsedReceipt;
  provider_used: string;
  model_used: string;
  fallback_used: boolean;
  cached: boolean;
  degraded_mode: boolean;
  attempts: ProviderAttempt[];
}

export interface ParseCache {
  get(key: string): Promise<ParsedReceiptResult | null>;
  set(
    key: string,
    value: ParsedReceiptResult,
    ttlSeconds: number,
  ): Promise<void>;
}

interface RouterOptions {
  maxRetries?: number;
  retryBackoffMs?: number;
  timeoutMs?: number;
  safeFallback?: boolean;
  now?: () => Date;
  sleep?: (milliseconds: number) => Promise<void>;
}

interface ParseReceiptImageOptions extends RouterOptions {
  providers?: ReceiptAiProvider[];
  cache?: ParseCache;
  cacheEnabled?: boolean;
}

const defaultSleep = (milliseconds: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, milliseconds));

export async function parseWithProviders(
  input: ReceiptImageInput,
  providers: ReceiptAiProvider[],
  options: RouterOptions = {},
): Promise<ParsedReceiptResult> {
  const attempts: ProviderAttempt[] = [];
  const maxRetries = clampInteger(
    options.maxRetries ?? Number(process.env.AI_MAX_RETRIES ?? 1),
    0,
    3,
  );
  const retryBackoffMs = Math.max(
    0,
    options.retryBackoffMs ??
      Number(process.env.AI_RETRY_BACKOFF_SECONDS ?? 2) * 1000,
  );
  const timeoutMs = Math.max(
    1000,
    options.timeoutMs ?? Number(process.env.AI_TIMEOUT_SECONDS ?? 30) * 1000,
  );
  const sleep = options.sleep ?? defaultSleep;
  let invalidRaw: string | null = null;

  for (const [providerIndex, provider] of providers.entries()) {
    if (!provider.supportsImageInput || !provider.imageModels.length) {
      attempts.push({
        provider: provider.name,
        model: provider.imageModels[0] ?? 'not-configured',
        task: 'image',
        attempt: 0,
        outcome: 'skipped',
        error: 'Provider is not configured for image input.',
      });
      continue;
    }

    for (const [modelIndex, model] of provider.imageModels.entries()) {
      for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
        try {
          const raw = await provider.parseImage(
            input,
            model,
            AbortSignal.timeout(timeoutMs),
          );
          const parsed = parseReceiptJson(raw);
          if (parsed.success) {
            attempts.push({
              provider: provider.name,
              model,
              task: 'image',
              attempt: attempt + 1,
              outcome: 'success',
            });
            return {
              receipt: parsed.data,
              provider_used: provider.name,
              model_used: model,
              fallback_used: providerIndex > 0 || modelIndex > 0,
              cached: false,
              degraded_mode: false,
              attempts,
            };
          }

          invalidRaw = raw;
          attempts.push({
            provider: provider.name,
            model,
            task: 'image',
            attempt: attempt + 1,
            outcome: 'invalid',
            error: parsed.error,
          });
        } catch (error) {
          attempts.push({
            provider: provider.name,
            model,
            task: 'image',
            attempt: attempt + 1,
            outcome: 'failed',
            error: errorMessage(error),
          });
        }

        if (attempt < maxRetries && retryBackoffMs > 0) {
          await sleep(retryBackoffMs);
        }
      }
    }
  }

  if (invalidRaw) {
    for (const provider of providers) {
      if (!provider.repairJson || !provider.repairModel) {
        continue;
      }

      for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
        try {
          const repairedRaw = await provider.repairJson(
            invalidRaw,
            provider.repairModel,
            AbortSignal.timeout(timeoutMs),
          );
          const repaired = parseReceiptJson(repairedRaw);
          if (repaired.success) {
            attempts.push({
              provider: provider.name,
              model: provider.repairModel,
              task: 'json_repair',
              attempt: attempt + 1,
              outcome: 'success',
            });
            return {
              receipt: repaired.data,
              provider_used: provider.name,
              model_used: provider.repairModel,
              fallback_used: true,
              cached: false,
              degraded_mode: true,
              attempts,
            };
          }

          attempts.push({
            provider: provider.name,
            model: provider.repairModel,
            task: 'json_repair',
            attempt: attempt + 1,
            outcome: 'invalid',
            error: repaired.error,
          });
        } catch (error) {
          attempts.push({
            provider: provider.name,
            model: provider.repairModel,
            task: 'json_repair',
            attempt: attempt + 1,
            outcome: 'failed',
            error: errorMessage(error),
          });
        }

        if (attempt < maxRetries && retryBackoffMs > 0) {
          await sleep(retryBackoffMs);
        }
      }
    }
  }

  if (options.safeFallback ?? process.env.ENABLE_SAFE_FALLBACK !== 'false') {
    return {
      receipt: createSafeFallbackReceipt(options.now?.() ?? new Date()),
      provider_used: 'safe-fallback',
      model_used: 'review-required',
      fallback_used: true,
      cached: false,
      degraded_mode: true,
      attempts,
    };
  }

  throw new ReceiptParseError(
    'No AI provider returned a valid receipt. Review the image manually.',
    attempts,
  );
}

export async function parseReceiptImage(
  input: ReceiptImageInput,
  options: ParseReceiptImageOptions = {},
): Promise<ParsedReceiptResult> {
  if (process.env.MOCK_AI_MODE === 'true') {
    return {
      receipt: createMockReceipt(),
      provider_used: 'mock',
      model_used: 'deterministic-fixture',
      fallback_used: false,
      cached: false,
      degraded_mode: false,
      attempts: [
        {
          provider: 'mock',
          model: 'deterministic-fixture',
          task: 'image',
          attempt: 1,
          outcome: 'success',
        },
      ],
    };
  }

  const providers = options.providers ?? getConfiguredProviders();
  const cacheEnabled =
    options.cacheEnabled ?? process.env.ENABLE_AI_PARSE_CACHE !== 'false';
  const cache =
    options.cache ??
    getFileParseCache(process.env.AI_PARSE_CACHE_DIR ?? '.cache/ai');
  const cacheKey = createCacheKey(input, providers);

  if (cacheEnabled) {
    try {
      const cached = await cache.get(cacheKey);
      if (cached) {
        const validated = validateAndNormalizeReceipt(cached.receipt);
        if (validated.success) {
          return {
            ...cached,
            receipt: validated.data,
            cached: true,
          };
        }
      }
    } catch {
      // Cache failure must not block receipt parsing.
    }
  }

  const result = await parseWithProviders(input, providers, options);
  if (cacheEnabled && result.provider_used !== 'safe-fallback') {
    const ttlSeconds = Math.max(
      1,
      Number(process.env.AI_PARSE_CACHE_TTL_SECONDS ?? 86400),
    );
    try {
      await cache.set(cacheKey, result, ttlSeconds);
    } catch {
      // Cache failure must not discard a valid provider result.
    }
  }

  return result;
}

function createCacheKey(
  input: ReceiptImageInput,
  providers: ReceiptAiProvider[],
) {
  const providerFingerprint = providers.map((provider) => ({
    name: provider.name,
    supportsImageInput: provider.supportsImageInput,
    imageModels: provider.imageModels,
    repairModel: provider.repairModel ?? null,
  }));

  return createHash('sha256')
    .update(RECEIPT_PROMPT)
    .update(JSON.stringify(providerFingerprint))
    .update(input.mimeType)
    .update(input.base64Image)
    .digest('hex');
}

function createSafeFallbackReceipt(now: Date): ParsedReceipt {
  return {
    shop_name: 'Review required',
    date: now.toISOString().slice(0, 10),
    items: [],
    total_amount: 0,
    tax_id: null,
    category: 'other',
    currency: 'THB',
    confidence: 0,
    notes:
      'AI providers could not produce a valid result. Replace placeholder values before saving.',
    parse_status: 'review_required',
  };
}

function createMockReceipt(): ParsedReceipt {
  return {
    shop_name: 'ร้านตัวอย่าง Portfolio Cafe',
    date: '2025-06-13',
    items: [
      {
        name: 'กาแฟเย็น',
        quantity: 1,
        unit_price: 85,
        total_price: 85,
      },
      {
        name: 'ขนมปัง',
        quantity: 1,
        unit_price: 45,
        total_price: 45,
      },
    ],
    total_amount: 130,
    tax_id: null,
    category: 'food',
    currency: 'THB',
    confidence: 0.91,
    notes: 'Mock AI result for local verification.',
    parse_status: 'parsed',
  };
}

function clampInteger(value: number, minimum: number, maximum: number) {
  if (!Number.isFinite(value)) {
    return minimum;
  }
  return Math.min(maximum, Math.max(minimum, Math.floor(value)));
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Unknown provider error';
}

export class ReceiptParseError extends Error {
  constructor(
    message: string,
    public readonly attempts: ProviderAttempt[],
  ) {
    super(message);
    this.name = 'ReceiptParseError';
  }
}
