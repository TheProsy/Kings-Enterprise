import { cn } from '@/lib/utilities';

export type BadgeVariant =
  | 'default'
  | 'success'
  | 'warning'
  | 'danger'
  | 'info'
  | 'neutral'
  | 'outline';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  size?: 'sm' | 'md';
  children: React.ReactNode;
  className?: string;
}

const VARIANTS: Record<BadgeVariant, string> = {
  default: 'bg-surface-3 text-text-primary border border-border',
  success: 'bg-success-soft text-success-fg border border-success-soft-border',
  warning: 'bg-warning-soft text-warning-fg border border-warning-soft-border',
  danger: 'bg-danger-soft text-danger-fg border border-danger-soft-border',
  info: 'bg-info-soft text-info-fg border border-info-soft-border',
  neutral: 'bg-surface-3 text-text-secondary border border-border',
  outline: 'bg-transparent text-text-secondary border border-border-strong',
};

export function Badge({
  variant = 'default',
  size = 'md',
  children,
  className,
  ...props
}: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex select-none items-center gap-1.5 rounded-full border font-semibold',
        size === 'sm' ? 'px-2 py-0.5 text-2xs' : 'px-2.5 py-0.5 text-xs',
        VARIANTS[variant],
        className,
      )}
      {...props}
    >
      {children}
    </span>
  );
}

export type StatusKey =
  | 'paid'
  | 'partial'
  | 'unpaid'
  | 'completed'
  | 'cancelled'
  | 'refunded'
  | 'active'
  | 'inactive'
  | 'low'
  | 'ok'
  | 'In Stock'
  | 'Low Stock'
  | 'Out of Stock'
  | 'Inactive';

export interface StatusBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  status: StatusKey | (string & {});
  variant?: BadgeVariant;
  size?: 'sm' | 'md';
  children?: React.ReactNode;
  className?: string;
  showDot?: boolean;
}

const STATUS_VARIANTS: Record<string, BadgeVariant> = {
  paid: 'success',
  completed: 'success',
  active: 'success',
  ok: 'success',
  'In Stock': 'success',
  partial: 'warning',
  low: 'warning',
  'Low Stock': 'warning',
  unpaid: 'danger',
  cancelled: 'danger',
  inactive: 'danger',
  'Out of Stock': 'danger',
  'Inactive': 'neutral',
  refunded: 'info',
};

export function StatusBadge({
  status,
  variant,
  size = 'md',
  children,
  className,
  showDot = true,
  ...props
}: StatusBadgeProps) {
  const label = children || capitalize(status);
  const resolved = variant ?? STATUS_VARIANTS[status] ?? 'neutral';

  return (
    <Badge variant={resolved} size={size} className={className} {...props}>
      {showDot && (
        <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" aria-hidden="true" />
      )}
      {label}
    </Badge>
  );
}

function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}
