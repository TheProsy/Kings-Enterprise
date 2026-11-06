import { cn } from '@/lib/utilities';

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
}

export function Skeleton({ className, ...props }: SkeletonProps) {
  return (
    <div
      className={cn('animate-pulse rounded-lg bg-surface-3', className)}
      {...props}
    />
  );
}

export function TextSkeleton({ className, ...props }: SkeletonProps) {
  return (
    <div
      className={cn('h-4 w-full animate-pulse rounded bg-surface-3', className)}
      {...props}
    />
  );
}

export function AvatarSkeleton({ className, ...props }: SkeletonProps) {
  return (
    <div
      className={cn('h-10 w-10 animate-pulse rounded-full bg-surface-3', className)}
      {...props}
    />
  );
}

export function StatsSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={index}
          className="rounded-xl border border-border bg-surface p-5 shadow-xs"
        >
          <Skeleton className="h-3 w-24" />
          <Skeleton className="mt-3 h-7 w-32" />
          <Skeleton className="mt-2 h-3 w-40" />
        </div>
      ))}
    </div>
  );
}

export function PanelSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="rounded-xl border border-border bg-surface p-5 shadow-xs">
      <Skeleton className="h-4 w-40" />
      <div className="mt-4 space-y-3">
        {Array.from({ length: rows }).map((_, index) => (
          <div key={index} className="flex items-center justify-between gap-4">
            <div className="flex-1 space-y-2">
              <Skeleton className="h-3.5 w-1/3" />
              <Skeleton className="h-3 w-1/2" />
            </div>
            <Skeleton className="h-6 w-20" />
          </div>
        ))}
      </div>
    </div>
  );
}

