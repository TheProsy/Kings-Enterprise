import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/features/auth';
import { ROUTES } from '@/constants';

export function FullPageLoader() {
  return (
    <div
      className="flex min-h-screen flex-col items-center justify-center gap-4 bg-canvas text-center"
      role="status"
      aria-live="polite"
    >
      <div className="h-10 w-10 animate-spin rounded-full border-2 border-border border-t-brand" />
      <p className="text-sm font-medium text-text-secondary">Loading your store…</p>
    </div>
  );
}

export function RequireSession({ children }: { children: ReactNode }) {
  const { loading, isAuthenticated } = useAuth();

  if (loading) return <FullPageLoader />;
  if (!isAuthenticated) return <Navigate to={ROUTES.LOGIN} replace />;
  return <>{children}</>;
}

export function RequirePermission({
  permission,
  children,
}: {
  permission: string;
  children: ReactNode;
}) {
  const { loading, hasPermission } = useAuth();

  if (loading) return <FullPageLoader />;
  if (!hasPermission(permission)) {
    return <Navigate to={ROUTES.UNAUTHORIZED} replace />;
  }
  return <>{children}</>;
}

export function RequireGuest({ children }: { children: ReactNode }) {
  const { loading, isAuthenticated } = useAuth();

  if (loading) return <FullPageLoader />;
  if (isAuthenticated) return <Navigate to={ROUTES.APP_DASHBOARD} replace />;
  return <>{children}</>;
}
