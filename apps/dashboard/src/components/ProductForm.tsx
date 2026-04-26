import { type FormEvent, useEffect, useState } from 'react';
import type { Product } from '../types';
import { Button, Card } from './glyde';

export interface ProductFormValues {
  name: string;
  description: string;
  price: string;
  status: Product['status'];
}

interface ProductFormProps {
  initialValues?: ProductFormValues;
  submitLabel: string;
  saving: boolean;
  onSubmit: (values: ProductFormValues) => Promise<void>;
  onCancel: () => void;
}

const emptyValues: ProductFormValues = {
  name: '',
  description: '',
  price: '',
  status: 'active',
};

export function ProductForm({
  initialValues = emptyValues,
  submitLabel,
  saving,
  onSubmit,
  onCancel,
}: ProductFormProps) {
  const [values, setValues] = useState<ProductFormValues>(initialValues);

  useEffect(() => {
    setValues(initialValues);
  }, [initialValues]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await onSubmit(values);
  }

  return (
    <form onSubmit={submit} style={{ maxWidth: 640 }}>
      <Card title="Product details">
        <div className="stack">
          <div className="field">
            <label>Name</label>
            <input
              required
              value={values.name}
              onChange={(e) => setValues((c) => ({ ...c, name: e.target.value }))}
            />
          </div>

          <div className="field">
            <label>Description</label>
            <textarea
              required
              rows={4}
              value={values.description}
              onChange={(e) => setValues((c) => ({ ...c, description: e.target.value }))}
            />
          </div>

          <div className="field">
            <label>Price · USDC base units (6 decimals)</label>
            <input
              required
              inputMode="numeric"
              className="mono"
              value={values.price}
              onChange={(e) => setValues((c) => ({ ...c, price: e.target.value }))}
              placeholder="1000000"
            />
            <div className="hint">e.g. 10000 = 0.01 USDC. The agent pays this much per request.</div>
          </div>

          <div className="field">
            <label>Status</label>
            <select
              value={values.status}
              onChange={(e) =>
                setValues((c) => ({
                  ...c,
                  status: e.target.value === 'inactive' ? 'inactive' : 'active',
                }))
              }
            >
              <option value="active">active</option>
              <option value="inactive">inactive</option>
            </select>
          </div>
        </div>
      </Card>

      <div className="flex-end" style={{ marginTop: 16 }}>
        <Button variant="ghost" type="button" onClick={onCancel}>
          Cancel
        </Button>
        <Button variant="accent" type="submit" disabled={saving}>
          {saving ? 'Saving…' : submitLabel}
        </Button>
      </div>
    </form>
  );
}
