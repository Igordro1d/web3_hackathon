import { useState } from 'react';
import { apiRequest } from '../api';
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
        {
          method: 'POST',
          body: JSON.stringify(values),
        },
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
    <div>
      <h2 className="text-3xl font-bold mb-2">Create Product</h2>
      <p className="text-gray-400 mb-8 text-sm">Configure a payable endpoint with pricing and an API key.</p>

      {error && (
        <div className="bg-red-900/40 border border-red-700 rounded p-3 mb-6 text-red-300 text-sm">
          {error}
        </div>
      )}

      <ProductForm
        submitLabel="Create product"
        saving={saving}
        onSubmit={createProduct}
        onCancel={() => onNavigate('/dashboard/products')}
      />
    </div>
  );
}
