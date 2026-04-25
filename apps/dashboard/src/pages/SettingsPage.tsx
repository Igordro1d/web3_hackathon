import { FormEvent, useEffect, useState } from 'react';
import { apiRequest } from '../api';
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
  const [network, setNetwork] = useState(user.network);
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
    <div>
      <h2 className="text-3xl font-bold mb-2">Account Settings</h2>
      <p className="text-gray-400 mb-8 text-sm">Manage receiving wallet, email, and account security settings.</p>

      {message && (
        <div className="bg-green-900/30 border border-green-700 rounded p-3 mb-6 text-green-300 text-sm">
          {message}
        </div>
      )}
      {error && (
        <div className="bg-red-900/40 border border-red-700 rounded p-3 mb-6 text-red-300 text-sm">
          {error}
        </div>
      )}

      <form onSubmit={saveSettings} className="bg-gray-800 rounded-xl p-6 max-w-2xl space-y-4">
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
          <span className="text-gray-300">Receiving wallet address</span>
          <input
            value={walletAddress}
            onChange={(event) => setWalletAddress(event.target.value)}
            placeholder="0x... or ENS"
            className="mt-1 w-full rounded bg-gray-950 border border-gray-700 px-3 py-2 text-gray-100"
          />
        </label>

        <label className="block text-sm">
          <span className="text-gray-300">Payment network</span>
          <select
            value={network}
            onChange={(event) =>
              setNetwork(event.target.value === 'avalanche' ? 'avalanche' : 'avalanche-fuji')
            }
            className="mt-1 w-full rounded bg-gray-950 border border-gray-700 px-3 py-2 text-gray-100"
          >
            <option value="avalanche-fuji">avalanche-fuji</option>
            <option value="avalanche">avalanche</option>
          </select>
        </label>

        <label className="flex items-center gap-3 text-sm text-gray-300">
          <input
            type="checkbox"
            checked={twoFactorEnabled}
            onChange={(event) => setTwoFactorEnabled(event.target.checked)}
            className="h-4 w-4"
          />
          Two-factor authentication
        </label>

        <label className="flex items-center gap-3 text-sm text-gray-300">
          <input
            type="checkbox"
            checked={passkeysEnabled}
            onChange={(event) => setPasskeysEnabled(event.target.checked)}
            className="h-4 w-4"
          />
          Passkeys
        </label>

        <div className="flex flex-wrap gap-3 pt-2">
          <button
            type="submit"
            disabled={saving}
            className="rounded bg-green-500 px-4 py-2 text-sm font-semibold text-gray-950 disabled:opacity-60"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
          <button type="button" onClick={deleteAccount} className="rounded bg-red-700 px-4 py-2 text-sm text-red-100">
            Delete Account
          </button>
        </div>
      </form>
    </div>
  );
}
