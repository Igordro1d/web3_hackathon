import { FormEvent, useState } from 'react';
import { apiRequest } from '../api';

interface ForgotPasswordPageProps {
  onNavigate: (path: string) => void;
}

export function ForgotPasswordPage({ onNavigate }: ForgotPasswordPageProps) {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      const response = await apiRequest<{ message: string }>('/api/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email }),
      });
      setMessage(response.message);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not start password reset');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-gray-800 rounded-xl p-6">
        <h1 className="text-3xl font-bold mb-2">Reset password</h1>
        <p className="text-gray-400 mb-6 text-sm">Enter your merchant email to start the reset flow.</p>

        {message && (
          <div className="bg-green-900/30 border border-green-700 rounded p-3 mb-4 text-green-300 text-sm">
            {message}
          </div>
        )}
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
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded bg-green-500 px-3 py-2 text-sm font-semibold text-gray-950 disabled:opacity-60"
          >
            {loading ? 'Sending...' : 'Send reset email'}
          </button>
        </form>

        <button type="button" onClick={() => onNavigate('/')} className="mt-5 text-sm text-green-400 hover:text-green-300">
          Back to login
        </button>
      </div>
    </div>
  );
}
