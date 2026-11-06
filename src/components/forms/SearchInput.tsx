import { cn } from '@/lib/utilities';
import { Search, X } from 'lucide-react';

export interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  onClear?: () => void;
  ariaLabel?: string;
}

export function SearchInput({
  value,
  onChange,
  placeholder = 'Search materials, customers, receipts…',
  className,
  onClear,
  ariaLabel,
}: SearchInputProps) {
  const handleClear = () => {
    onChange('');
    onClear?.();
  };

  return (
    <div className={cn('relative w-full', className)}>
      <Search
        className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted"
        aria-hidden="true"
      />
      <input
        type="search"
        placeholder={placeholder}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        aria-label={ariaLabel ?? placeholder}
        className="h-11 w-full rounded-lg border border-border-strong bg-surface pl-10 pr-9 text-sm text-text-primary outline-none transition-colors placeholder:text-text-muted focus:border-brand focus:ring-2 focus:ring-brand/20"
      />
      {value && (
        <button
          type="button"
          onClick={handleClear}
          className="absolute right-3 top-1/2 -translate-y-1/2 rounded p-1 text-text-muted transition-colors hover:text-text-primary"
          aria-label="Clear search"
        >
          <X className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
      )}
    </div>
  );
}
