import { Button } from '@/components/ui/Button';
import { NavLink } from 'react-router-dom';
import { FileQuestion, ShieldAlert, Home, ArrowLeft } from 'lucide-react';
import { ROUTES } from '@/constants';

export function NotFoundPage() {
  return (
    <div className="flex min-h-[70vh] items-center justify-center px-4 py-12">
      <div className="w-full max-w-md text-center">
        <div className="rounded-xl border border-border bg-surface p-8 shadow-xs">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-xl border border-border bg-surface-3 text-text-muted">
            <FileQuestion className="h-8 w-8 stroke-[1.5]" aria-hidden="true" />
          </div>
          <span className="block text-4xl font-extrabold tracking-tight text-brand">404</span>
          <h1 className="mt-2 text-xl font-bold text-text-primary">Page not found</h1>
          <p className="mx-auto mt-2 max-w-xs text-sm leading-relaxed text-text-secondary">
            The page or resource you requested could not be located on our store.
          </p>
          <div className="pt-6">
            <Button asChild>
              <NavLink to={ROUTES.HOME}>
                <Home className="h-4 w-4" aria-hidden="true" />
                Return Home
              </NavLink>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function UnauthorizedPage() {
  return (
    <div className="flex min-h-[70vh] items-center justify-center px-4 py-12">
      <div className="w-full max-w-md text-center">
        <div className="rounded-xl border border-border bg-surface p-8 shadow-xs">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-xl border border-danger-soft-border bg-danger-soft text-danger">
            <ShieldAlert className="h-8 w-8 stroke-[1.5]" aria-hidden="true" />
          </div>
          <span className="block text-4xl font-extrabold tracking-tight text-danger">403</span>
          <h1 className="mt-2 text-xl font-bold text-text-primary">Access restricted</h1>
          <p className="mx-auto mt-2 max-w-xs text-sm leading-relaxed text-text-secondary">
            Your staff role does not carry the permissions needed for this section.
          </p>
          <div className="pt-6">
            <Button asChild>
              <NavLink to={ROUTES.APP_DASHBOARD}>
                <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                Return to Dashboard
              </NavLink>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
