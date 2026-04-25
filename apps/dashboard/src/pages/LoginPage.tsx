import { FormEvent, useState } from 'react';
import { apiRequest } from '../api';
import type { AuthResponse } from '../types';

interface LoginPageProps {
  onAuthenticated: (response: AuthResponse) => void;
  onNavigate: (path: string) => void;
}

export function LoginPage({ onAuthenticated, onNavigate }: LoginPageProps) {
  const [email, setEmail] = useState('merchant@example.com');
  const [password, setPassword] = useState('password123');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await apiRequest<AuthResponse>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      onAuthenticated(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-gray-800 rounded-xl p-6">
        <h1 className="text-3xl font-bold mb-2">x402 Payment Gateway</h1>
        <p className="text-gray-400 mb-6 text-sm">Merchant login for products, API keys, and payment activity.</p>

        {error && (
          <div className="bg-red-900/40 border border-red-700 rounded p-3 mb-4 text-red-300 text-sm">
            {error}
          </div>
        )}

        <form className="space-y-4" onSubmit={submit}>
          <label className="block text-sm">
            <span className="text-gray-300">Email</span>
            <input
              type="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="mt-1 w-full rounded bg-gray-950 border border-gray-700 px-3 py-2 text-gray-100"
            />
          </label>
          <label className="block text-sm">
            <span className="text-gray-300">Password</span>
            <input
              type="password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="mt-1 w-full rounded bg-gray-950 border border-gray-700 px-3 py-2 text-gray-100"
            />
          </label>
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded bg-green-500 px-3 py-2 text-sm font-semibold text-gray-950 disabled:opacity-60"
          >
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>

        <div className="mt-5 flex justify-between text-sm">
          <button type="button" onClick={() => onNavigate('/register')} className="text-green-400 hover:text-green-300">
            Register
          </button>
          <button type="button" onClick={() => onNavigate('/forgot-password')} className="text-green-400 hover:text-green-300">
            Forgot password
          </button>
        </div>
      </div>
    </div>
  );
}
