import { useRef } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utilities';
import { useFocusTrap, useScrollLock } from '@/hooks/useFocusTrap';

export interface DrawerProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: React.ReactNode;
  position?: 'bottom' | 'right' | 'left';
  className?: string;
  footer?: React.ReactNode;
}

export function Drawer({
  open,
  onClose,
  title,
  description,
  children,
  position = 'bottom',
  className,
  footer,
}: DrawerProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  useFocusTrap(panelRef, open, onClose);
  useScrollLock(open);

  if (!open) return null;

  const positionClasses = {
    bottom:
      'inset-x-0 bottom-0 max-h-[88vh] rounded-t-2xl border-t border-border animate-drawer',
    right:
      'inset-y-0 right-0 h-full w-full max-w-md rounded-l-2xl border-l border-border animate-drawer-right',
    left:
      'inset-y-0 left-0 h-full w-full max-w-md rounded-r-2xl border-r border-border animate-drawer-left',
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      <div
        className="fixed inset-0 animate-fade-in bg-overlay/60"
        onClick={onClose}
        aria-hidden="true"
      />

      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title || 'Panel'}
        tabIndex={-1}
        className={cn(
          'fixed z-10 flex flex-col overflow-hidden bg-surface shadow-lg',
          positionClasses[position],
          className,
        )}
      >
        {position === 'bottom' && (
          <div className="flex w-full justify-center pb-1 pt-2.5">
            <div className="h-1 w-10 rounded-full bg-border-strong" aria-hidden="true" />
          </div>
        )}

        {(title || description) && (
          <div className="flex items-start justify-between gap-4 border-b border-border px-5 py-3.5">
            <div className="min-w-0">
              {title && <h3 className="text-base font-bold text-text-primary">{title}</h3>}
              {description && (
                <p className="mt-0.5 text-sm text-text-secondary">{description}</p>
              )}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="-mr-1 shrink-0 rounded-lg p-1.5 text-text-muted transition-colors hover:bg-surface-3 hover:text-text-primary"
              aria-label="Close panel"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        )}

        <div className="flex-1 overflow-y-auto px-5 py-5">{children}</div>

        {footer && (
          <div className="border-t border-border bg-surface-2 px-5 py-3.5">{footer}</div>
        )}
      </div>
    </div>
  );
}
