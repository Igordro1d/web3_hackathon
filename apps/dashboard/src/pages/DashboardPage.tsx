import { useCallback, useEffect, useState } from 'react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { apiRequest } from '../api';
import { PaymentTable } from '../components/PaymentTable';
import { StatCard } from '../components/StatCard';
import type { DashboardSummary, Transaction } from '../types';
import { formatTime, formatUSDC } from '../utils/format';

interface DashboardPageProps {
  token: string;
}

function buildChartData(payments: Transaction[]) {
  const buckets: Record<string, number> = {};

  for (const payment of payments) {
    const time = formatTime(payment.timestamp);
    buckets[time] = (buckets[time] ?? 0) + Number(formatUSDC(payment.amount));
  }

  return Object.entries(buckets)
    .map(([time, revenue]) => ({ time, revenue: Number(revenue.toFixed(6)) }))
    .reverse();
}

export function DashboardPage({ token }: DashboardPageProps) {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadSummary = useCallback(async () => {
    try {
      const response = await apiRequest<DashboardSummary>('/api/dashboard/summary', {}, token);
      setSummary(response);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not connect to dashboard backend');
    }
  }, [token]);

  useEffect(() => {
    loadSummary();
    const interval = window.setInterval(loadSummary, 3000);
    return () => window.clearInterval(interval);
  }, [loadSummary]);

  const chartData = buildChartData(summary?.recentPayments ?? []);

  return (
    <div>
      <h2 className="text-3xl font-bold mb-2">Dashboard</h2>
      <p className="text-gray-400 mb-8 text-sm">High-level payment activity across all products.</p>

      {error && (
        <div className="bg-red-900/40 border border-red-700 rounded p-3 mb-6 text-red-300 text-sm">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
        <StatCard label="Total Revenue" value={`${summary?.totalRevenue ?? '0.000000'} USDC`} accent="green" />
        <StatCard label="Revenue, Last 30 Days" value={`${summary?.revenue30d ?? '0.000000'} USDC`} accent="green" />
        <StatCard label="Total Payments" value={String(summary?.totalPayments ?? 0)} accent="blue" />
        <StatCard label="Active Products" value={String(summary?.activeProducts ?? 0)} accent="blue" />
      </div>

      {chartData.length > 0 && (
        <div className="bg-gray-800 rounded-xl p-6 mb-8">
          <h3 className="text-lg font-semibold mb-4">Recent Revenue (USDC)</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="time" tick={{ fill: '#9ca3af', fontSize: 12 }} />
              <YAxis tick={{ fill: '#9ca3af', fontSize: 12 }} />
              <Tooltip
                contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151' }}
                labelStyle={{ color: '#f9fafb' }}
              />
              <Bar dataKey="revenue" fill="#34d399" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="bg-gray-800 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-700">
          <h3 className="text-lg font-semibold">Recent Payments</h3>
        </div>
        <PaymentTable
          payments={summary?.recentPayments ?? []}
          showProduct
          emptyMessage="No payments yet. Create a product and run the demo agent to see payments settle here."
        />
      </div>
    </div>
  );
}
