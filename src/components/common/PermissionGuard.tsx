import { useAuth } from '@/features/auth';

interface PermissionGuardProps {
  permission: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function PermissionGuard({
  permission,
  children,
  fallback,
}: PermissionGuardProps) {
  const { hasPermission, loading } = useAuth();

  if (loading) {
    return <div className="flex h-full items-center justify-center">Loading...</div>;
  }

  if (!hasPermission(permission)) {
    return fallback || null;
  }

  return <>{children}</>;
}
