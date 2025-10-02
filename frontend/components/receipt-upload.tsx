"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Upload, FileText, DollarSign, Calendar, MapPin } from "lucide-react";

export function ReceiptUpload() {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setResult(null);
      setError(null);
      setProgress(0);
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setUploading(true);
    setProgress(0);

    // Simulate upload progress
    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 90) {
          clearInterval(progressInterval);
          return 90;
        }
        return prev + 10;
      });
    }, 200);

    try {
      const formData = new FormData();
      formData.append("file", file);

      // Use environment variable for API URL, fallback to Render
      const apiUrl =
        process.env.NEXT_PUBLIC_API_URL ||
        "https://receipt-ai-expense-tracker.onrender.com";

      const response = await fetch(`${apiUrl}/process-receipt`, {
        method: "POST",
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        console.log("API Response:", data); // Debug log

        // Transform backend response to frontend format
        const transformedResult = {
          merchant: data.merchant_name || "Unknown Store",
          total: data.total_amount || 0,
          date: data.transaction_date || new Date().toISOString().split("T")[0],
          category: data.category || "Other",
          confidence: data.confidence || 0,
          items:
            data.items?.map((item: any) => ({
              name: item.name || "Unknown Item",
              price: item.total_price || item.unit_price || 0,
              quantity: item.quantity || 1,
            })) || [],
          // Additional details from backend
          currency: data.currency || "USD",
          subtotal: data.subtotal || 0,
          tax: data.tax_amount || 0,
          tip: data.tip_amount || 0,
          processing_metadata: data.processing_metadata,
          extraction_notes: data.extraction_notes,
        };

        setResult(transformedResult);
        setProgress(100);
        setError(null); // Clear any previous errors

        // Save to localStorage for analytics
        try {
          const existingReceipts = localStorage.getItem("receipts");
          const receipts = existingReceipts ? JSON.parse(existingReceipts) : [];

          // Add new receipt with timestamp
          receipts.push({
            merchant: transformedResult.merchant,
            total: transformedResult.total,
            date: transformedResult.date,
            category: transformedResult.category,
            confidence: transformedResult.confidence,
            timestamp: Date.now(),
          });

          localStorage.setItem("receipts", JSON.stringify(receipts));
        } catch (storageError) {
          console.error(
            "Failed to save receipt to localStorage:",
            storageError
          );
          // Don't fail the upload if storage fails
        }
      } else {
        const errorText = await response.text();
        console.error("API Error:", response.status, errorText);
        setError(`Processing failed: ${response.status} - ${errorText}`);
        setProgress(0);
      }
    } catch (error) {
      console.error("Upload failed:", error);
      setError(
        `Network error: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
      setProgress(0);
    } finally {
      setUploading(false);
      clearInterval(progressInterval);
    }
  };

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Upload Receipt
          </CardTitle>
          <CardDescription>
            Upload a receipt image to extract expense information using AI
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid w-full max-w-sm items-center gap-1.5">
            <Input
              id="receipt"
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              disabled={uploading}
            />
          </div>

          {file && (
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <FileText className="h-4 w-4" />
              {file.name}
            </div>
          )}

          {uploading && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                  Processing receipt with AI...
                </span>
                <span className="font-medium">{progress}%</span>
              </div>
              <Progress value={progress} className="w-full" />
              <p className="text-xs text-gray-500 text-center">
                This may take a few seconds while our AI analyzes your receipt
              </p>
            </div>
          )}

          <Button
            onClick={handleUpload}
            disabled={!file || uploading}
            className="w-full"
          >
            {uploading ? "Processing..." : "Upload & Process"}
          </Button>
        </CardContent>
      </Card>

      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="text-red-800 flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Processing Error
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-red-700">{error}</p>
            <Button
              onClick={() => setError(null)}
              variant="outline"
              className="mt-3"
            >
              Try Again
            </Button>
          </CardContent>
        </Card>
      )}

      {result && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Extracted Information
            </CardTitle>
            <CardDescription>
              AI-extracted data from your receipt
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3">
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-gray-500" />
                <span className="font-medium">Merchant:</span>
                <span>{result.merchant}</span>
              </div>

              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-gray-500" />
                <span className="font-medium">Total:</span>
                <span className="font-bold text-green-600">
                  ${result.total}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-gray-500" />
                <span className="font-medium">Date:</span>
                <span>{result.date}</span>
              </div>

              {result.category && (
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-gray-500" />
                  <span className="font-medium">Category:</span>
                  <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-md text-sm">
                    {result.category}
                  </span>
                </div>
              )}

              {result.confidence && (
                <div className="flex items-center gap-2">
                  <span className="font-medium">Confidence:</span>
                  <div className="flex items-center gap-2">
                    <Progress
                      value={result.confidence * 100}
                      className="w-20"
                    />
                    <span className="text-sm text-gray-600">
                      {Math.round(result.confidence * 100)}%
                    </span>
                  </div>
                </div>
              )}
            </div>

            {result.items && result.items.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-medium">Items:</h4>
                <div className="space-y-2">
                  {result.items.map((item: any, index: number) => (
                    <div
                      key={index}
                      className="flex justify-between items-center p-2 bg-gray-50 rounded-md"
                    >
                      <div className="flex-1">
                        <span className="font-medium">{item.name}</span>
                        {item.quantity > 1 && (
                          <span className="text-sm text-gray-600 ml-2">
                            (x{item.quantity})
                          </span>
                        )}
                      </div>
                      <span className="font-semibold">
                        ${item.price.toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {(result.subtotal || result.tax || result.tip) && (
              <div className="space-y-1 pt-2 border-t">
                <h4 className="font-medium text-sm text-gray-600">
                  Breakdown:
                </h4>
                {result.subtotal > 0 && (
                  <div className="flex justify-between text-sm">
                    <span>Subtotal:</span>
                    <span>${result.subtotal.toFixed(2)}</span>
                  </div>
                )}
                {result.tax > 0 && (
                  <div className="flex justify-between text-sm">
                    <span>Tax:</span>
                    <span>${result.tax.toFixed(2)}</span>
                  </div>
                )}
                {result.tip > 0 && (
                  <div className="flex justify-between text-sm">
                    <span>Tip:</span>
                    <span>${result.tip.toFixed(2)}</span>
                  </div>
                )}
              </div>
            )}

            <Button className="w-full" variant="outline">
              Save to Expenses
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
