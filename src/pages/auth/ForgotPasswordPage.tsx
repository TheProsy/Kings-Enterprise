import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { NavLink } from 'react-router-dom';
import { useAuth } from '@/features/auth';
import { Mail, ArrowLeft, CheckCircle2, Sun, Moon } from 'lucide-react';
import { ROUTES } from '@/constants';
import { useTheme } from '@/contexts/useTheme';
import { BUSINESS } from '@/config/business';
import { AuthLayout } from './AuthLayout';

export function ForgotPasswordPage() {
  const { resetPassword } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await resetPassword(email);
      setSent(true);
    } catch (err: any) {
      setError(err?.message || 'Password reset failed. Please verify your email.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthLayout>
      <div className="absolute left-4 top-4 flex items-center gap-3 sm:left-8 sm:top-8">
        <NavLink
          to={ROUTES.LOGIN}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-text-secondary transition-colors hover:text-text-primary"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back to sign in
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
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-brand-800 text-xl font-extrabold text-white lg:hidden">
            {BUSINESS.initials}
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-text-primary">
            {sent ? 'Check your inbox' : 'Reset your password'}
          </h1>
          <p className="mt-1.5 text-sm text-text-secondary">
            {sent
              ? 'We have sent instructions to the address you provided.'
              : 'Enter your staff email and we will send reset instructions.'}
          </p>
        </div>

        <Card className="p-6 sm:p-7">
          <CardContent className="p-0">
            {!sent ? (
              <div className="space-y-5">
                {error && (
                  <div className="rounded-lg bg-danger-soft border border-danger-soft-border p-3.5 text-sm font-medium text-danger-fg">
                    {error}
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                  <Input
                    label="Staff Email Address"
                    type="email"
                    placeholder="staff@buildings.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    leftIcon={<Mail className="h-4 w-4 text-text-muted" />}
                  />

                  <Button type="submit" variant="primary" className="w-full" isLoading={submitting}>
                    Send Reset Link
                  </Button>
                </form>
              </div>
            ) : (
              <div className="space-y-4 py-2 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-success-soft text-success-fg">
                  <CheckCircle2 className="h-6 w-6" aria-hidden="true" />
                </div>
                <p className="text-sm leading-relaxed text-text-secondary">
                  If an account exists with{' '}
                  <span className="font-semibold text-text-primary">{email}</span>, reset
                  instructions are on their way.
                </p>
                <Button variant="secondary" className="w-full" asChild>
                  <NavLink to={ROUTES.LOGIN}>Return to sign in</NavLink>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AuthLayout>
  );
}
