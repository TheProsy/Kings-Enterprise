import { useSyncExternalStore } from 'react';
import { NotificationToast } from '@/components/feedback/NotificationToast';
import { dismissToast, getToasts, subscribeToasts } from '@/lib/toast';

export function Toaster() {
  const toasts = useSyncExternalStore(subscribeToasts, getToasts, getToasts);

  return <NotificationToast toasts={toasts} onDismiss={dismissToast} />;
}
