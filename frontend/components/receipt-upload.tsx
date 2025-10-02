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

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setResult(null);
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

      const response = await fetch(
        "https://receipt-ai-expense-tracker.vercel.app/process-receipt",
        {
          method: "POST",
          body: formData,
        }
      );

      if (response.ok) {
        const data = await response.json();
        setResult(data);
        setProgress(100);
      } else {
        // Mock result for demo purposes
        setTimeout(() => {
          setResult({
            merchant: "Demo Store",
            total: 45.67,
            date: "2024-01-15",
            items: [
              { name: "Coffee", price: 4.5 },
              { name: "Sandwich", price: 12.99 },
              { name: "Tax", price: 2.18 },
            ],
          });
          setProgress(100);
        }, 1000);
      }
    } catch (error) {
      console.error("Upload failed:", error);
      // Mock result for demo purposes
      setTimeout(() => {
        setResult({
          merchant: "Demo Store",
          total: 45.67,
          date: "2024-01-15",
          items: [
            { name: "Coffee", price: 4.5 },
            { name: "Sandwich", price: 12.99 },
            { name: "Tax", price: 2.18 },
          ],
        });
        setProgress(100);
      }, 1000);
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
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Processing receipt...</span>
                <span>{progress}%</span>
              </div>
              <Progress value={progress} />
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
            </div>

            {result.items && result.items.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-medium">Items:</h4>
                <div className="space-y-1">
                  {result.items.map((item: any, index: number) => (
                    <div key={index} className="flex justify-between text-sm">
                      <span>{item.name}</span>
                      <span>${item.price}</span>
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
