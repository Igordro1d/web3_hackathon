import { useEffect, useState } from 'react';

interface Transaction {
  id: string;
  txHash: string;
  from: string;
  to: string;
  amount: string;
  resource: string;
  timestamp: number;
}

export default function App() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('http://localhost:3001/api/transactions')
      .then((res) => res.json())
      .then((data) => setTransactions(data.transactions))
      .catch(() => setError('Could not connect to dashboard backend'));
  }, []);

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 p-8">
      <h1 className="text-3xl font-bold mb-6">Hackathon Dashboard</h1>
      {error && <p className="text-red-400 mb-4">{error}</p>}
      {transactions.length === 0 ? (
        <p className="text-gray-400">No transactions yet.</p>
      ) : (
        <ul className="space-y-2">
          {transactions.map((tx) => (
            <li key={tx.id} className="bg-gray-800 rounded p-4 font-mono text-sm">
              <span className="text-green-400">{tx.txHash}</span> — {tx.amount} USDC
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
