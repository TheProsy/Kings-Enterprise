import { cn } from '@/lib/utilities';

interface SectionHeaderProps {
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
  align?: 'left' | 'center';
  as?: 'h1' | 'h2';
}

export function SectionHeader({
  title,
  description,
  action,
  className,
  align = 'left',
  as: Heading = 'h2',
}: SectionHeaderProps) {
  return (
    <div
      className={cn(
        'flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between',
        align === 'center' && 'sm:flex-col sm:items-center sm:text-center',
        className,
      )}
    >
      <div className="max-w-2xl">
        <Heading className="text-2xl font-bold tracking-tight text-text-primary sm:text-3xl">
          {title}
        </Heading>
        {description && (
          <p className="mt-2 text-sm leading-relaxed text-text-secondary">{description}</p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
