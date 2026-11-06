import { cn } from '@/lib/utilities';

export interface FieldProps {
  label?: string;
  error?: string;
  helper?: string;
  htmlFor?: string;
  required?: boolean;
  className?: string;
  children: React.ReactNode;
}

export function Field({
  label,
  error,
  helper,
  htmlFor,
  required,
  className,
  children,
}: FieldProps) {
  return (
    <div className={cn('flex w-full flex-col gap-1.5', className)}>
      {label && (
        <label
          htmlFor={htmlFor}
          className="flex items-center gap-1 text-xs font-semibold text-text-primary"
        >
          {label}
          {required && (
            <span className="text-danger" aria-hidden="true">
              *
            </span>
          )}
        </label>
      )}
      {children}
      {error && (
        <p
          id={htmlFor ? `${htmlFor}-error` : undefined}
          role="alert"
          className="text-xs font-medium text-danger-fg animate-fade-in"
        >
          {error}
        </p>
      )}
      {!error && helper && (
        <p id={htmlFor ? `${htmlFor}-helper` : undefined} className="text-xs text-text-muted">
          {helper}
        </p>
      )}
    </div>
  );
}
