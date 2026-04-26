import { type FormEvent, useState } from 'react';
import { apiRequest } from '../api';
import { Button, I, Logo } from '../components/glyde';
import type { AuthResponse } from '../types';

interface LoginPageProps {
  onAuthenticated: (response: AuthResponse) => void;
  onNavigate: (path: string) => void;
}

export function LoginPage({ onAuthenticated, onNavigate }: LoginPageProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
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
    <div className="login-stage">
      <div className="login-bg" />
      <form className="login-card" onSubmit={submit}>
        <div className="brand-row">
          <Logo height={40} />
        </div>
        <h1>Sign in to your dashboard</h1>
        <p className="subtitle">Merchant access for products, API keys, and payment activity.</p>

        {error && (
          <div className="banner error" style={{ marginBottom: 16 }}>
            {error}
          </div>
        )}

        <div className="field">
          <label>Email</label>
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            type="email"
            required
          />
        </div>
        <div className="field" style={{ marginTop: 14 }}>
          <label>Password</label>
          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type="password"
            required
          />
        </div>

        <Button
          variant="accent"
          type="submit"
          disabled={loading}
          style={{ width: '100%', marginTop: 18, padding: '11px' }}
        >
          {loading ? 'Signing in…' : 'Sign in'} <I.arrow width="14" height="14" />
        </Button>

        <div className="alt">
          <button type="button" onClick={() => onNavigate('/register')}>
            Create account
          </button>
          <button type="button" onClick={() => onNavigate('/forgot-password')}>
            Forgot password
          </button>
        </div>
      </form>
    </div>
  );
}
