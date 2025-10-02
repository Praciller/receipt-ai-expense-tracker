"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { DollarSign, TrendingUp, Calendar, ShoppingCart } from "lucide-react";

// Category color mapping
const CATEGORY_COLORS: Record<string, string> = {
  Food: "#8884d8",
  Transport: "#82ca9d",
  Shopping: "#ffc658",
  Entertainment: "#ff7c7c",
  Utilities: "#8dd1e1",
  Healthcare: "#a4de6c",
  Education: "#d0ed57",
  Other: "#ffc0cb",
};

interface Receipt {
  merchant: string;
  total: number;
  date: string;
  category: string;
  confidence: number;
  timestamp: number;
}

export function Analytics() {
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [loading, setLoading] = useState(true);

  // Load receipts from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem("receipts");
      if (stored) {
        const parsedReceipts = JSON.parse(stored);
        setReceipts(parsedReceipts);
      }
    } catch (error) {
      console.error("Error loading receipts:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Calculate analytics from real receipt data
  const totalExpenses = receipts.reduce(
    (sum, receipt) => sum + receipt.total,
    0
  );
  const transactionCount = receipts.length;

  // Group by month for monthly data
  const monthlyData = receipts.reduce(
    (acc: Record<string, number>, receipt) => {
      const date = new Date(receipt.date);
      const monthKey = date.toLocaleDateString("en-US", {
        month: "short",
        year: "numeric",
      });
      acc[monthKey] = (acc[monthKey] || 0) + receipt.total;
      return acc;
    },
    {}
  );

  const monthlyChartData = Object.entries(monthlyData)
    .map(([month, amount]) => ({ month, amount }))
    .slice(-6); // Last 6 months

  const avgMonthly =
    monthlyChartData.length > 0
      ? monthlyChartData.reduce((sum, item) => sum + item.amount, 0) /
        monthlyChartData.length
      : 0;

  const currentMonth =
    monthlyChartData[monthlyChartData.length - 1]?.amount || 0;
  const previousMonth =
    monthlyChartData[monthlyChartData.length - 2]?.amount || 0;
  const monthlyChange =
    previousMonth > 0
      ? (((currentMonth - previousMonth) / previousMonth) * 100).toFixed(1)
      : "0.0";
  const monthlyChangeNum = parseFloat(monthlyChange);

  // Group by category for pie chart
  const categoryTotals = receipts.reduce(
    (acc: Record<string, number>, receipt) => {
      acc[receipt.category] = (acc[receipt.category] || 0) + receipt.total;
      return acc;
    },
    {}
  );

  const categoryData = Object.entries(categoryTotals).map(([name, value]) => ({
    name,
    value,
    color: CATEGORY_COLORS[name] || "#cccccc",
  }));

  // Get recent transactions (last 5)
  const recentTransactions = [...receipts]
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, 5);

  // Show empty state if no receipts
  if (!loading && receipts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <ShoppingCart className="h-16 w-16 text-gray-300" />
        <h3 className="text-xl font-semibold text-gray-700">No Receipts Yet</h3>
        <p className="text-gray-500 text-center max-w-md">
          Upload your first receipt to start tracking your expenses and see
          analytics here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Expenses
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${totalExpenses.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">
              {receipts.length > 0 ? "All time" : "No data"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Monthly Average
            </CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${avgMonthly.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              {monthlyChartData.length > 0 ? "Per month" : "No data"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">This Month</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${currentMonth.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              {previousMonth > 0 ? (
                <>
                  {monthlyChangeNum > 0 ? "+" : ""}
                  {monthlyChange}% from last month
                </>
              ) : (
                "No previous data"
              )}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Transactions</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{transactionCount}</div>
            <p className="text-xs text-muted-foreground">
              Total receipts processed
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Monthly Spending Trend</CardTitle>
            <CardDescription>
              {monthlyChartData.length > 0
                ? `Your expense patterns over the last ${monthlyChartData.length} months`
                : "No monthly data available"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {monthlyChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={monthlyChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip
                    formatter={(value) => [
                      `$${Number(value).toFixed(2)}`,
                      "Amount",
                    ]}
                  />
                  <Bar dataKey="amount" fill="#8884d8" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[300px] text-gray-400">
                No monthly data to display
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Spending by Category</CardTitle>
            <CardDescription>
              {categoryData.length > 0
                ? "Breakdown of expenses by category"
                : "No category data available"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {categoryData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={categoryData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) =>
                      `${name} ${(percent * 100).toFixed(0)}%`
                    }
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {categoryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value) => [
                      `$${Number(value).toFixed(2)}`,
                      "Amount",
                    ]}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[300px] text-gray-400">
                No category data to display
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Transactions */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Transactions</CardTitle>
          <CardDescription>
            {recentTransactions.length > 0
              ? "Your latest processed receipts"
              : "No transactions yet"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {recentTransactions.length > 0 ? (
            <div className="space-y-4">
              {recentTransactions.map((transaction, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="flex items-center space-x-3">
                    <div
                      className="w-2 h-2 rounded-full"
                      style={{
                        backgroundColor:
                          CATEGORY_COLORS[transaction.category] || "#cccccc",
                      }}
                    ></div>
                    <div>
                      <p className="font-medium">{transaction.merchant}</p>
                      <p className="text-sm text-gray-500">
                        {transaction.category}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">
                      ${transaction.total.toFixed(2)}
                    </p>
                    <p className="text-sm text-gray-500">{transaction.date}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center justify-center h-[200px] text-gray-400">
              No transactions to display
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
