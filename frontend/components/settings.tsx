"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Settings as SettingsIcon, User, Bell, Database, Download, Trash2 } from "lucide-react";

export function Settings() {
  const [apiKey, setApiKey] = useState("");
  const [notifications, setNotifications] = useState(true);
  const [autoSave, setAutoSave] = useState(true);

  const handleSaveSettings = () => {
    // Save settings logic here
    console.log("Settings saved:", { apiKey, notifications, autoSave });
  };

  const handleExportData = () => {
    // Export data logic here
    console.log("Exporting data...");
  };

  const handleClearData = () => {
    if (confirm("Are you sure you want to clear all data? This action cannot be undone.")) {
      // Clear data logic here
      console.log("Data cleared");
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Profile Settings
          </CardTitle>
          <CardDescription>
            Manage your account preferences and API configuration
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2">
            <label htmlFor="api-key" className="text-sm font-medium">
              OpenAI API Key
            </label>
            <Input
              id="api-key"
              type="password"
              placeholder="sk-..."
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
            />
            <p className="text-xs text-gray-500">
              Your API key is stored locally and never sent to our servers
            </p>
          </div>

          <div className="grid gap-2">
            <label htmlFor="email" className="text-sm font-medium">
              Email Address
            </label>
            <Input
              id="email"
              type="email"
              placeholder="your@email.com"
              defaultValue="user@example.com"
            />
          </div>

          <Button onClick={handleSaveSettings} className="w-full">
            Save Profile Settings
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Notification Preferences
          </CardTitle>
          <CardDescription>
            Configure how you want to be notified about expenses
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Email Notifications</p>
              <p className="text-sm text-gray-500">Receive weekly expense summaries</p>
            </div>
            <Button
              variant={notifications ? "default" : "outline"}
              size="sm"
              onClick={() => setNotifications(!notifications)}
            >
              {notifications ? "Enabled" : "Disabled"}
            </Button>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Auto-save Receipts</p>
              <p className="text-sm text-gray-500">Automatically save processed receipts</p>
            </div>
            <Button
              variant={autoSave ? "default" : "outline"}
              size="sm"
              onClick={() => setAutoSave(!autoSave)}
            >
              {autoSave ? "Enabled" : "Disabled"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Data Management
          </CardTitle>
          <CardDescription>
            Export or manage your expense data
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3">
            <Button
              variant="outline"
              onClick={handleExportData}
              className="flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              Export All Data
            </Button>

            <Button
              variant="destructive"
              onClick={handleClearData}
              className="flex items-center gap-2"
            >
              <Trash2 className="h-4 w-4" />
              Clear All Data
            </Button>
          </div>

          <div className="text-sm text-gray-500 space-y-1">
            <p>• Export includes all receipts and expense data in JSON format</p>
            <p>• Clearing data will permanently delete all stored information</p>
            <p>• Data is stored locally in your browser</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <SettingsIcon className="h-5 w-5" />
            Application Info
          </CardTitle>
          <CardDescription>
            Information about this application
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="grid gap-1 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Version:</span>
              <span>1.0.0</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Last Updated:</span>
              <span>January 2024</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Framework:</span>
              <span>Next.js 14</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">UI Library:</span>
              <span>shadcn/ui</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
