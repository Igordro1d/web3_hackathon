import type { Transaction } from '../types';
import { formatDateTime, formatUSDC, truncate } from '../utils/format';

interface PaymentTableProps {
  payments: Transaction[];
  showProduct?: boolean;
  emptyMessage?: string;
}

export function PaymentTable({
  payments,
  showProduct = false,
  emptyMessage = 'No payments yet.',
}: PaymentTableProps) {
  if (payments.length === 0) {
    return <p className="text-gray-500 p-6 text-sm">{emptyMessage}</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-gray-400 text-left border-b border-gray-700">
            <th className="px-6 py-3">Tx Hash</th>
            {showProduct && <th className="px-6 py-3">Product</th>}
            <th className="px-6 py-3">From</th>
            <th className="px-6 py-3">Resource</th>
            <th className="px-6 py-3">Amount</th>
            <th className="px-6 py-3">Time</th>
          </tr>
        </thead>
        <tbody>
          {payments.map((payment) => (
            <tr key={payment.id} className="border-b border-gray-700/50 hover:bg-gray-700/30">
              <td className="px-6 py-3 font-mono">
                <a
                  href={`https://testnet.snowtrace.io/tx/${payment.txHash}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-green-400 hover:text-green-300"
                >
                  {truncate(payment.txHash)}
                </a>
              </td>
              {showProduct && (
                <td className="px-6 py-3 text-gray-300">{payment.productName ?? 'Unknown product'}</td>
              )}
              <td className="px-6 py-3 font-mono text-gray-300">{truncate(payment.from)}</td>
              <td className="px-6 py-3 text-gray-300">{payment.resource}</td>
              <td className="px-6 py-3 text-blue-400">{formatUSDC(payment.amount)} USDC</td>
              <td className="px-6 py-3 text-gray-500">{formatDateTime(payment.timestamp)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
