import { useCallback, useEffect, useState } from 'react';
import { apiRequest } from '../api';
import { Badge, Button, Card, formatUSDC, I } from '../components/glyde';
import type { Product } from '../types';

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

  const activeCount = products.filter((p) => p.status === 'active').length;
  const inactiveCount = products.length - activeCount;

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Products</h1>
          <p>Payable endpoint configurations. Each product has a price, product resource, and unique API key.</p>
        </div>
        <Button variant="accent" onClick={() => onNavigate('/dashboard/products/new')}>
          <I.plus width="14" height="14" />
          Create product
        </Button>
      </div>

      {error && <div className="banner error">{error}</div>}

      <Card
        title={`${products.length} ${products.length === 1 ? 'product' : 'products'}`}
        sub={`${activeCount} active · ${inactiveCount} inactive`}
        padded={false}
      >
        {products.length === 0 ? (
          <div className="empty">No products yet. Create your first paid endpoint to get started.</div>
        ) : (
          <table className="tbl">
            <thead>
              <tr>
                <th>Name</th>
                <th>Product resource</th>
                <th style={{ textAlign: 'right' }}>Price</th>
                <th>Status</th>
                <th>API key</th>
                <th style={{ textAlign: 'right' }}>Payments</th>
                <th style={{ textAlign: 'right' }}>Revenue · USDC</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr
                  key={p.id}
                  className="clickable"
                  onClick={() => onNavigate(`/dashboard/products/${p.id}`)}
                >
                  <td>
                    <span style={{ fontWeight: 500 }}>{p.name}</span>
                    <div style={{ fontSize: 11, color: 'var(--fg-3)', marginTop: 2 }}>
                      {p.description}
                    </div>
                  </td>
                  <td>
                    <span className="mono muted">{p.resource}</span>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <span className="num">
                      {formatUSDC(p.price)}
                      <span className="unit">USDC</span>
                    </span>
                  </td>
                  <td>
                    <Badge kind={p.status === 'active' ? 'active' : 'inactive'}>{p.status}</Badge>
                  </td>
                  <td>
                    <span className="mono muted">{p.apiKey.slice(0, 14)}…</span>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <span className="num">{(p.paymentCount ?? 0).toLocaleString()}</span>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <span className="num hi">{p.revenue ?? '0.000000'}</span>
                  </td>
                  <td>
                    <I.arrow width="14" height="14" style={{ color: 'var(--fg-3)' }} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </>
  );
}
