"use client";

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

const monthlyData = [
  { month: "Jan", amount: 1200 },
  { month: "Feb", amount: 1500 },
  { month: "Mar", amount: 1800 },
  { month: "Apr", amount: 1300 },
  { month: "May", amount: 2100 },
  { month: "Jun", amount: 1900 },
];

const categoryData = [
  { name: "Food & Dining", value: 2400, color: "#8884d8" },
  { name: "Transportation", value: 1200, color: "#82ca9d" },
  { name: "Shopping", value: 800, color: "#ffc658" },
  { name: "Entertainment", value: 600, color: "#ff7c7c" },
  { name: "Utilities", value: 400, color: "#8dd1e1" },
];

export function Analytics() {
  const totalExpenses = monthlyData.reduce((sum, item) => sum + item.amount, 0);
  const avgMonthly = totalExpenses / monthlyData.length;
  const currentMonth = monthlyData[monthlyData.length - 1]?.amount || 0;
  const previousMonth = monthlyData[monthlyData.length - 2]?.amount || 0;
  const monthlyChange = (
    ((currentMonth - previousMonth) / previousMonth) *
    100
  ).toFixed(1);
  const monthlyChangeNum = parseFloat(monthlyChange);

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
              ${totalExpenses.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">Last 6 months</p>
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
            <div className="text-2xl font-bold">${avgMonthly.toFixed(0)}</div>
            <p className="text-xs text-muted-foreground">Per month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">This Month</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${currentMonth.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              {monthlyChangeNum > 0 ? "+" : ""}
              {monthlyChange}% from last month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Transactions</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">127</div>
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
              Your expense patterns over the last 6 months
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip formatter={(value) => [`$${value}`, "Amount"]} />
                <Bar dataKey="amount" fill="#8884d8" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Spending by Category</CardTitle>
            <CardDescription>Breakdown of expenses by category</CardDescription>
          </CardHeader>
          <CardContent>
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
                <Tooltip formatter={(value) => [`$${value}`, "Amount"]} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Recent Transactions */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Transactions</CardTitle>
          <CardDescription>Your latest processed receipts</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[
              {
                merchant: "Starbucks",
                amount: 4.5,
                date: "2024-01-15",
                category: "Food & Dining",
              },
              {
                merchant: "Shell Gas Station",
                amount: 45.0,
                date: "2024-01-14",
                category: "Transportation",
              },
              {
                merchant: "Amazon",
                amount: 29.99,
                date: "2024-01-13",
                category: "Shopping",
              },
              {
                merchant: "McDonald's",
                amount: 12.5,
                date: "2024-01-12",
                category: "Food & Dining",
              },
              {
                merchant: "Netflix",
                amount: 15.99,
                date: "2024-01-11",
                category: "Entertainment",
              },
            ].map((transaction, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 border rounded-lg"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                  <div>
                    <p className="font-medium">{transaction.merchant}</p>
                    <p className="text-sm text-gray-500">
                      {transaction.category}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-medium">${transaction.amount}</p>
                  <p className="text-sm text-gray-500">{transaction.date}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
