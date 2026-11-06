import { cn } from '@/lib/utilities';

export type SurfaceTone = 'default' | 'muted' | 'brand' | 'inverse' | 'outline';
export type SurfacePadding = 'none' | 'sm' | 'md' | 'lg';

export interface SurfaceProps extends React.HTMLAttributes<HTMLDivElement> {
  tone?: SurfaceTone;
  padding?: SurfacePadding;
  interactive?: boolean;
  children: React.ReactNode;
  className?: string;
}

const TONES: Record<SurfaceTone, string> = {
  default: 'bg-surface border border-border',
  muted: 'bg-surface-2 border border-border',
  brand: 'bg-brand-soft border border-brand-soft-border',
  inverse: 'bg-surface-inverse border border-transparent',
  outline: 'bg-transparent border border-border-strong',
};

const PADDINGS: Record<SurfacePadding, string> = {
  none: '',
  sm: 'p-3',
  md: 'p-4',
  lg: 'p-5 sm:p-6',
};

export function Surface({
  tone = 'default',
  padding = 'md',
  interactive = false,
  children,
  className,
  ...props
}: SurfaceProps) {
  return (
    <div
      className={cn(
        'rounded-xl shadow-xs',
        TONES[tone],
        PADDINGS[padding],
        interactive && 'card-interactive hover:border-brand-soft-border hover:shadow-md',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}
