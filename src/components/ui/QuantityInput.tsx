import { cn } from '@/lib/utilities';
import { Minus, Plus } from 'lucide-react';

export interface QuantityInputProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  className?: string;
  disabled?: boolean;
  ariaLabel?: string;
}

export function QuantityInput({
  value,
  onChange,
  min = 1,
  max,
  step = 1,
  className,
  disabled = false,
  ariaLabel = 'Quantity',
}: QuantityInputProps) {
  const decrement = () => {
    if (disabled) return;
    onChange(Math.max(min, value - step));
  };

  const increment = () => {
    if (disabled) return;
    onChange(max !== undefined ? Math.min(max, value + step) : value + step);
  };

  return (
    <div
      className={cn(
        'inline-flex items-center gap-1 rounded-lg border border-border bg-surface-2 p-1',
        className,
      )}
    >
      <button
        type="button"
        onClick={decrement}
        disabled={disabled || value <= min}
        className="flex h-8 w-8 items-center justify-center rounded-md border border-border bg-surface text-text-secondary shadow-xs transition-colors hover:bg-surface-3 hover:text-text-primary disabled:pointer-events-none disabled:opacity-40"
        aria-label="Decrease quantity"
      >
        <Minus className="h-3.5 w-3.5" aria-hidden="true" />
      </button>

      <input
        type="number"
        value={value}
        min={min}
        max={max ?? undefined}
        step={step}
        disabled={disabled}
        onChange={(event) => {
          const val = parseFloat(event.target.value);
          if (!Number.isNaN(val)) {
            onChange(Math.max(min, max !== undefined ? Math.min(max, val) : val));
          }
        }}
        className="h-8 w-14 bg-transparent text-center text-sm font-bold tabular-nums text-text-primary outline-none [appearance:textfield] focus-visible:ring-2 focus-visible:ring-brand [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
        aria-label={ariaLabel}
      />

      <button
        type="button"
        onClick={increment}
        disabled={disabled || (max !== undefined && value >= max)}
        className="flex h-8 w-8 items-center justify-center rounded-md border border-border bg-surface text-text-secondary shadow-xs transition-colors hover:bg-surface-3 hover:text-text-primary disabled:pointer-events-none disabled:opacity-40"
        aria-label="Increase quantity"
      >
        <Plus className="h-3.5 w-3.5" aria-hidden="true" />
      </button>
    </div>
  );
}
