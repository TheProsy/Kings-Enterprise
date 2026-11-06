import { Field } from '@/components/ui/Field';
import { cn } from '@/lib/utilities';

const CONTROL_BASE =
  'w-full rounded-lg border bg-surface text-sm text-text-primary placeholder:text-text-muted transition-colors outline-none';
const CONTROL_FOCUS =
  'focus:border-brand focus:ring-2 focus:ring-brand/20';
const CONTROL_DISABLED = 'disabled:opacity-60 disabled:cursor-not-allowed disabled:bg-surface-2';
const CONTROL_ERROR = 'border-danger focus:border-danger focus:ring-danger/20';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helper?: string;
  className?: string;
  inputClassName?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  variant?: 'default' | 'inset';
}

export function Input({
  label,
  error,
  helper,
  className,
  inputClassName,
  id,
  leftIcon,
  rightIcon,
  variant = 'default',
  required,
  ...props
}: InputProps) {
  const inputId = id || props.name;
  const hasLeftIcon = Boolean(leftIcon);
  const hasRightIcon = Boolean(rightIcon);

  const variantClasses =
    variant === 'inset'
      ? 'bg-surface-2 border-border'
      : 'bg-surface border-border-strong';

  const inputClasses = cn(
    CONTROL_BASE,
    CONTROL_FOCUS,
    CONTROL_DISABLED,
    variantClasses,
    'h-11',
    hasLeftIcon ? 'pl-10' : 'px-3.5',
    hasRightIcon ? 'pr-10' : 'px-3.5',
    error && CONTROL_ERROR,
    inputClassName,
  );

  const describedBy = error
    ? `${inputId}-error`
    : helper
      ? `${inputId}-helper`
      : undefined;

  return (
    <Field
      label={label}
      error={error}
      helper={helper}
      htmlFor={inputId}
      required={required}
      className={className}
    >
      <div className="relative flex items-center">
        {leftIcon && (
          <div className="pointer-events-none absolute left-3.5 flex -translate-y-1/2 items-center text-text-muted">
            {leftIcon}
          </div>
        )}
        <input
          id={inputId}
          className={inputClasses}
          aria-invalid={Boolean(error) || undefined}
          aria-describedby={describedBy}
          required={required}
          {...props}
        />
        {rightIcon && (
          <div className="absolute right-3.5 flex -translate-y-1/2 items-center text-text-muted">
            {rightIcon}
          </div>
        )}
      </div>
    </Field>
  );
}

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  helper?: string;
  className?: string;
  variant?: 'default' | 'inset';
}

export function Textarea({
  label,
  error,
  helper,
  className,
  id,
  variant = 'default',
  required,
  ...props
}: TextareaProps) {
  const inputId = id || props.name;

  const variantClasses =
    variant === 'inset'
      ? 'bg-surface-2 border-border'
      : 'bg-surface border-border-strong';

  const describedBy = error
    ? `${inputId}-error`
    : helper
      ? `${inputId}-helper`
      : undefined;

  return (
    <Field
      label={label}
      error={error}
      helper={helper}
      htmlFor={inputId}
      required={required}
      className={className}
    >
      <textarea
        id={inputId}
        className={cn(
          CONTROL_BASE,
          CONTROL_FOCUS,
          CONTROL_DISABLED,
          variantClasses,
          'min-h-[88px] resize-y px-3.5 py-2.5',
          error && CONTROL_ERROR,
        )}
        aria-invalid={Boolean(error) || undefined}
        aria-describedby={describedBy}
        required={required}
        {...props}
      />
    </Field>
  );
}

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  helper?: string;
  options?: Array<{ value: string | number; label: string }>;
  className?: string;
  variant?: 'default' | 'inset';
  placeholder?: string;
}

export function Select({
  label,
  error,
  helper,
  options,
  children,
  className,
  id,
  variant = 'default',
  placeholder,
  required,
  ...props
}: SelectProps) {
  const selectId = id || props.name;
  const isPlaceholderSelected = placeholder !== undefined && props.value === '';

  const variantClasses =
    variant === 'inset'
      ? 'bg-surface-2 border-border'
      : 'bg-surface border-border-strong';

  const describedBy = error
    ? `${selectId}-error`
    : helper
      ? `${selectId}-helper`
      : undefined;

  return (
    <Field
      label={label}
      error={error}
      helper={helper}
      htmlFor={selectId}
      required={required}
      className={className}
    >
      <div className="relative">
        <select
          id={selectId}
          className={cn(
            CONTROL_BASE,
            CONTROL_FOCUS,
            CONTROL_DISABLED,
            variantClasses,
            'h-11 cursor-pointer appearance-none py-2 pl-3.5 pr-9',
            isPlaceholderSelected && 'text-text-muted',
            error && CONTROL_ERROR,
          )}
          aria-invalid={Boolean(error) || undefined}
          aria-describedby={describedBy}
          required={required}
          {...props}
        >
          {placeholder !== undefined && (
            <option value="" className="bg-surface text-text-primary">
              {placeholder}
            </option>
          )}
          {options
            ? options.map((opt) => (
                <option key={opt.value} value={opt.value} className="bg-surface text-text-primary">
                  {opt.label}
                </option>
              ))
            : children}
        </select>
        <div className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-text-muted">
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>
    </Field>
  );
}
