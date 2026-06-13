'use client';

import Image from 'next/image';
import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { CheckCircle, Image as ImageIcon, Loader2, Upload } from 'lucide-react';
import type { ParsedReceipt } from '@/lib/receipt';
import { getReceiptRepository } from '@/lib/storage/get-receipt-repository';
import { ErrorState } from './error-state';
import { ParsedReceiptReview } from './parsed-receipt-review';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';

interface ReceiptUploadProps {
  onUploadSuccess?: () => void;
}

interface ParseResponse {
  receipt: ParsedReceipt;
  provider_used?: string;
  model_used?: string;
  fallback_used?: boolean;
  cached: boolean;
  degraded_mode?: boolean;
}

export function ReceiptUpload({ onUploadSuccess }: ReceiptUploadProps) {
  const [isParsing, setIsParsing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [preview, setPreview] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState('');
  const [imageMimeType, setImageMimeType] = useState('');
  const [parseResult, setParseResult] = useState<ParseResponse | null>(null);

  const processFile = useCallback(async (file: File) => {
    setIsParsing(true);
    setError('');
    setSuccess('');
    setParseResult(null);

    try {
      const dataUrl = await fileToBase64(file);
      const base64 = dataUrl.split(',')[1] ?? '';
      setPreview(dataUrl);
      setImageBase64(base64);
      setImageMimeType(file.type);

      const formData = new FormData();
      formData.append('file', file);
      const response = await fetch('/api/receipts/parse', {
        method: 'POST',
        body: formData,
      });
      const data = (await response.json()) as ParseResponse & { error?: string };
      if (!response.ok) {
        throw new Error(data.error ?? 'AI could not parse this receipt.');
      }

      setParseResult(data);
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : 'Failed to parse receipt.',
      );
    } finally {
      setIsParsing(false);
    }
  }, []);

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      const file = acceptedFiles[0];
      if (file) {
        void processFile(file);
      }
    },
    [processFile],
  );

  const onDropRejected = useCallback(() => {
    setError('Use one JPG, PNG, or WebP image within the configured size limit.');
  }, []);

  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    onDrop,
    onDropRejected,
    accept: {
      'image/jpeg': ['.jpeg', '.jpg'],
      'image/png': ['.png'],
      'image/webp': ['.webp'],
    },
    maxFiles: 1,
    maxSize: 5 * 1024 * 1024,
    disabled: isParsing || isSaving,
    noClick: true,
  });

  const saveReceipt = async () => {
    if (!parseResult) {
      return;
    }

    setIsSaving(true);
    setError('');
    try {
      const repository = await getReceiptRepository();
      await repository.create(parseResult.receipt, {
        base64: imageBase64,
        mimeType: imageMimeType,
      });

      setSuccess('Saved locally to expense history.');
      setParseResult(null);
      setPreview(null);
      setImageBase64('');
      onUploadSuccess?.();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Failed to save receipt.');
    } finally {
      setIsSaving(false);
    }
  };

  const reset = () => {
    setParseResult(null);
    setPreview(null);
    setImageBase64('');
    setImageMimeType('');
    setError('');
  };

  return (
    <Card className="w-full overflow-hidden">
      <CardHeader className="border-b border-slate-200 bg-slate-950 text-white">
        <CardTitle className="flex items-center gap-2 text-white">
          <Upload className="h-5 w-5" aria-hidden="true" />
          Parse a receipt
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-6">
        {parseResult ? (
          <ParsedReceiptReview
            receipt={parseResult.receipt}
            provider={parseResult.provider_used ?? 'ai'}
            model={parseResult.model_used ?? 'metadata-hidden'}
            isSaving={isSaving}
            onChange={(receipt) => setParseResult({ ...parseResult, receipt })}
            onSave={() => void saveReceipt()}
            onCancel={reset}
          />
        ) : (
          <div
            {...getRootProps()}
            className={`relative rounded-xl border border-dashed p-6 text-center transition-colors sm:p-10 ${
              isDragActive
                ? 'border-blue-500 bg-blue-50'
                : 'border-slate-300 bg-slate-50 hover:border-slate-400'
            } ${isParsing ? 'cursor-wait' : ''}`}
          >
            <input
              {...getInputProps({
                'aria-label': 'Receipt image',
              })}
            />
            {preview ? (
              <div className="relative mx-auto max-w-sm overflow-hidden rounded-lg bg-white">
                <Image
                  src={preview}
                  alt="Selected receipt preview"
                  width={640}
                  height={800}
                  unoptimized
                  className="max-h-72 w-full object-contain"
                />
                {isParsing && (
                  <div className="absolute inset-0 flex items-center justify-center bg-white/90">
                    <div role="status" className="text-center" aria-live="polite">
                      <Loader2
                        className="mx-auto h-8 w-8 animate-spin text-blue-700"
                        aria-hidden="true"
                      />
                      <p className="mt-3 text-sm font-medium text-slate-700">
                        Reading Thai and English receipt details…
                      </p>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center">
                <div className="rounded-full bg-white p-4 ring-1 ring-slate-200">
                  <ImageIcon
                    className="h-8 w-8 text-slate-500"
                    aria-hidden="true"
                  />
                </div>
                <p className="mt-4 text-lg font-semibold text-slate-900">
                  {isDragActive ? 'Drop the receipt here' : 'Add a receipt image'}
                </p>
                <p className="mt-1 max-w-md text-sm text-slate-600">
                  JPG, PNG, or WebP up to 5 MB. AI extracts fields, then you
                  review before anything is saved.
                </p>
                <Button
                  type="button"
                  variant="outline"
                  onClick={open}
                  disabled={isParsing}
                  className="mt-5 bg-white"
                >
                  Select image
                </Button>
              </div>
            )}
          </div>
        )}

        {error && <div className="mt-4"><ErrorState message={error} /></div>}
        {success && (
          <div
            role="status"
            className="mt-4 flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-emerald-900"
          >
            <CheckCircle className="h-5 w-5" aria-hidden="true" />
            <span>{success}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('Could not read the selected image.'));
    reader.readAsDataURL(file);
  });
}
