'use client';

import React, { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { th } from 'date-fns/locale';
import { Trash2, Eye, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { ReceiptRow, ReceiptItem } from '@/lib/supabase';

const CATEGORY_COLORS: Record<string, string> = {
  Food: '#10B981',
  Transport: '#3B82F6',
  Shopping: '#F59E0B',
  Utility: '#8B5CF6',
  Healthcare: '#EF4444',
  Entertainment: '#EC4899',
  Other: '#6B7280',
};

interface ReceiptListProps {
  refreshTrigger?: number;
}

export function ReceiptList({ refreshTrigger }: ReceiptListProps) {
  const [receipts, setReceipts] = useState<ReceiptRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchReceipts = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/receipts');
      const data = await response.json();
      setReceipts(data.receipts || []);
    } catch (error) {
      console.error('Failed to fetch receipts:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchReceipts();
  }, [refreshTrigger]);

  const handleDelete = async (id: string) => {
    if (!confirm('ต้องการลบใบเสร็จนี้หรือไม่?')) return;

    setDeletingId(id);
    try {
      const response = await fetch('/api/receipts', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });

      if (response.ok) {
        setReceipts((prev) => prev.filter((r) => r.id !== id));
      }
    } catch (error) {
      console.error('Failed to delete receipt:', error);
    } finally {
      setDeletingId(null);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('th-TH', {
      style: 'currency',
      currency: 'THB',
      minimumFractionDigits: 0,
    }).format(value);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>รายการใบเสร็จทั้งหมด</CardTitle>
        <Button variant="ghost" size="icon" onClick={fetchReceipts}>
          <RefreshCw className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent>
        {receipts.length === 0 ? (
          <div className="text-center text-gray-500 py-12">
            <p>ยังไม่มีใบเสร็จ</p>
            <p className="text-sm mt-1">อัปโหลดใบเสร็จเพื่อเริ่มต้นใช้งาน</p>
          </div>
        ) : (
          <div className="space-y-3">
            {receipts.map((receipt) => (
              <div
                key={receipt.id}
                className="border border-gray-200 rounded-lg overflow-hidden"
              >
                {/* Receipt Header */}
                <div
                  className="flex items-center justify-between p-4 bg-gray-50 cursor-pointer hover:bg-gray-100 transition-colors"
                  onClick={() =>
                    setExpandedId(expandedId === receipt.id ? null : receipt.id)
                  }
                >
                  <div className="flex items-center gap-4">
                    <div>
                      <p className="font-medium text-gray-900">
                        {receipt.shop_name || 'ไม่ระบุร้าน'}
                      </p>
                      <p className="text-sm text-gray-500">
                        {receipt.date
                          ? format(new Date(receipt.date), 'd MMMM yyyy', {
                              locale: th,
                            })
                          : 'ไม่ระบุวันที่'}
                      </p>
                    </div>
                    {receipt.category && (
                      <span
                        className="px-2 py-1 text-xs font-medium rounded-full"
                        style={{
                          backgroundColor: `${CATEGORY_COLORS[receipt.category] || '#6B7280'}20`,
                          color: CATEGORY_COLORS[receipt.category] || '#6B7280',
                        }}
                      >
                        {receipt.category}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-4">
                    <p className="font-semibold text-gray-900">
                      {formatCurrency(receipt.total_amount || 0)}
                    </p>
                    {expandedId === receipt.id ? (
                      <ChevronUp className="h-5 w-5 text-gray-400" />
                    ) : (
                      <ChevronDown className="h-5 w-5 text-gray-400" />
                    )}
                  </div>
                </div>

                {/* Expanded Details */}
                {expandedId === receipt.id && (
                  <div className="p-4 border-t border-gray-200 bg-white">
                    {/* Items */}
                    {receipt.items && receipt.items.length > 0 && (
                      <div className="mb-4">
                        <h4 className="text-sm font-medium text-gray-700 mb-2">
                          รายการสินค้า
                        </h4>
                        <div className="space-y-2">
                          {receipt.items.map((item: ReceiptItem, index: number) => (
                            <div
                              key={index}
                              className="flex justify-between text-sm"
                            >
                              <span className="text-gray-600">
                                {item.name} x{item.quantity}
                              </span>
                              <span className="text-gray-900">
                                {formatCurrency(item.price * item.quantity)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Tax ID */}
                    {receipt.tax_id && (
                      <p className="text-sm text-gray-500 mb-4">
                        เลขผู้เสียภาษี: {receipt.tax_id}
                      </p>
                    )}

                    {/* Receipt Image */}
                    {receipt.image_base64 && (
                      <div className="mb-4">
                        <h4 className="text-sm font-medium text-gray-700 mb-2">
                          รูปใบเสร็จ
                        </h4>
                        <img
                          src={`data:image/jpeg;base64,${receipt.image_base64}`}
                          alt="Receipt"
                          className="max-h-48 rounded-lg shadow-sm"
                        />
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-2 pt-2 border-t border-gray-100">
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(receipt.id);
                        }}
                        disabled={deletingId === receipt.id}
                      >
                        {deletingId === receipt.id ? (
                          <RefreshCw className="h-4 w-4 animate-spin mr-1" />
                        ) : (
                          <Trash2 className="h-4 w-4 mr-1" />
                        )}
                        ลบ
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
