import type { ReactNode } from 'react';
import type { UserProfile } from '../types';

interface AppShellProps {
  user: UserProfile;
  currentPath: string;
  onNavigate: (path: string) => void;
  onLogout: () => void;
  children: ReactNode;
}

const navItems = [
  { label: 'Overview', path: '/dashboard' },
  { label: 'Products', path: '/dashboard/products' },
  { label: 'Settings', path: '/dashboard/settings' },
];

export function AppShell({ user, currentPath, onNavigate, onLogout, children }: AppShellProps) {
  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <header className="border-b border-gray-800 bg-gray-950/95">
        <div className="max-w-6xl mx-auto px-6 py-5 flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-2xl font-bold">x402 Payment Gateway</h1>
            <p className="text-gray-400 text-sm">{user.email}</p>
          </div>
          <nav className="flex w-full flex-wrap gap-3 rounded-xl border border-gray-800 bg-gray-900/70 p-2 lg:w-auto">
            {navItems.map((item) => {
              const active =
                currentPath === item.path ||
                (item.path !== '/dashboard' && currentPath.startsWith(item.path));
              return (
                <button
                  key={item.path}
                  type="button"
                  onClick={() => onNavigate(item.path)}
                  className={`min-w-[118px] flex-1 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors sm:flex-none ${
                    active
                      ? 'bg-green-500 text-gray-950'
                      : 'bg-gray-800 text-gray-200 hover:bg-gray-700'
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
            <button
              type="button"
              onClick={onLogout}
              className="min-w-[118px] flex-1 rounded-lg px-4 py-2.5 text-sm font-medium bg-gray-800 text-gray-200 transition-colors hover:bg-gray-700 sm:flex-none"
            >
              Logout
            </button>
          </nav>
        </div>
      </header>
      <main className="max-w-6xl mx-auto p-6">{children}</main>
    </div>
  );
}
