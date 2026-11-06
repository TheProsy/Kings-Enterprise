import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';
import { cn } from '@/lib/utilities';

export interface ToastProps {
  message: string;
  type?: 'success' | 'error' | 'warning' | 'info';
  onClose: () => void;
}

const ICONS = {
  success: <CheckCircle2 className="h-4 w-4 text-success" aria-hidden="true" />,
  error: <AlertCircle className="h-4 w-4 text-danger" aria-hidden="true" />,
  warning: <AlertTriangle className="h-4 w-4 text-warning" aria-hidden="true" />,
  info: <Info className="h-4 w-4 text-brand" aria-hidden="true" />,
};

const BORDERS = {
  success: 'border-l-success',
  error: 'border-l-danger',
  warning: 'border-l-warning',
  info: 'border-l-brand',
};

export function Toast({ message, type = 'info', onClose }: ToastProps) {
  return (
    <div
      className={cn(
        'pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-xl border border-border border-l-4 bg-surface p-3.5 shadow-lg animate-fade-in',
        BORDERS[type],
      )}
      role="status"
    >
      <div className="mt-0.5 shrink-0">{ICONS[type]}</div>
      <div className="flex-1 text-sm font-medium leading-snug text-text-primary">
        {message}
      </div>
      <button
        type="button"
        onClick={onClose}
        className="rounded p-1 text-text-muted transition-colors hover:text-text-primary"
        aria-label="Dismiss notification"
      >
        <X className="h-3.5 w-3.5" aria-hidden="true" />
      </button>
    </div>
  );
}

export interface NotificationToastProps {
  toasts: Array<{ id: string; message: string; type?: 'success' | 'error' | 'warning' | 'info' }>;
  onDismiss: (id: string) => void;
}

export function NotificationToast({
  toasts,
  onDismiss,
}: NotificationToastProps) {
  return (
    <div
      className="pointer-events-none fixed bottom-20 right-4 z-[60] flex w-full max-w-sm flex-col gap-2.5 px-2 md:bottom-6"
      aria-live="polite"
      aria-atomic="false"
    >
      {toasts.map((toast) => (
        <Toast
          key={toast.id}
          message={toast.message}
          type={toast.type}
          onClose={() => onDismiss(toast.id)}
        />
      ))}
    </div>
  );
}
