import { cn } from '@/lib/utilities';

export type StatTone = 'brand' | 'default' | 'success' | 'warning' | 'danger' | 'neutral';

export interface StatCardProps {
  value: string | number;
  label: string;
  icon?: React.ReactNode;
  trend?: { label: string; positive: boolean };
  className?: string;
  subtitle?: string;
  /** Alias of `subtitle` kept for backwards compatibility with report pages. */
  description?: string;
  tone?: StatTone;
  /** Alias of `tone` kept for backwards compatibility with report pages. */
  variant?: StatTone;
}

const TONES: Record<StatTone, { chip: string; icon: string; value: string }> = {
  brand: {
    chip: 'bg-brand-soft text-brand-fg',
    icon: 'text-brand',
    value: 'text-text-primary',
  },
  default: {
    chip: 'bg-brand-soft text-brand-fg',
    icon: 'text-brand',
    value: 'text-text-primary',
  },
  success: {
    chip: 'bg-success-soft text-success-fg',
    icon: 'text-success',
    value: 'text-text-primary',
  },
  warning: {
    chip: 'bg-warning-soft text-warning-fg',
    icon: 'text-warning',
    value: 'text-text-primary',
  },
  danger: {
    chip: 'bg-danger-soft text-danger-fg',
    icon: 'text-danger',
    value: 'text-text-primary',
  },
  neutral: {
    chip: 'bg-surface-3 text-text-secondary',
    icon: 'text-text-secondary',
    value: 'text-text-primary',
  },
};

export function StatCard({
  value,
  label,
  icon,
  trend,
  className,
  subtitle,
  description,
  tone,
  variant,
}: StatCardProps) {
  const palette = TONES[tone ?? variant ?? 'brand'];
  const supportingText = subtitle ?? description;

  return (
    <div
      className={cn(
        'flex flex-col justify-between gap-4 rounded-xl border border-border bg-surface p-5 shadow-xs transition-shadow hover:shadow-md',
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-semibold uppercase tracking-wide text-text-secondary">
            {label}
          </p>
          <p className={cn('mt-2 text-2xl font-bold tabular-nums tracking-tight', palette.value)}>
            {value}
          </p>
          {trend && (
            <span
              className={cn(
                'mt-2 inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs font-semibold',
                trend.positive
                  ? 'bg-success-soft text-success-fg'
                  : 'bg-danger-soft text-danger-fg',
              )}
            >
              <span aria-hidden="true">{trend.positive ? '↑' : '↓'}</span>
              {trend.label}
            </span>
          )}
          {supportingText && !trend && (
            <p className="mt-1.5 truncate text-xs text-text-muted">{supportingText}</p>
          )}
        </div>

        {icon && (
          <div
            className={cn(
              'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg',
              palette.chip,
            )}
          >
            {icon}
          </div>
        )}
      </div>
    </div>
  );
}
