import { useCallback, useEffect, useMemo, useState } from 'react';
import { apiRequest } from '../api';
import { Button, I } from '../components/glyde';
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
        { method: 'PUT', body: JSON.stringify(values) },
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
    <>
      <div style={{ marginBottom: 14 }}>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onNavigate(`/dashboard/products/${productId}`)}
        >
          <I.back width="14" height="14" />
          Back to product
        </Button>
      </div>

      <div className="page-head">
        <div>
          <h1>Edit product</h1>
          <p>Change product metadata, status, or payment gateway pricing.</p>
        </div>
      </div>

      {error && <div className="banner error">{error}</div>}

      {initialValues ? (
        <ProductForm
          initialValues={initialValues}
          submitLabel="Save changes"
          saving={saving}
          onSubmit={saveProduct}
          onCancel={() => onNavigate(`/dashboard/products/${productId}`)}
        />
      ) : (
        <div className="empty">Loading product…</div>
      )}
    </>
  );
}
