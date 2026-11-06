import { cn } from '@/lib/utilities';

export interface TabItem {
  value: string;
  label: string;
  badge?: React.ReactNode;
}

export interface TabsProps {
  items: TabItem[];
  value: string;
  onChange: (value: string) => void;
  className?: string;
  ariaLabel?: string;
}

export function Tabs({
  items,
  value,
  onChange,
  className,
  ariaLabel = 'Sections',
}: TabsProps) {
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={cn(
        'flex items-center gap-1 overflow-x-auto border-b border-border no-scrollbar',
        className,
      )}
    >
      {items.map((item) => {
        const isSelected = item.value === value;
        return (
          <button
            key={item.value}
            type="button"
            role="tab"
            aria-selected={isSelected}
            onClick={() => onChange(item.value)}
            className={cn(
              'relative inline-flex shrink-0 items-center gap-2 whitespace-nowrap px-3 py-2.5 text-sm font-semibold transition-colors',
              isSelected
                ? 'text-brand after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:rounded-full after:bg-brand'
                : 'text-text-secondary hover:text-text-primary',
            )}
          >
            <span>{item.label}</span>
            {item.badge}
          </button>
        );
      })}
    </div>
  );
}
