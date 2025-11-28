import { NextRequest, NextResponse } from 'next/server';
import { supabase, ReceiptRow } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const period = searchParams.get('period') || 'month'; // 'week', 'month', 'year'

    const { data: receipts, error } = await supabase
      .from('receipts')
      .select('*')
      .order('date', { ascending: true });

    if (error) {
      console.error('Supabase error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch statistics' },
        { status: 500 }
      );
    }

    // Calculate statistics
    const stats = calculateStats(receipts || [], period);

    return NextResponse.json(stats);
  } catch (error) {
    console.error('Error fetching statistics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch statistics' },
      { status: 500 }
    );
  }
}

function calculateStats(receipts: ReceiptRow[], period: string) {
  const now = new Date();
  let startDate: Date | null = null;

  switch (period) {
    case 'week':
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    case 'year':
      startDate = new Date(now.getFullYear(), 0, 1);
      break;
    case 'all':
      startDate = null; // No filter
      break;
    case 'month':
    default:
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      break;
  }

  // Helper to get effective date (use created_at as fallback)
  const getEffectiveDate = (r: ReceiptRow): Date => {
    if (r.date) {
      const d = new Date(r.date);
      // Check if date is reasonable (between 2000 and 2030)
      if (d.getFullYear() >= 2000 && d.getFullYear() <= 2030) {
        return d;
      }
    }
    // Fallback to created_at
    return new Date(r.created_at);
  };

  const filteredReceipts = receipts.filter((r) => {
    if (!startDate) return true; // 'all' period - no filter
    const receiptDate = getEffectiveDate(r);
    return receiptDate >= startDate && receiptDate <= now;
  });

  // Total spending
  const totalSpending = filteredReceipts.reduce(
    (sum, r) => sum + (r.total_amount || 0),
    0
  );

  // Spending by category
  const categorySpending: Record<string, number> = {};
  filteredReceipts.forEach((r) => {
    const category = r.category || 'Other';
    categorySpending[category] = (categorySpending[category] || 0) + (r.total_amount || 0);
  });

  const categoryData = Object.entries(categorySpending).map(([name, value]) => ({
    name,
    value,
  }));

  // Spending over time (daily for week/month, monthly for year)
  const timeSpending: Record<string, number> = {};
  filteredReceipts.forEach((r) => {
    const date = getEffectiveDate(r);
    let key: string;

    if (period === 'year' || period === 'all') {
      key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    } else {
      key = date.toISOString().split('T')[0]; // YYYY-MM-DD format
    }

    timeSpending[key] = (timeSpending[key] || 0) + (r.total_amount || 0);
  });

  const timeData = Object.entries(timeSpending)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, amount]) => ({
      date,
      amount,
    }));

  // Recent receipts
  const recentReceipts = filteredReceipts
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 5);

  // Top shops
  const shopSpending: Record<string, number> = {};
  filteredReceipts.forEach((r) => {
    const shop = r.shop_name || 'Unknown';
    shopSpending[shop] = (shopSpending[shop] || 0) + (r.total_amount || 0);
  });

  const topShops = Object.entries(shopSpending)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([name, amount]) => ({ name, amount }));

  return {
    totalSpending,
    receiptCount: filteredReceipts.length,
    categoryData,
    timeData,
    recentReceipts,
    topShops,
  };
}
