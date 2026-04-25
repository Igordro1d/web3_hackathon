import { useEffect, useMemo, useState } from 'react';
import { apiRequest } from './api';
import { AppShell } from './components/AppShell';
import { DashboardPage } from './pages/DashboardPage';
import { ForgotPasswordPage } from './pages/ForgotPasswordPage';
import { LoginPage } from './pages/LoginPage';
import { ProductDetailPage } from './pages/ProductDetailPage';
import { ProductEditPage } from './pages/ProductEditPage';
import { ProductNewPage } from './pages/ProductNewPage';
import { ProductsPage } from './pages/ProductsPage';
import { RegisterPage } from './pages/RegisterPage';
import { SettingsPage } from './pages/SettingsPage';
import type { AuthResponse, UserProfile } from './types';

const TOKEN_KEY = 'dashboard_token';

type Route =
  | { name: 'login' }
  | { name: 'register' }
  | { name: 'forgotPassword' }
  | { name: 'dashboard' }
  | { name: 'products' }
  | { name: 'productNew' }
  | { name: 'productDetail'; productId: string }
  | { name: 'productEdit'; productId: string }
  | { name: 'settings' };

function parseRoute(pathname: string): Route {
  if (pathname === '/register') return { name: 'register' };
  if (pathname === '/forgot-password') return { name: 'forgotPassword' };
  if (pathname === '/dashboard') return { name: 'dashboard' };
  if (pathname === '/dashboard/products') return { name: 'products' };
  if (pathname === '/dashboard/products/new') return { name: 'productNew' };
  if (pathname === '/dashboard/settings') return { name: 'settings' };

  const editMatch = pathname.match(/^\/dashboard\/products\/([^/]+)\/edit$/);
  if (editMatch?.[1]) return { name: 'productEdit', productId: editMatch[1] };

  const detailMatch = pathname.match(/^\/dashboard\/products\/([^/]+)$/);
  if (detailMatch?.[1]) return { name: 'productDetail', productId: detailMatch[1] };

  return { name: 'login' };
}

function isAuthRoute(route: Route) {
  return route.name === 'login' || route.name === 'register' || route.name === 'forgotPassword';
}

export default function App() {
  const [path, setPath] = useState(window.location.pathname);
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY) ?? '');
  const [user, setUser] = useState<UserProfile | null>(null);
  const [sessionLoading, setSessionLoading] = useState(Boolean(localStorage.getItem(TOKEN_KEY)));

  const route = useMemo(() => parseRoute(path), [path]);

  function navigate(nextPath: string) {
    window.history.pushState({}, '', nextPath);
    setPath(nextPath);
  }

  function handleAuthenticated(response: AuthResponse) {
    localStorage.setItem(TOKEN_KEY, response.token);
    setToken(response.token);
    setUser(response.user);
    navigate('/dashboard');
  }

  function logout() {
    localStorage.removeItem(TOKEN_KEY);
    setToken('');
    setUser(null);
    navigate('/');
  }

  useEffect(() => {
    function onPopState() {
      setPath(window.location.pathname);
    }

    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  useEffect(() => {
    if (!token) {
      setSessionLoading(false);
      setUser(null);
      return;
    }

    let active = true;
    setSessionLoading(true);

    apiRequest<{ user: UserProfile }>('/api/auth/me', {}, token)
      .then((response) => {
        if (!active) return;
        setUser(response.user);
      })
      .catch(() => {
        if (!active) return;
        localStorage.removeItem(TOKEN_KEY);
        setToken('');
        setUser(null);
      })
      .finally(() => {
        if (!active) return;
        setSessionLoading(false);
      });

    return () => {
      active = false;
    };
  }, [token]);

  useEffect(() => {
    if (sessionLoading) return;

    if (!token && !isAuthRoute(route)) {
      navigate('/');
      return;
    }

    if (token && isAuthRoute(route)) {
      navigate('/dashboard');
    }
  }, [route, sessionLoading, token]);

  if (sessionLoading) {
    return (
      <div className="min-h-screen bg-gray-950 text-gray-400 flex items-center justify-center">
        Loading session...
      </div>
    );
  }

  if (!token || !user) {
    if (route.name === 'register') {
      return <RegisterPage onAuthenticated={handleAuthenticated} onNavigate={navigate} />;
    }

    if (route.name === 'forgotPassword') {
      return <ForgotPasswordPage onNavigate={navigate} />;
    }

    return <LoginPage onAuthenticated={handleAuthenticated} onNavigate={navigate} />;
  }

  return (
    <AppShell user={user} currentPath={path} onNavigate={navigate} onLogout={logout}>
      {route.name === 'dashboard' && <DashboardPage token={token} />}
      {route.name === 'products' && <ProductsPage token={token} onNavigate={navigate} />}
      {route.name === 'productNew' && <ProductNewPage token={token} onNavigate={navigate} />}
      {route.name === 'productDetail' && (
        <ProductDetailPage token={token} productId={route.productId} onNavigate={navigate} />
      )}
      {route.name === 'productEdit' && (
        <ProductEditPage token={token} productId={route.productId} onNavigate={navigate} />
      )}
      {route.name === 'settings' && (
        <SettingsPage token={token} user={user} onUserUpdate={setUser} onLoggedOut={logout} />
      )}
      {isAuthRoute(route) && <DashboardPage token={token} />}
    </AppShell>
  );
}
