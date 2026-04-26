import { useState } from 'react';
import { apiRequest } from '../api';
import { Button, I } from '../components/glyde';
import { ProductForm, type ProductFormValues } from '../components/ProductForm';
import type { Product } from '../types';

interface ProductNewPageProps {
  token: string;
  onNavigate: (path: string) => void;
}

export function ProductNewPage({ token, onNavigate }: ProductNewPageProps) {
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function createProduct(values: ProductFormValues) {
    setSaving(true);
    setError(null);

    try {
      const response = await apiRequest<{ product: Product }>(
        '/api/products',
        { method: 'POST', body: JSON.stringify(values) },
        token,
      );
      onNavigate(`/dashboard/products/${response.product.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create product');
    } finally {
      setSaving(false);
    }
  }

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
          <h1>Create product</h1>
          <p>Configure a payable endpoint with pricing and an API key.</p>
        </div>
      </div>

      {error && <div className="banner error">{error}</div>}

      <ProductForm
        submitLabel="Create product"
        saving={saving}
        onSubmit={createProduct}
        onCancel={() => onNavigate('/dashboard/products')}
      />
    </>
  );
}
