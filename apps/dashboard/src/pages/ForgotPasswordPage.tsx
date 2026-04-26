import { type FormEvent, useState } from 'react';
import { apiRequest } from '../api';
import { Button, I, Logo } from '../components/glyde';

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
    <div className="login-stage">
      <div className="login-bg" />
      <form className="login-card" onSubmit={submit}>
        <div className="brand-row">
          <Logo height={40} />
        </div>
        <h1>Reset password</h1>
        <p className="subtitle">Enter your merchant email to start the reset flow.</p>

        {message && (
          <div className="banner success" style={{ marginBottom: 16 }}>
            {message}
          </div>
        )}
        {error && (
          <div className="banner error" style={{ marginBottom: 16 }}>
            {error}
          </div>
        )}

        <div className="field">
          <label>Email</label>
          <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" required />
        </div>

        <Button
          variant="accent"
          type="submit"
          disabled={loading}
          style={{ width: '100%', marginTop: 18, padding: '11px' }}
        >
          {loading ? 'Sending…' : 'Send reset email'} <I.arrow width="14" height="14" />
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
