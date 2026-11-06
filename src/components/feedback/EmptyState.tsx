import React from 'react';
import { cn } from '@/lib/utilities';
import { AlertCircle, Inbox, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({
  title,
  description,
  icon,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'mx-auto flex max-w-md flex-col items-center justify-center px-4 py-12 text-center animate-fade-in',
        className,
      )}
    >
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-xl border border-border bg-surface-3 text-text-muted">
        {icon || <Inbox className="h-7 w-7 stroke-[1.5]" aria-hidden="true" />}
      </div>
      <h3 className="text-lg font-bold leading-snug tracking-tight text-text-primary">
        {title}
      </h3>
      {description && (
        <p className="mb-6 mt-1.5 text-sm leading-relaxed text-text-secondary">
          {description}
        </p>
      )}
      {action && <div>{action}</div>}
    </div>
  );
}

export interface ErrorStateProps {
  title?: string;
  description?: string;
  onRetry?: () => void;
  className?: string;
}

export function ErrorState({
  title = 'Something went wrong',
  description = 'An error occurred while loading this data. Please try again.',
  onRetry,
  className,
}: ErrorStateProps) {
  return (
    <div
      className={cn(
        'mx-auto flex max-w-md flex-col items-center justify-center px-4 py-12 text-center animate-fade-in',
        className,
      )}
    >
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-xl border border-danger-soft-border bg-danger-soft text-danger">
        <AlertCircle className="h-7 w-7 stroke-[1.5]" aria-hidden="true" />
      </div>
      <h3 className="text-lg font-bold tracking-tight text-text-primary">{title}</h3>
      {description && (
        <p className="mb-6 mt-1.5 text-sm leading-relaxed text-text-secondary">
          {description}
        </p>
      )}
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry}>
          <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
          Try Again
        </Button>
      )}
    </div>
  );
}
