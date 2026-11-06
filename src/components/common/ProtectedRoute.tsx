import { useAuth } from '@/features/auth';

interface ProtectedRouteProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function ProtectedRoute({ children, fallback }: ProtectedRouteProps) {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return <div className="flex h-full items-center justify-center">Loading...</div>;
  }

  if (!isAuthenticated) {
    return fallback || null;
  }

  return <>{children}</>;
}
