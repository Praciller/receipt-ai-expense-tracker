import { NextRequest, NextResponse } from 'next/server';
import {
  parseReceiptImage,
  ReceiptParseError,
} from '@/lib/ai/router';
import { getConfiguredProviders } from '@/lib/ai/providers';
import { summarizeProviderFailures } from '@/lib/ai/provider-diagnostics';

const ALLOWED_IMAGE_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
]);

export async function POST(request: NextRequest) {
  try {
    if (process.env.NODE_ENV === 'production') {
      const ready = getConfiguredProviders().some(
        (provider) => provider.supportsImageInput && provider.imageModels.length > 0,
      );
      if (!ready) {
        return NextResponse.json(
          { error: 'Live receipt extraction is unavailable. The service administrator must configure an image-capable provider before uploads can be processed.' },
          { status: 503 },
        );
      }
    }
    const image = await readReceiptImage(request);
    if (!ALLOWED_IMAGE_TYPES.has(image.mimeType)) {
      return NextResponse.json(
        { error: 'Use a JPG, PNG, or WebP receipt image.' },
        { status: 415 },
      );
    }

    const maxBytes =
      Math.max(1, Number(process.env.MAX_RECEIPT_IMAGE_MB ?? 5)) * 1024 * 1024;
    if (image.byteLength > maxBytes) {
      return NextResponse.json(
        {
          error: `Receipt image exceeds the ${process.env.MAX_RECEIPT_IMAGE_MB ?? 5} MB limit.`,
        },
        { status: 413 },
      );
    }

    const result = await parseReceiptImage({
      base64Image: image.base64Image,
      mimeType: image.mimeType,
    });

    if (process.env.NODE_ENV === 'production' && result.fallback_used) {
      // Runtime-only diagnostics: never log image bytes, receipt fields, or
      // upstream error text, which can contain sensitive customer data.
      console.warn(
        '[receipt-ai] provider fallback',
        JSON.stringify(summarizeProviderFailures(result.attempts)),
      );
    }

    const responseBody: Record<string, unknown> = {
      receipt: result.receipt,
      cached: result.cached,
    };
    if (process.env.NODE_ENV === 'production' || process.env.RETURN_PROVIDER_METADATA !== 'false') {
      Object.assign(responseBody, {
        provider_used: result.provider_used,
        model_used: result.model_used,
        fallback_used: result.fallback_used,
        degraded_mode: result.degraded_mode,
      });
    }

    return NextResponse.json(responseBody);
  } catch (error) {
    if (error instanceof ReceiptParseError) {
      return NextResponse.json(
        {
          error: process.env.NODE_ENV === 'production'
            ? 'Live receipt extraction is temporarily unavailable. Please try again later or contact the service administrator.'
            : error.message,
          parse_status: 'review_required',
        },
        { status: process.env.NODE_ENV === 'production' ? 503 : 422 },
      );
    }

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Failed to process receipt image.',
      },
      { status: 400 },
    );
  }
}

async function readReceiptImage(request: NextRequest) {
  const contentType = request.headers.get('content-type') ?? '';

  if (contentType.includes('multipart/form-data')) {
    const formData = await request.formData();
    const file = formData.get('file');
    if (
      !file ||
      typeof file === 'string' ||
      typeof file.arrayBuffer !== 'function'
    ) {
      throw new TypeError('Receipt image file is required.');
    }

    const bytes = Buffer.from(await file.arrayBuffer());
    return {
      base64Image: bytes.toString('base64'),
      mimeType: file.type,
      byteLength: bytes.byteLength,
    };
  }

  const body = (await request.json()) as {
    image?: string;
    mimeType?: string;
  };
  if (!body.image || !body.mimeType) {
    throw new TypeError('Image and mimeType are required.');
  }

  const bytes = Buffer.from(body.image, 'base64');
  return {
    base64Image: body.image,
    mimeType: body.mimeType,
    byteLength: bytes.byteLength,
  };
}
