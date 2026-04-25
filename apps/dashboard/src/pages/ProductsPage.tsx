import { useCallback, useEffect, useState } from 'react';
import { apiRequest } from '../api';
import type { Product } from '../types';
import { formatUSDC, truncate } from '../utils/format';

interface ProductsPageProps {
  token: string;
  onNavigate: (path: string) => void;
}

export function ProductsPage({ token, onNavigate }: ProductsPageProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [error, setError] = useState<string | null>(null);

  const loadProducts = useCallback(async () => {
    try {
      const response = await apiRequest<{ products: Product[] }>('/api/products', {}, token);
      setProducts(response.products);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load products');
    }
  }, [token]);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  return (
    <div>
      <div className="flex flex-col gap-4 mb-8 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-3xl font-bold mb-2">Products</h2>
          <p className="text-gray-400 text-sm">Create payable endpoint configurations and manage API keys.</p>
        </div>
        <button
          type="button"
          onClick={() => onNavigate('/dashboard/products/new')}
          className="rounded bg-green-500 px-4 py-2 text-sm font-semibold text-gray-950"
        >
          Create Product
        </button>
      </div>

      {error && (
        <div className="bg-red-900/40 border border-red-700 rounded p-3 mb-6 text-red-300 text-sm">
          {error}
        </div>
      )}

      <div className="bg-gray-800 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-700">
          <h3 className="text-lg font-semibold">Product Configurations</h3>
        </div>
        {products.length === 0 ? (
          <p className="text-gray-500 p-6 text-sm">No products yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-gray-400 text-left border-b border-gray-700">
                  <th className="px-6 py-3">Name</th>
                  <th className="px-6 py-3">Price</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3">API Key</th>
                  <th className="px-6 py-3">Payments</th>
                  <th className="px-6 py-3">Revenue</th>
                </tr>
              </thead>
              <tbody>
                {products.map((product) => (
                  <tr
                    key={product.id}
                    onClick={() => onNavigate(`/dashboard/products/${product.id}`)}
                    className="border-b border-gray-700/50 hover:bg-gray-700/30 cursor-pointer"
                  >
                    <td className="px-6 py-3 text-gray-100">{product.name}</td>
                    <td className="px-6 py-3 text-blue-400">{formatUSDC(product.price)} USDC</td>
                    <td className="px-6 py-3">
                      <span
                        className={`rounded px-2 py-1 text-xs ${
                          product.status === 'active'
                            ? 'bg-green-900/40 text-green-300'
                            : 'bg-gray-700 text-gray-300'
                        }`}
                      >
                        {product.status}
                      </span>
                    </td>
                    <td className="px-6 py-3 font-mono text-gray-300">{truncate(product.apiKey, 8)}</td>
                    <td className="px-6 py-3 text-gray-300">{product.paymentCount ?? 0}</td>
                    <td className="px-6 py-3 text-green-400">{product.revenue ?? '0.000000'} USDC</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
