import { isRouteErrorResponse, useRouteError, Link } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { AlertTriangle } from 'lucide-react';
import { ROUTES } from '@/constants';

export function RouteErrorPage() {
  const error = useRouteError();
  const isResponse = isRouteErrorResponse(error);
  const message = isResponse
    ? `${error.status} ${error.statusText}`
    : error instanceof Error
      ? error.message
      : 'Something unexpected happened.';

  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas px-4 py-12">
      <div className="w-full max-w-lg rounded-xl border border-border bg-surface p-8 text-center shadow-xs sm:p-10">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl border border-danger-soft-border bg-danger-soft text-danger">
          <AlertTriangle className="h-7 w-7" aria-hidden="true" />
        </div>
        <p className="mb-2 text-3xl font-bold tracking-tight text-danger">Something broke</p>
        <h1 className="mb-2 text-lg font-semibold text-text-primary">
          This page ran into a problem
        </h1>
        <p className="mb-6 break-words text-sm text-text-secondary">{message}</p>
        <div className="flex flex-col justify-center gap-3 sm:flex-row">
          <Button onClick={() => window.location.reload()}>Reload page</Button>
          <Button variant="outline" asChild>
            <Link to={ROUTES.HOME}>Back to home</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
