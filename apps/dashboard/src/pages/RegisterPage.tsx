import { FormEvent, useState } from 'react';
import { apiRequest } from '../api';
import type { AuthResponse } from '../types';

interface RegisterPageProps {
  onAuthenticated: (response: AuthResponse) => void;
  onNavigate: (path: string) => void;
}

export function RegisterPage({ onAuthenticated, onNavigate }: RegisterPageProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [walletAddress, setWalletAddress] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await apiRequest<AuthResponse>('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({ email, password, walletAddress }),
      });
      onAuthenticated(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-gray-800 rounded-xl p-6">
        <h1 className="text-3xl font-bold mb-2">Create merchant account</h1>
        <p className="text-gray-400 mb-6 text-sm">Configure the receiving wallet used across your products.</p>

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
          <label className="block text-sm">
            <span className="text-gray-300">Receiving wallet</span>
            <input
              value={walletAddress}
              onChange={(event) => setWalletAddress(event.target.value)}
              placeholder="0x... or ENS"
              className="mt-1 w-full rounded bg-gray-950 border border-gray-700 px-3 py-2 text-gray-100"
            />
          </label>
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded bg-green-500 px-3 py-2 text-sm font-semibold text-gray-950 disabled:opacity-60"
          >
            {loading ? 'Creating...' : 'Register'}
          </button>
        </form>

        <button type="button" onClick={() => onNavigate('/')} className="mt-5 text-sm text-green-400 hover:text-green-300">
          Back to login
        </button>
      </div>
    </div>
  );
}
