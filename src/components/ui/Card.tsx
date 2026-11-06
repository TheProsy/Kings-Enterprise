import { cn } from '@/lib/utilities';

export type CardVariant = 'default' | 'soft' | 'inset' | 'glass' | 'interactive';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  variant?: CardVariant;
  className?: string;
}

const VARIANTS: Record<CardVariant, string> = {
  default: 'bg-surface border border-border shadow-xs',
  soft: 'bg-surface-2 border border-border shadow-xs',
  inset: 'bg-surface-3 border border-border shadow-none',
  glass: 'bg-surface/95 border border-border shadow-md',
  interactive:
    'bg-surface border border-border shadow-xs card-interactive hover:border-brand-soft-border hover:shadow-md',
};

export function Card({ children, variant = 'default', className, ...props }: CardProps) {
  return (
    <div
      className={cn('rounded-xl', VARIANTS[variant], className)}
      {...props}
    >
      {children}
    </div>
  );
}

export interface CardHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
}

export function CardHeader({ children, className, ...props }: CardHeaderProps) {
  return (
    <div className={cn('flex flex-col gap-1.5', className)} {...props}>
      {children}
    </div>
  );
}

export interface CardTitleProps extends React.HTMLAttributes<HTMLHeadingElement> {
  children: React.ReactNode;
  className?: string;
}

export function CardTitle({ children, className, ...props }: CardTitleProps) {
  return (
    <h3
      className={cn('text-lg font-semibold leading-snug text-text-primary', className)}
      {...props}
    >
      {children}
    </h3>
  );
}

export interface CardDescriptionProps extends React.HTMLAttributes<HTMLParagraphElement> {
  children: React.ReactNode;
  className?: string;
}

export function CardDescription({
  children,
  className,
  ...props
}: CardDescriptionProps) {
  return (
    <p className={cn('text-sm leading-normal text-text-secondary', className)} {...props}>
      {children}
    </p>
  );
}

export interface CardContentProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
}

export function CardContent({ children, className, ...props }: CardContentProps) {
  return (
    <div className={cn('', className)} {...props}>
      {children}
    </div>
  );
}

export interface CardFooterProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
}

export function CardFooter({ children, className, ...props }: CardFooterProps) {
  return (
    <div
      className={cn(
        'mt-4 flex items-center justify-between border-t border-border pt-4',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export interface CardImageProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
}

export function CardImage({ children, className, ...props }: CardImageProps) {
  return (
    <div
      className={cn('overflow-hidden rounded-lg bg-surface-3', className)}
      {...props}
    >
      {children}
    </div>
  );
}
