import type { Transaction } from '../types';
import { Badge, formatRelative, formatUSDC, I, truncateMid } from './glyde';

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
    return <div className="empty">{emptyMessage}</div>;
  }

  return (
    <table className="tbl">
      <thead>
        <tr>
          <th>Tx hash</th>
          {showProduct && <th>Product</th>}
          <th>From</th>
          <th>Resource</th>
          <th style={{ textAlign: 'right' }}>Amount</th>
          <th>Status</th>
          <th>Time</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        {payments.map((p) => (
          <tr key={p.id} className="clickable">
            <td>
              <a
                href={`https://testnet.snowtrace.io/tx/${p.txHash}`}
                target="_blank"
                rel="noreferrer"
                className="mono a"
                style={{ textDecoration: 'none' }}
              >
                {truncateMid(p.txHash)}
              </a>
            </td>
            {showProduct && <td>{p.productName ?? 'Unknown product'}</td>}
            <td>
              <span className="mono muted">{truncateMid(p.from)}</span>
            </td>
            <td>
              <span className="mono muted">{p.resource}</span>
            </td>
            <td style={{ textAlign: 'right' }}>
              <span className="num hi">
                {formatUSDC(p.amount)}
                <span className="unit">USDC</span>
              </span>
            </td>
            <td>
              <Badge kind="active">settled</Badge>
            </td>
            <td>
              <span className="muted mono" style={{ fontSize: 11 }}>
                {formatRelative(p.timestamp)}
              </span>
            </td>
            <td>
              <I.ext width="13" height="13" style={{ color: 'var(--fg-3)' }} />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
