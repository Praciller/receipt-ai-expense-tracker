import { NextResponse } from 'next/server';
import { getConfiguredProviders } from '@/lib/ai/providers';

export function GET() {
  const providers = getConfiguredProviders();
  const imageProviders = providers.filter((provider) => provider.supportsImageInput && provider.imageModels.length > 0);
  const liveReady = imageProviders.length > 0;
  return NextResponse.json({
    ok: process.env.NODE_ENV !== 'production' || liveReady,
    live_ready: liveReady,
    readiness_message: liveReady
      ? 'Live image extraction is configured.'
      : 'Live extraction is unavailable. Configure a server-side image provider before uploading receipts.',
    mock_ai_mode: process.env.NODE_ENV !== 'production' && process.env.MOCK_AI_MODE === 'true',
    provider_priority: providers.map((provider) => provider.name),
    image_providers: imageProviders
      .map((provider) => provider.name),
    repair_providers: providers
      .filter((provider) => provider.repairModel)
      .map((provider) => provider.name),
    cache_enabled: process.env.ENABLE_AI_PARSE_CACHE !== 'false',
    safe_fallback_enabled: process.env.ENABLE_SAFE_FALLBACK !== 'false',
    storage: process.env.NEXT_PUBLIC_STORAGE_MODE ?? 'indexeddb',
  });
}
