import { Field } from '@/components/ui/Field';
import { cn } from '@/lib/utilities';

interface DateRangeFilterProps {
  startDate: Date | null;
  endDate: Date | null;
  onChange: (range: { start: Date | null; end: Date | null }) => void;
  className?: string;
}

export function DateRangeFilter({
  startDate,
  endDate,
  onChange,
  className,
}: DateRangeFilterProps) {
  return (
    <div className={cn('flex flex-col gap-4 md:flex-row md:items-end', className)}>
      <Field label="From Date" htmlFor="date-range-start" className="min-w-[200px] flex-1">
        <input
          id="date-range-start"
          type="date"
          value={startDate ? startDate.toISOString().split('T')[0] : ''}
          onChange={(event) => {
            const next = event.target.value ? new Date(event.target.value) : null;
            onChange({ start: next, end: endDate });
          }}
          className="h-11 w-full rounded-lg border border-border-strong bg-surface px-3 text-sm text-text-primary outline-none transition-colors focus:border-brand focus:ring-2 focus:ring-brand/20"
        />
      </Field>

      <Field label="To Date" htmlFor="date-range-end" className="min-w-[200px] flex-1">
        <input
          id="date-range-end"
          type="date"
          value={endDate ? endDate.toISOString().split('T')[0] : ''}
          onChange={(event) => {
            const next = event.target.value ? new Date(event.target.value) : null;
            onChange({ start: startDate, end: next });
          }}
          className="h-11 w-full rounded-lg border border-border-strong bg-surface px-3 text-sm text-text-primary outline-none transition-colors focus:border-brand focus:ring-2 focus:ring-brand/20"
        />
      </Field>
    </div>
  );
}
