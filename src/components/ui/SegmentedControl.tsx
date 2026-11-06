import { cn } from '@/lib/utilities';

export interface SegmentedControlOption<T extends string = string> {
  value: T;
  label: string;
  count?: number;
}

export interface SegmentedControlProps<T extends string = string> {
  options: SegmentedControlOption<T>[];
  value: T;
  onChange: (value: T) => void;
  size?: 'sm' | 'md';
  className?: string;
  ariaLabel?: string;
}

export function SegmentedControl<T extends string = string>({
  options,
  value,
  onChange,
  size = 'md',
  className,
  ariaLabel = 'Filter options',
}: SegmentedControlProps<T>) {
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={cn(
        'flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5',
        className,
      )}
    >
      {options.map((option) => {
        const isSelected = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="tab"
            aria-selected={isSelected}
            onClick={() => onChange(option.value)}
            className={cn(
              'inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border font-semibold btn-press',
              size === 'sm' ? 'px-3 py-1 text-xs' : 'px-3.5 py-1.5 text-sm',
              isSelected
                ? 'border-transparent bg-brand text-white shadow-xs'
                : 'border-border bg-surface text-text-secondary hover:border-brand-soft-border hover:bg-surface-2 hover:text-text-primary',
            )}
          >
            <span>{option.label}</span>
            {option.count !== undefined && (
              <span
                className={cn(
                  'rounded-full px-1.5 text-2xs tabular-nums',
                  isSelected
                    ? 'bg-white/20 text-white'
                    : 'bg-surface-3 text-text-muted',
                )}
              >
                {option.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
