import { useCallback, useEffect, useState } from 'react';
import { apiRequest } from '../api';
import { Badge, Button, Card, CopyRow, formatUSDC, I, KPI } from '../components/glyde';
import { PaymentTable } from '../components/PaymentTable';
import type { Product, ProductDetails } from '../types';

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
      await apiRequest<{ product: Product }>(
        `/api/products/${productId}/rotate-key`,
        { method: 'POST' },
        token,
      );
      await loadProduct();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not rotate API key');
    } finally {
      setRotating(false);
    }
  }

  if (!details) {
    return (
      <>
        {error && <div className="banner error">{error}</div>}
        <div className="empty">Loading product…</div>
      </>
    );
  }

  const { product, analytics, payments } = details;

  return (
    <>
      <div style={{ marginBottom: 14 }}>
        <Button variant="ghost" size="sm" onClick={() => onNavigate('/dashboard/products')}>
          <I.back width="14" height="14" />
          All products
        </Button>
      </div>

      <div className="page-head">
        <div>
          <div className="flex-row" style={{ marginBottom: 8 }}>
            <h1 style={{ margin: 0 }}>{product.name}</h1>
            <Badge kind={product.status === 'active' ? 'active' : 'inactive'}>
              {product.status}
            </Badge>
          </div>
          <p>{product.description}</p>
        </div>
        <div className="flex-row">
          <Button
            variant="secondary"
            onClick={() => onNavigate(`/dashboard/products/${product.id}/edit`)}
          >
            Edit
          </Button>
          <Button variant="primary" onClick={rotateKey} disabled={rotating}>
            <I.rotate width="14" height="14" />
            {rotating ? 'Rotating…' : 'Rotate API key'}
          </Button>
        </div>
      </div>

      {error && <div className="banner error">{error}</div>}

      <div className="kpi-grid">
        <KPI label="Price per access" value={formatUSDC(product.price)} unit="USDC" />
        <KPI label="Total revenue" value={analytics.totalRevenue} unit="USDC" accent />
        <KPI label="Revenue · 30d" value={analytics.revenue30d} unit="USDC" />
        <KPI label="Payments" value={analytics.paymentCount.toLocaleString()} />
      </div>

      <div className="row-2" style={{ marginBottom: 16 }}>
        <Card title="Configuration">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14, fontSize: 13 }}>
            <div>
              <div className="t-caption" style={{ marginBottom: 4 }}>Resource path</div>
              <span className="mono" style={{ color: 'var(--fg-1)' }}>
                {product.resource}
              </span>
            </div>
            <div>
              <div className="t-caption" style={{ marginBottom: 4 }}>API key</div>
              <CopyRow text={product.apiKey} />
            </div>
            <div>
              <div className="t-caption" style={{ marginBottom: 4 }}>Network</div>
              <Badge kind="tag" dot={false}>avalanche-fuji</Badge>
            </div>
            <div>
              <div className="t-caption" style={{ marginBottom: 4 }}>Created</div>
              <span style={{ color: 'var(--fg-2)' }}>
                {new Date(product.createdAt).toLocaleDateString()}
              </span>
            </div>
          </div>
        </Card>

        <Card title="Integration · 3 steps" sub="Drop-in middleware for your endpoint">
          <div className="code-block">
            <span className="c"># 1. Install the SDK</span>{'\n'}
            <span className="k">npm</span> install @web3nz/paywall-middleware{'\n\n'}
            <span className="c"># 2. Wrap your endpoint</span>{'\n'}
            <span className="k">import</span> {'{ createPaywall }'} <span className="k">from</span>{' '}
            <span className="s">'@web3nz/paywall-middleware'</span>{'\n'}
            <span className="k">const</span> paywall = createPaywall(process.env.PRODUCT_API_KEY){'\n'}
            app.get(<span className="s">'{product.resource}'</span>, paywall.protect(), handler){'\n\n'}
            <span className="c"># 3. Done. Payments settle on-chain.</span>
          </div>
        </Card>
      </div>

      <Card
        title="Payment history"
        sub={`${payments.length} most recent`}
        padded={false}
      >
        <PaymentTable
          payments={payments}
          emptyMessage="No payments recorded for this product yet."
        />
      </Card>
    </>
  );
}
