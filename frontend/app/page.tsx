"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ReceiptUpload } from "@/components/receipt-upload";
import { Analytics } from "@/components/analytics";
import { Settings } from "@/components/settings";

export default function Home() {
  const [activeTab, setActiveTab] = useState("upload");

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-6xl mx-auto">
        <header className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Receipt AI Expense Tracker
          </h1>
          <p className="text-lg text-gray-600">
            AI-powered expense tracking from receipt images
          </p>
        </header>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-8">
            <TabsTrigger value="upload">Upload Receipt</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="upload" className="space-y-6">
            <ReceiptUpload />
          </TabsContent>

          <TabsContent value="analytics" className="space-y-6">
            <Analytics />
          </TabsContent>

          <TabsContent value="settings" className="space-y-6">
            <Settings />
          </TabsContent>
        </Tabs>
      </div>
    </main>
  );
}
