import { GoogleGenAI } from '@google/genai';
import { RECEIPT_PROMPT, RECEIPT_RESPONSE_SCHEMA } from './prompt';
import type {
  AiProviderName,
  ReceiptAiProvider,
  ReceiptImageInput,
} from './router';

const DEFAULT_PRIORITY: AiProviderName[] = [
  'ninearm',
  'gemini',
  'groq',
  'cerebras',
];

interface OpenAiCompatibleOptions {
  name: Exclude<AiProviderName, 'gemini'>;
  apiKey: string;
  baseUrl: string;
  supportsImageInput: boolean;
  imageModels: string[];
  repairModel?: string;
  completionTokenField?: 'max_tokens' | 'max_completion_tokens';
}

export function getConfiguredProviders(): ReceiptAiProvider[] {
  const factories: Record<AiProviderName, () => ReceiptAiProvider | null> = {
    ninearm: createNinearmProvider,
    gemini: createGeminiProvider,
    groq: createGroqProvider,
    cerebras: createCerebrasProvider,
  };

  return providerPriority().flatMap((name) => {
    const provider = factories[name]();
    return provider ? [provider] : [];
  });
}

function createNinearmProvider() {
  const apiKey = process.env.NINEARM_API_KEY;
  if (!apiKey) {
    return null;
  }

  return createOpenAiCompatibleProvider({
    name: 'ninearm',
    apiKey,
    baseUrl: process.env.NINEARM_BASE_URL ?? 'https://gateway.9arm.co/v1',
    supportsImageInput: booleanEnvironment(
      process.env.NINEARM_SUPPORTS_IMAGE_INPUT,
      false,
    ),
    imageModels: uniqueModels([
      process.env.NINEARM_RECEIPT_MODEL ?? 'qwen3.6-35b-a3b',
      process.env.NINEARM_FALLBACK_MODEL ?? 'qwen3.6-35b-a3b',
    ]),
  });
}

function createGeminiProvider() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return null;
  }

  const supportsImageInput = booleanEnvironment(
    process.env.GEMINI_SUPPORTS_IMAGE_INPUT,
    true,
  );
  const imageModels = uniqueModels([
    process.env.GEMINI_RECEIPT_MODEL ?? 'gemini-2.5-flash',
    process.env.GEMINI_RECEIPT_FALLBACK_MODEL ?? 'gemini-2.5-flash-lite',
  ]);

  return {
    name: 'gemini',
    supportsImageInput,
    imageModels,
    async parseImage(
      input: ReceiptImageInput,
      model: string,
      signal: AbortSignal,
    ) {
      if (!supportsImageInput) {
        throw new Error('Gemini image input is disabled.');
      }

      const baseUrl = process.env.GEMINI_BASE_URL?.trim();
      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          ...(baseUrl ? { baseUrl } : {}),
          timeout: timeoutMs(),
        },
      });
      const response = await ai.models.generateContent({
        model,
        contents: [
          {
            role: 'user',
            parts: [
              { text: RECEIPT_PROMPT },
              {
                inlineData: {
                  data: input.base64Image,
                  mimeType: input.mimeType,
                },
              },
            ],
          },
        ],
        config: {
          temperature: 0,
          responseMimeType: 'application/json',
          responseJsonSchema: RECEIPT_RESPONSE_SCHEMA,
          abortSignal: signal,
        },
      });

      if (!response.text) {
        throw new Error(`Gemini ${model} returned an empty response.`);
      }
      return response.text;
    },
  } satisfies ReceiptAiProvider;
}

function createGroqProvider() {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return null;
  }

  return createOpenAiCompatibleProvider({
    name: 'groq',
    apiKey,
    baseUrl: process.env.GROQ_BASE_URL ?? 'https://api.groq.com/openai/v1',
    supportsImageInput: booleanEnvironment(
      process.env.GROQ_SUPPORTS_IMAGE_INPUT,
      false,
    ),
    imageModels: uniqueModels([
      process.env.GROQ_RECEIPT_FALLBACK_MODEL ?? 'qwen/qwen3-32b',
    ]),
    repairModel:
      process.env.GROQ_JSON_REPAIR_MODEL ?? 'llama-3.1-8b-instant',
  });
}

function createCerebrasProvider() {
  const apiKey = process.env.CEREBRAS_API_KEY;
  if (!apiKey) {
    return null;
  }

  const model =
    process.env.CEREBRAS_RECEIPT_FALLBACK_MODEL ?? 'gpt-oss-120b';
  return createOpenAiCompatibleProvider({
    name: 'cerebras',
    apiKey,
    baseUrl:
      process.env.CEREBRAS_BASE_URL ?? 'https://api.cerebras.ai/v1',
    supportsImageInput: booleanEnvironment(
      process.env.CEREBRAS_SUPPORTS_IMAGE_INPUT,
      false,
    ),
    imageModels: [model],
    repairModel: model,
    completionTokenField: 'max_completion_tokens',
  });
}

function createOpenAiCompatibleProvider(
  options: OpenAiCompatibleOptions,
): ReceiptAiProvider {
  return {
    name: options.name,
    supportsImageInput: options.supportsImageInput,
    imageModels: options.imageModels,
    repairModel: options.repairModel,
    async parseImage(input, model, signal) {
      if (!options.supportsImageInput) {
        throw new Error(`${options.name} image input is disabled.`);
      }

      return requestOpenAiCompatible(
        options,
        model,
        [
          {
            role: 'user',
            content: [
              { type: 'text', text: RECEIPT_PROMPT },
              {
                type: 'image_url',
                image_url: {
                  url: `data:${input.mimeType};base64,${input.base64Image}`,
                },
              },
            ],
          },
        ],
        signal,
      );
    },
    repairJson: options.repairModel
      ? (raw, model, signal) =>
          requestOpenAiCompatible(
            options,
            model,
            [
              {
                role: 'user',
                content: `${RECEIPT_PROMPT}\n\nRepair the following model output into the required JSON shape. Do not invent receipt values. Return JSON only.\n\n${raw}`,
              },
            ],
            signal,
          )
      : undefined,
  };
}

async function requestOpenAiCompatible(
  options: OpenAiCompatibleOptions,
  model: string,
  messages: unknown[],
  signal: AbortSignal,
) {
  const tokenField = options.completionTokenField ?? 'max_tokens';
  const response = await fetch(
    `${options.baseUrl.replace(/\/+$/, '')}/chat/completions`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${options.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        temperature: 0,
        [tokenField]: 1600,
        messages,
      }),
      signal,
    },
  );

  if (!response.ok) {
    throw new Error(`${options.name} returned HTTP ${response.status}.`);
  }

  const result = (await response.json()) as {
    choices?: Array<{
      message?: {
        content?: string | Array<{ type?: string; text?: string }>;
      };
    }>;
  };
  const content = result.choices?.[0]?.message?.content;
  const text = Array.isArray(content)
    ? content.map((part) => part.text ?? '').join('')
    : content;
  if (!text) {
    throw new Error(`${options.name} returned an empty response.`);
  }
  return text;
}

function providerPriority() {
  const requested = (
    process.env.AI_PROVIDER_PRIORITY ?? DEFAULT_PRIORITY.join(',')
  )
    .split(',')
    .map((name) => name.trim().toLowerCase())
    .filter((name): name is AiProviderName =>
      DEFAULT_PRIORITY.includes(name as AiProviderName),
    );

  return [...new Set(requested)];
}

function uniqueModels(models: string[]) {
  return [...new Set(models.map((model) => model.trim()).filter(Boolean))];
}

function booleanEnvironment(value: string | undefined, fallback: boolean) {
  if (value === undefined) {
    return fallback;
  }
  return value.trim().toLowerCase() === 'true';
}

function timeoutMs() {
  return Math.max(1, Number(process.env.AI_TIMEOUT_SECONDS ?? 30)) * 1000;
}
