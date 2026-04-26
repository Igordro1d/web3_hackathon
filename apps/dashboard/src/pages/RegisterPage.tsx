import { type FormEvent, useState } from 'react';
import { apiRequest } from '../api';
import { Button, I, Logo } from '../components/glyde';
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
    <div className="login-stage">
      <div className="login-bg" />
      <form className="login-card" onSubmit={submit}>
        <div className="brand-row">
          <Logo height={40} />
        </div>
        <h1>Create merchant account</h1>
        <p className="subtitle">Configure the receiving wallet used across your products.</p>

        {error && (
          <div className="banner error" style={{ marginBottom: 16 }}>
            {error}
          </div>
        )}

        <div className="field">
          <label>Email</label>
          <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" required />
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
        <div className="field" style={{ marginTop: 14 }}>
          <label>Receiving wallet</label>
          <input
            className="mono"
            value={walletAddress}
            onChange={(e) => setWalletAddress(e.target.value)}
            placeholder="0x… or ENS"
          />
          <div className="hint">USDC payments will land at this address.</div>
        </div>

        <Button
          variant="accent"
          type="submit"
          disabled={loading}
          style={{ width: '100%', marginTop: 18, padding: '11px' }}
        >
          {loading ? 'Creating…' : 'Create account'} <I.arrow width="14" height="14" />
        </Button>

        <div className="alt">
          <button type="button" onClick={() => onNavigate('/')}>
            Back to sign in
          </button>
        </div>
      </form>
    </div>
  );
}
