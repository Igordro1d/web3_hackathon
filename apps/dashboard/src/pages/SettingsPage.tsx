import { type FormEvent, useEffect, useState } from 'react';
import { apiRequest } from '../api';
import { Button, Card, Toggle } from '../components/glyde';
import type { UserProfile } from '../types';

interface SettingsPageProps {
  token: string;
  user: UserProfile;
  onUserUpdate: (user: UserProfile) => void;
  onLoggedOut: () => void;
}

export function SettingsPage({ token, user, onUserUpdate, onLoggedOut }: SettingsPageProps) {
  const [email, setEmail] = useState(user.email);
  const [walletAddress, setWalletAddress] = useState(user.walletAddress);
  const [network, setNetwork] = useState<UserProfile['network']>(user.network);
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(user.twoFactorEnabled);
  const [passkeysEnabled, setPasskeysEnabled] = useState(user.passkeysEnabled);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setEmail(user.email);
    setWalletAddress(user.walletAddress);
    setNetwork(user.network);
    setTwoFactorEnabled(user.twoFactorEnabled);
    setPasskeysEnabled(user.passkeysEnabled);
  }, [user]);

  async function saveSettings(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage(null);
    setError(null);

    try {
      const response = await apiRequest<UserProfile>(
        '/api/settings',
        {
          method: 'PUT',
          body: JSON.stringify({ email, walletAddress, network, twoFactorEnabled, passkeysEnabled }),
        },
        token,
      );
      onUserUpdate(response);
      setMessage('Settings updated.');
      window.setTimeout(() => setMessage(null), 2400);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update settings');
    } finally {
      setSaving(false);
    }
  }

  async function deleteAccount() {
    const confirmed = window.confirm('Delete this account and all products? This cannot be undone.');
    if (!confirmed) return;

    setMessage(null);
    setError(null);

    try {
      await apiRequest<{ deleted: boolean }>('/api/account/delete', { method: 'POST' }, token);
      onLoggedOut();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not delete account');
    }
  }

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Settings</h1>
          <p>Manage your receiving wallet, payment network, and security.</p>
        </div>
      </div>

      {message && <div className="banner success">{message}</div>}
      {error && <div className="banner error">{error}</div>}

      <div className="row-2" style={{ alignItems: 'flex-start' }}>
        <form onSubmit={saveSettings} className="stack">
          <Card title="Account">
            <div className="stack">
              <div className="field">
                <label>Email</label>
                <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" />
              </div>
            </div>
          </Card>

          <Card title="Receiving wallet" sub="Where USDC settles for every payment">
            <div className="stack">
              <div className="field">
                <label>Wallet address</label>
                <input
                  className="mono"
                  value={walletAddress}
                  onChange={(e) => setWalletAddress(e.target.value)}
                  placeholder="0x… or ENS"
                />
                <div className="hint">Paste a 0x address or ENS name. Changes apply on next payment.</div>
              </div>
              <div className="field">
                <label>Payment network</label>
                <select
                  value={network}
                  onChange={(e) =>
                    setNetwork(e.target.value === 'avalanche' ? 'avalanche' : 'avalanche-fuji')
                  }
                >
                  <option value="avalanche-fuji">avalanche-fuji · testnet</option>
                  <option value="avalanche">avalanche · mainnet</option>
                </select>
              </div>
            </div>
          </Card>

          <Card title="Security">
            <div className="stack">
              <Toggle
                on={twoFactorEnabled}
                onChange={setTwoFactorEnabled}
                label="Two-factor authentication"
              />
              <Toggle on={passkeysEnabled} onChange={setPasskeysEnabled} label="Passkeys" />
            </div>
          </Card>

          <div className="flex-end">
            <Button variant="ghost" type="button">
              Cancel
            </Button>
            <Button variant="accent" type="submit" disabled={saving}>
              {saving ? 'Saving…' : 'Save changes'}
            </Button>
          </div>
        </form>

        <div className="stack">
          <Card title="Danger zone">
            <p style={{ fontSize: 12, color: 'var(--fg-3)', margin: '0 0 12px' }}>
              Deleting your account removes all products and revokes API keys. This cannot be undone.
            </p>
            <Button variant="danger" onClick={deleteAccount}>
              Delete account
            </Button>
          </Card>
        </div>
      </div>
    </>
  );
}
