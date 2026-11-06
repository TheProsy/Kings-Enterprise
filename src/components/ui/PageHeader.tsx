import { Link } from 'react-router-dom';
import { cn } from '@/lib/utilities';

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

export interface PageHeaderProps {
  title: string;
  description?: string;
  action?: React.ReactNode;
  breadcrumb?: React.ReactNode;
  /** Structured breadcrumb trail, rendered as a labelled nav. */
  breadcrumbs?: BreadcrumbItem[];
  className?: string;
}

export function PageHeader({
  title,
  description,
  action,
  breadcrumb,
  breadcrumbs,
  className,
}: PageHeaderProps) {
  return (
    <div className={cn('mb-6 animate-fade-in sm:mb-8', className)}>
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav aria-label="Breadcrumb" className="mb-2 flex items-center gap-1.5 text-xs text-text-muted">
          {breadcrumbs.map((crumb, index) => (
            <span key={`${crumb.label}-${index}`} className="flex items-center gap-1.5">
              {index > 0 && <span aria-hidden="true">/</span>}
              {crumb.href ? (
                <Link to={crumb.href} className="font-medium hover:text-brand">
                  {crumb.label}
                </Link>
              ) : (
                <span className="font-medium text-text-secondary">{crumb.label}</span>
              )}
            </span>
          ))}
        </nav>
      )}
      {breadcrumb && !breadcrumbs && (
        <div className="mb-2 flex items-center gap-1.5 text-xs font-medium text-text-muted">
          {breadcrumb}
        </div>
      )}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold leading-tight tracking-tight text-text-primary sm:text-3xl">
            {title}
          </h1>
          {description && (
            <p className="mt-1.5 max-w-3xl text-sm leading-relaxed text-text-secondary">
              {description}
            </p>
          )}
        </div>
        {action && (
          <div className="flex shrink-0 flex-wrap items-center gap-2.5">{action}</div>
        )}
      </div>
    </div>
  );
}
