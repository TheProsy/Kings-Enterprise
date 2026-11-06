import { useRef } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utilities';
import { useFocusTrap, useScrollLock } from '@/hooks/useFocusTrap';

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  footer?: React.ReactNode;
}

const SIZES = {
  sm: 'max-w-md',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
};

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  className,
  size = 'md',
  footer,
}: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  useFocusTrap(panelRef, open, onClose);
  useScrollLock(open);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center overflow-y-auto p-0 sm:items-center sm:p-6">
      <div
        className="fixed inset-0 animate-fade-in bg-overlay/60"
        onClick={onClose}
        aria-hidden="true"
      />

      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        className={cn(
          'relative z-10 flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-2xl border border-border bg-surface shadow-lg animate-scale-in sm:rounded-2xl',
          SIZES[size],
          className,
        )}
      >
        <div className="flex items-start justify-between gap-4 border-b border-border px-5 py-4 sm:px-6">
          <div className="min-w-0">
            <h2 className="text-lg font-bold tracking-tight text-text-primary">{title}</h2>
            {description && (
              <p className="mt-1 text-sm text-text-secondary">{description}</p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="-mr-1 shrink-0 rounded-lg p-2 text-text-muted transition-colors hover:bg-surface-3 hover:text-text-primary"
            aria-label="Close dialog"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-5 sm:px-6">{children}</div>

        {footer && (
          <div className="border-t border-border bg-surface-2 px-5 py-3.5 sm:px-6">{footer}</div>
        )}
      </div>
    </div>
  );
}

export interface ConfirmModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'primary';
  isLoading?: boolean;
}

export function ConfirmModal({
  open,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'danger',
  isLoading = false,
}: ConfirmModalProps) {
  if (!open) return null;

  return (
    <Modal open={open} onClose={onClose} title={title} size="sm">
      <div className="space-y-5">
        <p className="text-sm leading-relaxed text-text-secondary">{message}</p>
        <div className="flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="h-10 rounded-lg border border-border-strong bg-surface px-4 text-sm font-semibold text-text-primary transition-colors hover:bg-surface-2 disabled:opacity-50"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            className={cn(
              'h-10 rounded-lg px-4 text-sm font-semibold text-white shadow-xs transition-colors disabled:opacity-50',
              variant === 'danger'
                ? 'bg-danger hover:bg-danger-fg'
                : 'bg-brand hover:bg-brand-hover',
            )}
          >
            {isLoading ? 'Processing…' : confirmText}
          </button>
        </div>
      </div>
    </Modal>
  );
}
