import { useCallback, useEffect, useMemo, useState } from 'react';
import { apiRequest } from '../api';
import { ProductForm, type ProductFormValues } from '../components/ProductForm';
import type { Product, ProductDetails } from '../types';

interface ProductEditPageProps {
  token: string;
  productId: string;
  onNavigate: (path: string) => void;
}

export function ProductEditPage({ token, productId, onNavigate }: ProductEditPageProps) {
  const [product, setProduct] = useState<Product | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const loadProduct = useCallback(async () => {
    try {
      const response = await apiRequest<ProductDetails>(`/api/products/${productId}`, {}, token);
      setProduct(response.product);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load product');
    }
  }, [productId, token]);

  useEffect(() => {
    loadProduct();
  }, [loadProduct]);

  const initialValues = useMemo<ProductFormValues | undefined>(() => {
    if (!product) return undefined;
    return {
      name: product.name,
      description: product.description,
      price: product.price,
      status: product.status,
    };
  }, [product]);

  async function saveProduct(values: ProductFormValues) {
    setSaving(true);
    setError(null);

    try {
      await apiRequest<{ product: Product }>(
        `/api/products/${productId}`,
        {
          method: 'PUT',
          body: JSON.stringify(values),
        },
        token,
      );
      onNavigate(`/dashboard/products/${productId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update product');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <h2 className="text-3xl font-bold mb-2">Edit Product</h2>
      <p className="text-gray-400 mb-8 text-sm">Change product metadata, status, or payment gateway pricing.</p>

      {error && (
        <div className="bg-red-900/40 border border-red-700 rounded p-3 mb-6 text-red-300 text-sm">
          {error}
        </div>
      )}

      {initialValues ? (
        <ProductForm
          initialValues={initialValues}
          submitLabel="Save changes"
          saving={saving}
          onSubmit={saveProduct}
          onCancel={() => onNavigate(`/dashboard/products/${productId}`)}
        />
      ) : (
        <p className="text-gray-500 text-sm">Loading product...</p>
      )}
    </div>
  );
}
