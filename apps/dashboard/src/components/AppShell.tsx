import type { ReactNode } from 'react';
import { AddressDisplay, I, Logo } from './glyde';
import type { UserProfile } from '../types';

interface AppShellProps {
  user: UserProfile;
  currentPath: string;
  onNavigate: (path: string) => void;
  onLogout: () => void;
  children: ReactNode;
}

interface NavItem {
  id: string;
  label: string;
  path: string;
  icon: (p: React.SVGProps<SVGSVGElement>) => JSX.Element;
}

const NAV: NavItem[] = [
  { id: 'overview', label: 'Overview', path: '/dashboard', icon: I.home },
  { id: 'products', label: 'Products', path: '/dashboard/products', icon: I.cube },
];

const ROUTE_LABELS: Record<string, string> = {
  '/dashboard': 'Overview',
  '/dashboard/products': 'Products',
  '/dashboard/products/new': 'New product',
  '/dashboard/settings': 'Settings',
};

function getCrumb(currentPath: string): { name: string; productId?: string } {
  const editMatch = currentPath.match(/^\/dashboard\/products\/([^/]+)\/edit$/);
  if (editMatch?.[1]) return { name: 'Edit product', productId: editMatch[1] };

  const detailMatch = currentPath.match(/^\/dashboard\/products\/([^/]+)$/);
  if (detailMatch?.[1] && detailMatch[1] !== 'new') {
    return { name: 'Product', productId: detailMatch[1] };
  }

  return { name: ROUTE_LABELS[currentPath] ?? 'Dashboard' };
}

function isNavActive(navPath: string, currentPath: string): boolean {
  if (navPath === '/dashboard') return currentPath === '/dashboard';
  return currentPath === navPath || currentPath.startsWith(`${navPath}/`);
}

function Sidebar({
  currentPath,
  onNavigate,
  onLogout,
}: {
  currentPath: string;
  onNavigate: (path: string) => void;
  onLogout: () => void;
}) {
  return (
    <aside className="side">
      <div className="brand">
        <Logo height={48} />
      </div>
      {NAV.map((n) => {
        const Ic = n.icon;
        const active = isNavActive(n.path, currentPath);
        return (
          <div
            key={n.id}
            className={`nav-item ${active ? 'active' : ''}`}
            onClick={() => onNavigate(n.path)}
          >
            <Ic />
            {n.label}
          </div>
        );
      })}
      <div className="nav-group">Account</div>
      <div
        className={`nav-item ${currentPath === '/dashboard/settings' ? 'active' : ''}`}
        onClick={() => onNavigate('/dashboard/settings')}
      >
        <I.cog />
        Settings
      </div>
      <div className="side-foot">
        <div className="nav-item" onClick={onLogout}>
          <I.out />
          Sign out
        </div>
      </div>
    </aside>
  );
}

function TopBar({ currentPath, user }: { currentPath: string; user: UserProfile }) {
  const crumb = getCrumb(currentPath);
  const initial = user.email.charAt(0).toUpperCase();

  return (
    <div className="topbar">
      <span className="crumb">
        Dashboard / <b>{crumb.name}</b>
        {crumb.productId && (
          <>
            {' '}
            / <b style={{ color: 'var(--fg-2)' }}>{crumb.productId}</b>
          </>
        )}
      </span>
      <span className="topbar-spacer" />
      <span className="live-pill">
        <span className="dot" />
        {user.network}
      </span>
      <span className="user-chip">
        <span className="av">{initial}</span>
        <span className="user-copy">
          <span>{user.email}</span>
          <AddressDisplay address={user.walletAddress} className="user-wallet" />
        </span>
      </span>
    </div>
  );
}

export function AppShell({ user, currentPath, onNavigate, onLogout, children }: AppShellProps) {
  return (
    <div className="app">
      <Sidebar currentPath={currentPath} onNavigate={onNavigate} onLogout={onLogout} />
      <div className="main">
        <TopBar currentPath={currentPath} user={user} />
        <div className="content">{children}</div>
      </div>
    </div>
  );
}
