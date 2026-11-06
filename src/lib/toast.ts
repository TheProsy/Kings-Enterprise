export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastItem {
  id: string;
  message: string;
  type: ToastType;
}

type Listener = (toasts: ToastItem[]) => void;

let toasts: ToastItem[] = [];
const listeners = new Set<Listener>();

function emit() {
  listeners.forEach((listener) => listener(toasts));
}

export function toast(message: string, type: ToastType = 'info', duration = 4000) {
  const id = crypto.randomUUID?.() || Math.random().toString(36).slice(2);
  toasts = [...toasts, { id, message, type }];
  emit();

  if (duration > 0) {
    window.setTimeout(() => dismissToast(id), duration);
  }

  return id;
}

export function dismissToast(id: string) {
  toasts = toasts.filter((item) => item.id !== id);
  emit();
}

export function subscribeToasts(listener: Listener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getToasts() {
  return toasts;
}
