import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '@/features/auth';
import { getAuthErrorMessage } from '@/features/auth/authErrors';
import { BUSINESS } from '@/config/business';
import { Mail, Lock, User, LogIn, Sun, Moon, ArrowLeft } from 'lucide-react';
import { useTheme } from '@/contexts/useTheme';
import { ROUTES } from '@/constants';
import { AuthLayout } from './AuthLayout';
import { BrandLogo } from '@/components/common/BrandLogo';

type Mode = 'login' | 'setup';

export function LoginPage() {
  const { login, signUpFirstTimeOwner, isAuthenticated, loading, authError, clearAuthError } =
    useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && isAuthenticated) {
      navigate(ROUTES.APP_DASHBOARD, { replace: true });
    }
  }, [loading, isAuthenticated, navigate]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    clearAuthError();
    setSubmitting(true);
    try {
      if (mode === 'setup') {
        await signUpFirstTimeOwner(email.trim(), password, name.trim());
      } else {
        await login(email.trim(), password);
      }
      navigate(ROUTES.APP_DASHBOARD, { replace: true });
    } catch (err) {
      setError(getAuthErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  const switchMode = () => {
    setError('');
    clearAuthError();
    setMode(mode === 'login' ? 'setup' : 'login');
  };

  return (
    <AuthLayout>
        <div className="absolute left-4 top-4 flex items-center gap-3 sm:left-8 sm:top-8">
          <NavLink
            to={ROUTES.HOME}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-text-secondary transition-colors hover:text-text-primary"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Back to store
          </NavLink>
        </div>

        <button
          type="button"
          onClick={toggleTheme}
          className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-surface-2 text-text-secondary transition-colors hover:bg-surface-3 hover:text-text-primary sm:right-8 sm:top-8"
          aria-label={`Switch to ${theme === 'light' ? 'Dark' : 'Light'} theme`}
        >
          {theme === 'light' ? (
            <Moon className="h-4 w-4" aria-hidden="true" />
          ) : (
            <Sun className="h-4 w-4 text-warning" aria-hidden="true" />
          )}
        </button>

        <div className="w-full max-w-md">
          <div className="mb-8 text-center">
            <div className="mx-auto mb-4 flex justify-center lg:hidden">
              <BrandLogo variant="icon" size="lg" className="h-14 w-14" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-text-primary">
              {mode === 'setup' ? 'Set up store owner account' : 'Staff & cashier portal'}
            </h1>
            <p className="mt-1.5 text-sm text-text-secondary">
              {mode === 'setup'
                ? `Initialize the owner account for ${BUSINESS.name}.`
                : 'Sign in to access POS, stock management, and finance.'}
            </p>
          </div>

          <Card variant="soft" className="p-6 shadow-md sm:p-7">
            <CardContent className="space-y-5">
              {(error || authError) && (
                <div
                  role="alert"
                  className="animate-fade-in rounded-lg border border-danger-soft-border bg-danger-soft p-3.5 text-sm font-semibold text-danger-fg"
                >
                  {error || authError}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                {mode === 'setup' && (
                  <Input
                    label="Owner Full Name"
                    placeholder="e.g. Samuel Adebayo"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    required
                    leftIcon={<User className="h-4 w-4 text-text-muted" aria-hidden="true" />}
                  />
                )}

                <Input
                  label="Store Email"
                  type="email"
                  placeholder="staff@kingsmaterials.ng"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                  autoComplete="email"
                  leftIcon={<Mail className="h-4 w-4 text-text-muted" aria-hidden="true" />}
                />

                <Input
                  label="Password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  autoComplete={mode === 'setup' ? 'new-password' : 'current-password'}
                  minLength={mode === 'setup' ? 6 : undefined}
                  required
                  leftIcon={<Lock className="h-4 w-4 text-text-muted" aria-hidden="true" />}
                />

                {mode === 'setup' ? (
                  <p className="text-xs leading-relaxed text-text-secondary">
                    This creates the first owner account. Up to one owner can be created here.
                    Staff logins are created later from{' '}
                    <span className="font-semibold text-text-primary">
                      Staff & Access Control
                    </span>
                    .
                  </p>
                ) : (
                  <div className="flex justify-end">
                    <NavLink
                      to={ROUTES.FORGOT_PASSWORD}
                      className="text-sm font-semibold text-brand hover:underline"
                    >
                      Forgot Password?
                    </NavLink>
                  </div>
                )}

                <Button
                  type="submit"
                  className="h-12 w-full font-bold"
                  isLoading={submitting}
                >
                  {!submitting && <LogIn className="h-4 w-4" aria-hidden="true" />}
                  {mode === 'setup' ? 'Create Owner Account' : 'Sign In to Portal'}
                </Button>
              </form>

              <div className="border-t border-border pt-4 text-center text-sm text-text-secondary">
                <button
                  type="button"
                  onClick={switchMode}
                  className="font-semibold text-brand hover:underline"
                >
                  {mode === 'login'
                    ? 'First-time setup? Create store owner account'
                    : 'Already initialized? Back to sign in'}
                </button>
              </div>
            </CardContent>
          </Card>
        </div>
    </AuthLayout>
  );
}
