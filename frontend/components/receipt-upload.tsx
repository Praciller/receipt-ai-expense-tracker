"use client";

import { useState, useEffect } from "react";
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
import { Badge } from "@/components/ui/badge";
import {
  Upload,
  FileText,
  DollarSign,
  Calendar,
  MapPin,
  CheckCircle,
  AlertCircle,
  Wifi,
  WifiOff,
} from "lucide-react";
import { processReceipt, checkHealth } from "@/lib/api";

export function ReceiptUpload() {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<any>(null);
  const [backendHealthy, setBackendHealthy] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Check backend health on component mount
  useEffect(() => {
    const checkBackendHealth = async () => {
      try {
        const healthy = await checkHealth();
        setBackendHealthy(healthy);
      } catch (error) {
        setBackendHealthy(false);
      }
    };

    checkBackendHealth();
    // Check health every 30 seconds
    const interval = setInterval(checkBackendHealth, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setResult(null);
      setError(null);
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setUploading(true);
    setProgress(0);
    setError(null);

    // Simulate upload progress
    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 90) {
          clearInterval(progressInterval);
          return 90;
        }
        return prev + 10;
      });
    }, 300);

    try {
      // Use the new API
      const data = await processReceipt(file, true);

      clearInterval(progressInterval);
      setProgress(100);
      setResult(data);
    } catch (error) {
      clearInterval(progressInterval);
      console.error("Receipt processing failed:", error);

      const errorMessage =
        error instanceof Error ? error.message : "Unknown error occurred";
      setError(`Failed to process receipt: ${errorMessage}`);

      // Show fallback demo data if backend is unavailable
      if (!backendHealthy) {
        setResult({
          merchant_name: "Demo Store (Backend Offline)",
          total_amount: 45.67,
          transaction_date: "2024-01-15",
          category: "Food",
          confidence: 0.5,
          items: [
            { name: "Coffee", quantity: 1, unit_price: 4.5, total_price: 4.5 },
            {
              name: "Sandwich",
              quantity: 1,
              unit_price: 12.99,
              total_price: 12.99,
            },
          ],
          extraction_notes: "Demo data - backend unavailable",
        });
        setProgress(100);
      }
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Upload Receipt
            </div>
            <Badge
              variant={
                backendHealthy === true
                  ? "default"
                  : backendHealthy === false
                  ? "destructive"
                  : "secondary"
              }
            >
              {backendHealthy === true ? (
                <>
                  <Wifi className="h-3 w-3 mr-1" /> Online
                </>
              ) : backendHealthy === false ? (
                <>
                  <WifiOff className="h-3 w-3 mr-1" /> Offline
                </>
              ) : (
                <>Checking...</>
              )}
            </Badge>
          </CardTitle>
          <CardDescription>
            Upload a receipt image to extract expense information using AI
            {backendHealthy === false && (
              <span className="block text-orange-600 mt-1">
                Backend offline - showing demo data
              </span>
            )}
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
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Processing receipt...</span>
                <span>{progress}%</span>
              </div>
              <Progress value={progress} />
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-md">
              <AlertCircle className="h-4 w-4 text-red-500" />
              <span className="text-sm text-red-700">{error}</span>
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

      {result && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Extracted Information
              </div>
              {result.confidence && (
                <Badge
                  variant={
                    result.confidence > 0.8
                      ? "default"
                      : result.confidence > 0.6
                      ? "secondary"
                      : "outline"
                  }
                >
                  <CheckCircle className="h-3 w-3 mr-1" />
                  {Math.round(result.confidence * 100)}% confident
                </Badge>
              )}
            </CardTitle>
            <CardDescription>
              AI-extracted data from your receipt
              {result.extraction_notes && (
                <span className="block text-sm text-gray-500 mt-1">
                  {result.extraction_notes}
                </span>
              )}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3">
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-gray-500" />
                <span className="font-medium">Merchant:</span>
                <span>{result.merchant_name || result.merchant}</span>
              </div>

              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-gray-500" />
                <span className="font-medium">Total:</span>
                <span className="font-bold text-green-600">
                  ${result.total_amount || result.total}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-gray-500" />
                <span className="font-medium">Date:</span>
                <span>{result.transaction_date || result.date}</span>
              </div>

              {result.category && (
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-gray-500" />
                  <span className="font-medium">Category:</span>
                  <Badge variant="outline">{result.category}</Badge>
                </div>
              )}

              {result.currency && result.currency !== "USD" && (
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-gray-500" />
                  <span className="font-medium">Currency:</span>
                  <span>{result.currency}</span>
                </div>
              )}
            </div>

            {result.items && result.items.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-medium">Items:</h4>
                <div className="space-y-1">
                  {result.items.map((item: any, index: number) => (
                    <div key={index} className="flex justify-between text-sm">
                      <span>
                        {item.name} {item.quantity > 1 && `(x${item.quantity})`}
                      </span>
                      <span>${item.total_price || item.price}</span>
                    </div>
                  ))}
                </div>
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
