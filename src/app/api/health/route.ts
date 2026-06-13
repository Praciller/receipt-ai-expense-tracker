import { NextResponse } from 'next/server';
import { getConfiguredProviders } from '@/lib/ai/providers';

export function GET() {
  const providers = getConfiguredProviders();
  return NextResponse.json({
    ok: true,
    mock_ai_mode: process.env.MOCK_AI_MODE === 'true',
    provider_priority: providers.map((provider) => provider.name),
    image_providers: providers
      .filter((provider) => provider.supportsImageInput)
      .map((provider) => provider.name),
    repair_providers: providers
      .filter((provider) => provider.repairModel)
      .map((provider) => provider.name),
    cache_enabled: process.env.ENABLE_AI_PARSE_CACHE !== 'false',
    safe_fallback_enabled: process.env.ENABLE_SAFE_FALLBACK !== 'false',
    storage: process.env.NEXT_PUBLIC_STORAGE_MODE ?? 'indexeddb',
  });
}
