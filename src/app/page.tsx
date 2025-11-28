'use client';

import { useState } from 'react';
import { Receipt, LayoutDashboard, List } from 'lucide-react';
import { ReceiptUpload } from '@/components/receipt-upload';
import { Dashboard } from '@/components/dashboard';
import { ReceiptList } from '@/components/receipt-list';
import { Button } from '@/components/ui/button';

type Tab = 'upload' | 'dashboard' | 'receipts';

export default function Home() {
  const [activeTab, setActiveTab] = useState<Tab>('upload');
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleUploadSuccess = () => {
    setRefreshTrigger((prev) => prev + 1);
  };

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'upload', label: 'Upload', icon: <Receipt className="h-4 w-4" /> },
    { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard className="h-4 w-4" /> },
    { id: 'receipts', label: 'Receipts', icon: <List className="h-4 w-4" /> },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-600 rounded-lg">
                <Receipt className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">
                  Receipt Tracker
                </h1>
                <p className="text-xs text-gray-500">AI-Powered Expense Tracking</p>
              </div>
            </div>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-2">
              {tabs.map((tab) => (
                <Button
                  key={tab.id}
                  variant={activeTab === tab.id ? 'default' : 'ghost'}
                  onClick={() => setActiveTab(tab.id)}
                  className="gap-2"
                >
                  {tab.icon}
                  {tab.label}
                </Button>
              ))}
            </nav>
          </div>
        </div>
      </header>

      {/* Mobile Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-10">
        <div className="flex justify-around">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex flex-col items-center gap-1 py-3 px-4 flex-1 transition-colors ${
                activeTab === tab.id
                  ? 'text-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.icon}
              <span className="text-xs font-medium">{tab.label}</span>
            </button>
          ))}
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-24 md:pb-8">
        {activeTab === 'upload' && (
          <div className="max-w-2xl mx-auto">
            <ReceiptUpload onUploadSuccess={handleUploadSuccess} />
            
            <div className="mt-8 p-6 bg-white rounded-xl border border-gray-200 shadow-sm">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                How It Works
              </h2>
              <ol className="space-y-3 text-gray-600">
                <li className="flex gap-3">
                  <span className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-medium">
                    1
                  </span>
                  <span>Take a photo or select a receipt image from your device</span>
                </li>
                <li className="flex gap-3">
                  <span className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-medium">
                    2
                  </span>
                  <span>AI will automatically analyze and extract data from the receipt</span>
                </li>
                <li className="flex gap-3">
                  <span className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-medium">
                    3
                  </span>
                  <span>View expense summaries and analytics in the dashboard</span>
                </li>
              </ol>
            </div>
          </div>
        )}

        {activeTab === 'dashboard' && (
          <Dashboard refreshTrigger={refreshTrigger} />
        )}

        {activeTab === 'receipts' && (
          <ReceiptList refreshTrigger={refreshTrigger} />
        )}
      </main>
    </div>
  );
}
