import { useCallback, useEffect, useState } from 'react';
import { apiRequest } from '../api';
import { PaymentTable } from '../components/PaymentTable';
import { StatCard } from '../components/StatCard';
import type { Product, ProductDetails } from '../types';
import { formatUSDC } from '../utils/format';

interface ProductDetailPageProps {
  token: string;
  productId: string;
  onNavigate: (path: string) => void;
}

export function ProductDetailPage({ token, productId, onNavigate }: ProductDetailPageProps) {
  const [details, setDetails] = useState<ProductDetails | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [rotating, setRotating] = useState(false);

  const loadProduct = useCallback(async () => {
    try {
      const response = await apiRequest<ProductDetails>(`/api/products/${productId}`, {}, token);
      setDetails(response);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load product');
    }
  }, [productId, token]);

  useEffect(() => {
    loadProduct();
  }, [loadProduct]);

  async function rotateKey() {
    setRotating(true);
    setError(null);

    try {
      await apiRequest<{ product: Product }>(`/api/products/${productId}/rotate-key`, { method: 'POST' }, token);
      await loadProduct();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not rotate API key');
    } finally {
      setRotating(false);
    }
  }

  if (!details) {
    return (
      <div>
        {error && (
          <div className="bg-red-900/40 border border-red-700 rounded p-3 mb-6 text-red-300 text-sm">
            {error}
          </div>
        )}
        <p className="text-gray-500 text-sm">Loading product...</p>
      </div>
    );
  }

  const { product, analytics, payments, integrationSteps } = details;

  return (
    <div>
      <div className="flex flex-col gap-4 mb-8 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-3xl font-bold mb-2">{product.name}</h2>
          <p className="text-gray-400 text-sm max-w-2xl">{product.description}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => onNavigate(`/dashboard/products/${product.id}/edit`)}
            className="rounded bg-gray-700 px-4 py-2 text-sm text-gray-100"
          >
            Edit
          </button>
          <button
            type="button"
            onClick={rotateKey}
            disabled={rotating}
            className="rounded bg-green-500 px-4 py-2 text-sm font-semibold text-gray-950 disabled:opacity-60"
          >
            {rotating ? 'Rotating...' : 'Rotate API Key'}
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-900/40 border border-red-700 rounded p-3 mb-6 text-red-300 text-sm">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
        <StatCard label="Price Per Access" value={`${formatUSDC(product.price)} USDC`} accent="blue" />
        <StatCard label="Total Revenue" value={`${analytics.totalRevenue} USDC`} accent="green" />
        <StatCard label="Revenue, Last 30 Days" value={`${analytics.revenue30d} USDC`} accent="green" />
        <StatCard label="Payments" value={String(analytics.paymentCount)} accent="blue" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <section className="bg-gray-800 rounded-xl p-6">
          <h3 className="text-lg font-semibold mb-4">Product Details</h3>
          <dl className="space-y-3 text-sm">
            <div>
              <dt className="text-gray-400">Status</dt>
              <dd className="text-gray-100">{product.status}</dd>
            </div>
            <div>
              <dt className="text-gray-400">Resource</dt>
              <dd className="font-mono text-gray-100 break-all">{product.resource}</dd>
            </div>
            <div>
              <dt className="text-gray-400">API Key</dt>
              <dd className="font-mono text-green-400 break-all">{product.apiKey}</dd>
            </div>
          </dl>
        </section>

        <section className="bg-gray-800 rounded-xl p-6">
          <h3 className="text-lg font-semibold mb-4">Integration Steps</h3>
          <ol className="list-decimal list-inside space-y-2 text-sm text-gray-300">
            {integrationSteps.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
        </section>
      </div>

      <div className="bg-gray-800 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-700">
          <h3 className="text-lg font-semibold">Payment History</h3>
        </div>
        <PaymentTable payments={payments} emptyMessage="No payments recorded for this product yet." />
      </div>
    </div>
  );
}
