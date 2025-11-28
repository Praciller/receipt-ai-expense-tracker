'use client';

import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, Loader2, CheckCircle, XCircle, Image as ImageIcon } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';

interface ReceiptUploadProps {
  onUploadSuccess?: () => void;
}

export function ReceiptUpload({ onUploadSuccess }: ReceiptUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [preview, setPreview] = useState<string | null>(null);

  const processFile = async (file: File) => {
    setIsUploading(true);
    setUploadStatus('idle');
    setErrorMessage('');

    try {
      // Convert file to base64
      const base64 = await fileToBase64(file);
      const base64Data = base64.split(',')[1]; // Remove data:image/...;base64, prefix

      // Send to API
      const response = await fetch('/api/receipts/parse', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          image: base64Data,
          mimeType: file.type,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to process receipt');
      }

      setUploadStatus('success');
      setPreview(null);
      onUploadSuccess?.();

      // Reset after 3 seconds
      setTimeout(() => {
        setUploadStatus('idle');
      }, 3000);
    } catch (error) {
      console.error('Upload error:', error);
      setUploadStatus('error');
      setErrorMessage(error instanceof Error ? error.message : 'Failed to upload receipt');
    } finally {
      setIsUploading(false);
    }
  };

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (file) {
      // Show preview
      const reader = new FileReader();
      reader.onload = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(file);

      // Process file
      processFile(file);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.webp', '.heic', '.heif'],
    },
    maxFiles: 1,
    disabled: isUploading,
  });

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="h-5 w-5" />
          อัปโหลดใบเสร็จ
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div
          {...getRootProps()}
          className={`
            relative border-2 border-dashed rounded-xl p-8 text-center cursor-pointer
            transition-all duration-200 ease-in-out
            ${isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'}
            ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}
          `}
        >
          <input {...getInputProps()} />

          {preview ? (
            <div className="relative">
              <img
                src={preview}
                alt="Receipt preview"
                className="max-h-64 mx-auto rounded-lg shadow-md"
              />
              {isUploading && (
                <div className="absolute inset-0 flex items-center justify-center bg-white/80 rounded-lg">
                  <div className="flex flex-col items-center gap-2">
                    <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                    <span className="text-sm text-gray-600">กำลังวิเคราะห์ใบเสร็จ...</span>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center gap-4">
              <div className="p-4 bg-gray-100 rounded-full">
                <ImageIcon className="h-8 w-8 text-gray-400" />
              </div>
              <div>
                <p className="text-lg font-medium text-gray-700">
                  {isDragActive ? 'วางไฟล์ที่นี่' : 'ลากไฟล์มาวางที่นี่'}
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  หรือคลิกเพื่อเลือกไฟล์ (JPEG, PNG, WebP)
                </p>
              </div>
              <Button variant="outline" type="button" disabled={isUploading}>
                เลือกไฟล์
              </Button>
            </div>
          )}
        </div>

        {/* Status Messages */}
        {uploadStatus === 'success' && (
          <div className="mt-4 flex items-center gap-2 text-green-600 bg-green-50 p-3 rounded-lg">
            <CheckCircle className="h-5 w-5" />
            <span>อัปโหลดและวิเคราะห์ใบเสร็จสำเร็จ!</span>
          </div>
        )}

        {uploadStatus === 'error' && (
          <div className="mt-4 flex items-center gap-2 text-red-600 bg-red-50 p-3 rounded-lg">
            <XCircle className="h-5 w-5" />
            <span>{errorMessage}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
  });
}
