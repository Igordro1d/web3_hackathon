import { FormEvent, useEffect, useState } from 'react';
import type { Product } from '../types';

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
    <form onSubmit={submit} className="bg-gray-800 rounded-xl p-6 max-w-2xl space-y-4">
      <label className="block text-sm">
        <span className="text-gray-300">Product name</span>
        <input
          required
          value={values.name}
          onChange={(event) => setValues((current) => ({ ...current, name: event.target.value }))}
          className="mt-1 w-full rounded bg-gray-950 border border-gray-700 px-3 py-2 text-gray-100"
        />
      </label>

      <label className="block text-sm">
        <span className="text-gray-300">Description</span>
        <textarea
          required
          rows={4}
          value={values.description}
          onChange={(event) => setValues((current) => ({ ...current, description: event.target.value }))}
          className="mt-1 w-full rounded bg-gray-950 border border-gray-700 px-3 py-2 text-gray-100"
        />
      </label>

      <label className="block text-sm">
        <span className="text-gray-300">Price per access, USDC base units</span>
        <input
          required
          inputMode="numeric"
          value={values.price}
          onChange={(event) => setValues((current) => ({ ...current, price: event.target.value }))}
          placeholder="1000000"
          className="mt-1 w-full rounded bg-gray-950 border border-gray-700 px-3 py-2 text-gray-100"
        />
      </label>

      <label className="block text-sm">
        <span className="text-gray-300">Status</span>
        <select
          value={values.status}
          onChange={(event) =>
            setValues((current) => ({
              ...current,
              status: event.target.value === 'inactive' ? 'inactive' : 'active',
            }))
          }
          className="mt-1 w-full rounded bg-gray-950 border border-gray-700 px-3 py-2 text-gray-100"
        >
          <option value="active">active</option>
          <option value="inactive">inactive</option>
        </select>
      </label>

      <div className="flex flex-wrap gap-3">
        <button
          type="submit"
          disabled={saving}
          className="rounded bg-green-500 px-4 py-2 text-sm font-semibold text-gray-950 disabled:opacity-60"
        >
          {saving ? 'Saving...' : submitLabel}
        </button>
        <button type="button" onClick={onCancel} className="rounded bg-gray-700 px-4 py-2 text-sm text-gray-100">
          Cancel
        </button>
      </div>
    </form>
  );
}
