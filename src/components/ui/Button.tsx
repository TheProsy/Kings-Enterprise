import { cloneElement, isValidElement } from 'react';
import { cn } from '@/lib/utilities';

export type ButtonVariant =
  | 'primary'
  | 'secondary'
  | 'outline'
  | 'ghost'
  | 'danger'
  | 'success'
  | 'link';

export type ButtonSize = 'sm' | 'md' | 'lg' | 'icon';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  asChild?: boolean;
}

const VARIANTS: Record<ButtonVariant, string> = {
  primary:
    'bg-brand text-white border border-transparent shadow-xs hover:bg-brand-hover active:bg-brand-active',
  secondary:
    'bg-surface-3 text-text-primary border border-border shadow-xs hover:bg-surface-2 hover:border-border-strong',
  outline:
    'bg-surface text-text-primary border border-border-strong hover:bg-surface-2 hover:border-brand',
  ghost:
    'bg-transparent text-text-secondary border border-transparent hover:bg-surface-3 hover:text-text-primary',
  danger:
    'bg-danger text-white border border-transparent shadow-xs hover:bg-danger-fg',
  success:
    'bg-success text-white border border-transparent shadow-xs hover:bg-success-fg',
  link: 'bg-transparent text-brand border border-transparent underline-offset-4 hover:underline px-0',
};

const SIZES: Record<ButtonSize, string> = {
  sm: 'h-9 px-3 text-xs rounded-md gap-1.5',
  md: 'h-11 px-4 text-sm rounded-lg gap-2',
  lg: 'h-12 px-6 text-base rounded-lg gap-2',
  icon: 'h-10 w-10 p-0 rounded-lg gap-0',
};

export function Button({
  variant = 'primary',
  size = 'md',
  isLoading = false,
  asChild = false,
  children,
  className,
  disabled,
  type,
  ...props
}: ButtonProps) {
  const classes = cn(
    'inline-flex shrink-0 items-center justify-center font-semibold whitespace-nowrap btn-press select-none',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-canvas',
    'disabled:pointer-events-none disabled:opacity-50',
    VARIANTS[variant],
    SIZES[size],
    className,
  );

  if (asChild && isValidElement(children)) {
    const child = children as React.ReactElement<{ className?: string }>;
    return cloneElement(child, { className: cn(classes, child.props.className) });
  }

  return (
    <button
      type={type ?? 'button'}
      className={classes}
      disabled={disabled || isLoading}
      aria-busy={isLoading || undefined}
      {...props}
    >
      {isLoading && (
        <svg
          className="h-4 w-4 animate-spin"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
      )}
      {children}
    </button>
  );
}
