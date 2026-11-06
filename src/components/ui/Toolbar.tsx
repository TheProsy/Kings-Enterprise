import { cn } from '@/lib/utilities';

export interface ToolbarProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
}

export function Toolbar({ children, className, ...props }: ToolbarProps) {
  return (
    <div
      className={cn(
        'flex flex-col gap-3 rounded-xl border border-border bg-surface p-3 shadow-xs md:flex-row md:items-center md:justify-between',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}
