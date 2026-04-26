import { useCallback, useEffect, useState } from 'react';
import { apiRequest } from '../api';
import { Badge, BarChart, Button, Card, I, KPI } from '../components/glyde';
import { PaymentTable } from '../components/PaymentTable';
import type { DashboardSummary, Transaction } from '../types';

interface DashboardPageProps {
  token: string;
  onNavigate: (path: string) => void;
}

interface ChartPoint {
  value: number;
  label: string;
}

function buildChartData(payments: Transaction[]): ChartPoint[] {
  const buckets: Record<string, number> = {};
  for (const p of payments) {
    const time = new Date(p.timestamp).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });
    const usdc = Number(BigInt(p.amount)) / 1_000_000;
    buckets[time] = (buckets[time] ?? 0) + usdc;
  }
  return Object.entries(buckets)
    .map(([label, value]) => ({ label, value: Number(value.toFixed(6)) }))
    .reverse();
}

function splitNumber(value: string): { whole: string; frac: string } {
  const [whole, frac] = value.split('.');
  return { whole: whole ?? '0', frac: frac ?? '' };
}

export function DashboardPage({ token, onNavigate }: DashboardPageProps) {
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
  const total = splitNumber(summary?.totalRevenue ?? '0.000000');
  const month = splitNumber(summary?.revenue30d ?? '0.000000');

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Overview</h1>
          <p>Payment activity across all products. Live updates from the avalanche-fuji settlement.</p>
        </div>
        <div className="flex-row">
          <Button variant="accent" size="sm" onClick={() => onNavigate('/dashboard/products/new')}>
            <I.plus width="14" height="14" />
            Create product
          </Button>
        </div>
      </div>

      {error && <div className="banner error">{error}</div>}

      <div className="kpi-grid">
        <KPI
          label="Total revenue"
          value={`${total.whole}.`}
          frac={total.frac}
          unit="USDC"
          accent
        />
        <KPI label="Revenue · 30d" value={`${month.whole}.`} frac={month.frac} unit="USDC" />
        <KPI label="Total payments" value={(summary?.totalPayments ?? 0).toLocaleString()} />
        <KPI label="Active products" value={String(summary?.activeProducts ?? 0)} />
      </div>

      {chartData.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <Card
            title="Recent revenue"
            sub="USDC, settled"
            action={<Badge kind="active">live</Badge>}
          >
            <div className="chart-wrap">
              <BarChart data={chartData} height={200} />
            </div>
            <div className="chart-legend">
              <span className="lg">
                <span className="sw" style={{ background: 'var(--glyde-chartreuse)' }} />
                Revenue per minute (USDC)
              </span>
            </div>
          </Card>
        </div>
      )}

      <Card
        title="Recent payments"
        sub="Real-time settlement events"
        action={
          <Button variant="ghost" size="sm" onClick={() => onNavigate('/dashboard/products')}>
            View products
          </Button>
        }
        padded={false}
      >
        <PaymentTable
          payments={summary?.recentPayments ?? []}
          showProduct
          emptyMessage="No payments yet. Create a product and run the demo agent to see payments settle here."
        />
      </Card>
    </>
  );
}
