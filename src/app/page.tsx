'use client';

import { useState } from 'react';
import { Receipt, LayoutDashboard, List, ScanLine } from 'lucide-react';
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
    <div className="min-h-screen bg-[var(--page)]">
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-slate-950 p-2">
                <Receipt className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-semibold text-slate-950">
                  Receipt Ledger
                </h1>
                <p className="text-xs text-slate-500">Thai + English AI extraction</p>
              </div>
            </div>

            <nav className="hidden md:flex items-center gap-2" aria-label="Primary">
              {tabs.map((tab) => (
                <Button
                  key={tab.id}
                  variant={activeTab === tab.id ? 'default' : 'ghost'}
                  onClick={() => setActiveTab(tab.id)}
                  className="gap-2"
                  aria-current={activeTab === tab.id ? 'page' : undefined}
                >
                  {tab.icon}
                  {tab.label}
                </Button>
              ))}
            </nav>
          </div>
        </div>
      </header>

      <nav className="fixed bottom-0 left-0 right-0 z-10 border-t border-slate-200 bg-white md:hidden" aria-label="Mobile primary">
        <div className="flex justify-around">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex flex-col items-center gap-1 py-3 px-4 flex-1 transition-colors ${
                activeTab === tab.id
                  ? 'text-blue-700'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
              aria-current={activeTab === tab.id ? 'page' : undefined}
            >
              {tab.icon}
              <span className="text-xs font-medium">{tab.label}</span>
            </button>
          ))}
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-24 md:pb-8">
        {activeTab === 'upload' && (
          <div className="mx-auto max-w-3xl">
            <div className="mb-6">
              <p className="flex items-center gap-2 text-sm font-semibold text-blue-700">
                <ScanLine className="h-4 w-4" aria-hidden="true" />
                Multimodal receipt workflow
              </p>
              <h2 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
                Turn receipt images into reviewed expense records
              </h2>
              <p className="mt-3 max-w-2xl text-slate-600">
                Parse with the server-side AI router, verify the structured
                result, then save it privately in this browser.
              </p>
            </div>
            <ReceiptUpload onUploadSuccess={handleUploadSuccess} />
            
            <section className="mt-8 border-t border-slate-200 pt-6" aria-labelledby="flow-title">
              <h2 id="flow-title" className="text-sm font-semibold uppercase tracking-[0.12em] text-slate-500">
                Review path
              </h2>
              <ol className="mt-4 grid gap-4 text-slate-700 sm:grid-cols-3">
                <li className="flex gap-3">
                  <span className="text-sm font-semibold text-blue-700">01</span>
                  <span className="text-sm">Select a clear JPG, PNG, or WebP receipt.</span>
                </li>
                <li className="flex gap-3">
                  <span className="text-sm font-semibold text-blue-700">02</span>
                  <span className="text-sm">Review dates, totals, categories, and line items.</span>
                </li>
                <li className="flex gap-3">
                  <span className="text-sm font-semibold text-blue-700">03</span>
                  <span className="text-sm">Save only after confirmation, then inspect analytics.</span>
                </li>
              </ol>
            </section>
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
