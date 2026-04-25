import { useEffect, useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';

interface Transaction {
  id: string;
  txHash: string;
  from: string;
  to: string;
  amount: string;
  resource: string;
  timestamp: number;
}

interface Stats {
  totalRevenue: string;
  count: number;
}

function truncate(addr: string, chars = 6) {
  if (addr.length <= chars * 2 + 2) return addr;
  return `${addr.slice(0, chars + 2)}...${addr.slice(-chars)}`;
}

function formatTime(ts: number) {
  return new Date(ts).toLocaleTimeString();
}

function buildChartData(transactions: Transaction[]) {
  const buckets: Record<string, number> = {};
  for (const tx of transactions) {
    const hour = new Date(tx.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    buckets[hour] = (buckets[hour] ?? 0) + Number(tx.amount) / 1_000_000;
  }
  return Object.entries(buckets).map(([time, revenue]) => ({ time, revenue: +revenue.toFixed(4) }));
}

export default function App() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [stats, setStats] = useState<Stats>({ totalRevenue: '0', count: 0 });
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    try {
      const [txRes, statsRes] = await Promise.all([
        fetch('http://localhost:3001/api/transactions'),
        fetch('http://localhost:3001/api/stats'),
      ]);
      const txData = await txRes.json();
      const statsData = await statsRes.json();
      setTransactions(txData.transactions);
      setStats(statsData);
      setError(null);
    } catch {
      setError('Could not connect to dashboard backend');
    }
  }

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 3000);
    return () => clearInterval(interval);
  }, []);

  const chartData = buildChartData(transactions);

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 p-8">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-3xl font-bold mb-2">x402 Payment Gateway</h1>
        <p className="text-gray-400 mb-8 text-sm">Agent payment dashboard — auto-refreshes every 3s</p>

        {error && (
          <div className="bg-red-900/40 border border-red-700 rounded p-3 mb-6 text-red-300 text-sm">
            {error}
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 mb-8">
          <div className="bg-gray-800 rounded-xl p-6">
            <p className="text-gray-400 text-sm mb-1">Total Revenue</p>
            <p className="text-3xl font-bold text-green-400">{stats.totalRevenue} <span className="text-lg text-gray-400">USDC</span></p>
          </div>
          <div className="bg-gray-800 rounded-xl p-6">
            <p className="text-gray-400 text-sm mb-1">Transactions Settled</p>
            <p className="text-3xl font-bold text-blue-400">{stats.count}</p>
          </div>
        </div>

        {/* Chart */}
        {chartData.length > 0 && (
          <div className="bg-gray-800 rounded-xl p-6 mb-8">
            <h2 className="text-lg font-semibold mb-4">Revenue Over Time (USDC)</h2>
            <ResponsiveContainer width="100%" height={200}>
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

        {/* Transaction table */}
        <div className="bg-gray-800 rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-700">
            <h2 className="text-lg font-semibold">Recent Transactions</h2>
          </div>
          {transactions.length === 0 ? (
            <p className="text-gray-500 p-6 text-sm">No transactions yet. Run the demo agent to see payments settle here.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-gray-400 text-left border-b border-gray-700">
                  <th className="px-6 py-3">Tx Hash</th>
                  <th className="px-6 py-3">From</th>
                  <th className="px-6 py-3">Resource</th>
                  <th className="px-6 py-3">Amount</th>
                  <th className="px-6 py-3">Time</th>
                </tr>
              </thead>
              <tbody>
                {[...transactions].reverse().map((tx) => (
                  <tr key={tx.id} className="border-b border-gray-700/50 hover:bg-gray-700/30">
                    <td className="px-6 py-3 font-mono">
                      <a
                        href={`https://testnet.snowtrace.io/tx/${tx.txHash}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-green-400 hover:text-green-300"
                      >
                        {truncate(tx.txHash)}
                      </a>
                    </td>
                    <td className="px-6 py-3 font-mono text-gray-300">{truncate(tx.from)}</td>
                    <td className="px-6 py-3 text-gray-300">{tx.resource}</td>
                    <td className="px-6 py-3 text-blue-400">
                      {(Number(tx.amount) / 1_000_000).toFixed(6)} USDC
                    </td>
                    <td className="px-6 py-3 text-gray-500">{formatTime(tx.timestamp)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
