import { RECEIPT_PROMPT } from './prompt';
import type { ReceiptAiProvider, ReceiptImageInput } from './router';

interface ExternalOptions {
  name?: string;
  jsonMode?: boolean;
  apiKey: string;
  baseUrl: string;
  chatPath: string;
  supportsImageInput: boolean;
  imageModels: string[];
  repairModel?: string;
}

export function getConfiguredProviders(): ReceiptAiProvider[] {
  const providers: ReceiptAiProvider[] = [];
  const apiKey = process.env.EXTERNAL_AI_API_KEY?.trim();
  const baseUrl = process.env.EXTERNAL_AI_BASE_URL?.trim();
  const model = process.env.EXTERNAL_AI_MODEL?.trim();
  if (apiKey && baseUrl && model) {
    providers.push(
      createExternalProvider({
        name: baseUrl.includes('generativelanguage.googleapis.com') ? 'gemini' : 'external',
        apiKey,
        baseUrl,
        chatPath:
          process.env.EXTERNAL_AI_CHAT_PATH?.trim() || '/v1/chat/completions',
        supportsImageInput: booleanEnvironment(
          process.env.EXTERNAL_AI_SUPPORTS_IMAGE_INPUT,
          true,
        ),
        imageModels: uniqueModels([
          model,
          process.env.EXTERNAL_AI_FALLBACK_MODEL ?? '',
        ]),
        repairModel: process.env.EXTERNAL_AI_JSON_REPAIR_MODEL?.trim() || model,
      }),
    );
  }

  // Groq is intentionally pinned to a documented vision model and host.
  // Never mix provider keys or send images to an arbitrary client URL.
  const groqKey = process.env.GROQ_API_KEY?.trim();
  if (groqKey) {
    providers.push(
      createExternalProvider({
        name: 'groq',
        apiKey: groqKey,
        baseUrl: 'https://api.groq.com/openai/v1',
        chatPath: '/chat/completions',
        supportsImageInput: true,
        imageModels: ['qwen/qwen3.8-27b'],
        jsonMode: true,
      }),
    );
  }

  return process.env.AI_PROVIDER_PRIORITY === 'groq'
    ? providers.reverse()
    : providers;
}

function createExternalProvider(options: ExternalOptions): ReceiptAiProvider {
  return {
    name: options.name ?? 'external',
    supportsImageInput: options.supportsImageInput,
    imageModels: options.imageModels,
    repairModel: options.repairModel,
    async parseImage(input, model, signal) {
      if (!options.supportsImageInput) {
        throw new Error('External image input is disabled.');
      }
      return requestExternal(
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
          requestExternal(
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

async function requestExternal(
  options: ExternalOptions,
  model: string,
  messages: unknown[],
  signal: AbortSignal,
) {
  const response = await fetch(
    `${options.baseUrl.replace(/\/+$/, '')}${normalizePath(options.chatPath)}`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${options.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        // Gemini 3.8 uses thinking by default. A low reasoning budget and
        // enough output room avoid truncating JSON during extraction.
        ...(options.name === 'gemini'
          ? { reasoning_effort: 'low', max_tokens: 4096 }
          : { temperature: 0, max_tokens: 1600 }),
        messages,
        ...(options.jsonMode ? { response_format: { type: 'json_object' } } : {}),
      }),
      signal,
    },
  );

  if (!response.ok) {
    throw new Error(`External inference returned HTTP ${response.status}.`);
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
    throw new Error('External inference returned an empty response.');
  }
  return text;
}

function normalizePath(value: string) {
  return value.startsWith('/') ? value : `/${value}`;
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

export type { ReceiptImageInput };
