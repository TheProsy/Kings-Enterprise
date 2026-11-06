import { Field } from '@/components/ui/Field';
import { cn } from '@/lib/utilities';
import { CURRENCY_SYMBOL } from '@/constants';

export interface PriceInputProps {
  value: number;
  onChange: (value: number) => void;
  label?: string;
  error?: string;
  helper?: string;
  className?: string;
  placeholder?: string;
  disabled?: boolean;
  id?: string;
}

export function PriceInput({
  value,
  onChange,
  label,
  error,
  helper,
  className,
  placeholder = '0.00',
  disabled = false,
  id,
}: PriceInputProps) {
  const inputId = id || `price-${label?.toLowerCase().replace(/\s+/g, '-') ?? 'input'}`;

  return (
    <Field
      label={label}
      error={error}
      helper={helper}
      htmlFor={inputId}
      className={className}
    >
      <div className="relative flex items-center">
        <span className="pointer-events-none absolute left-3.5 select-none text-sm font-semibold text-text-muted">
          {CURRENCY_SYMBOL}
        </span>
        <input
          id={inputId}
          type="number"
          min="0"
          step="any"
          inputMode="decimal"
          value={value === 0 && !label ? '' : value}
          onChange={(event) => {
            const parsed = parseFloat(event.target.value);
            onChange(Number.isNaN(parsed) ? 0 : parsed);
          }}
          placeholder={placeholder}
          disabled={disabled}
          className={cn(
            'h-11 w-full rounded-lg border border-border-strong bg-surface pl-9 pr-3.5 text-sm font-semibold tabular-nums text-text-primary outline-none transition-colors',
            'placeholder:font-normal placeholder:text-text-muted',
            'focus:border-brand focus:ring-2 focus:ring-brand/20',
            'disabled:cursor-not-allowed disabled:bg-surface-2 disabled:opacity-60',
            error && 'border-danger focus:border-danger focus:ring-danger/20',
          )}
        />
      </div>
    </Field>
  );
}
