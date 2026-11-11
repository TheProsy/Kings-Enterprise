import { useState } from 'react';
import { Trash2 } from 'lucide-react';
import { Button, type ButtonSize, type ButtonVariant } from '@/components/ui/Button';
import { ConfirmModal } from '@/components/ui/Modal';
import { ROLES } from '@/constants';
import { useAuth } from '@/features/auth';
import { toast } from '@/lib/toast';
import { cn } from '@/lib/utilities';

interface DeleteRecordButtonProps {
  /** Human-readable record type, e.g. "product" or "receipt". */
  entityLabel: string;
  /** Optional record name/number shown in the confirmation dialog. */
  recordLabel?: string;
  /** Extra warning shown in the confirmation dialog. */
  description?: string;
  onDelete: () => Promise<void>;
  size?: ButtonSize;
  variant?: ButtonVariant;
  showLabel?: boolean;
  className?: string;
  disabled?: boolean;
}

/**
 * Owner-only destructive action with a confirmation step. The Firestore rules
 * also reject deletes from any non-owner account.
 */
export function DeleteRecordButton({
  entityLabel,
  recordLabel,
  description,
  onDelete,
  size = 'sm',
  variant = 'ghost',
  showLabel = true,
  className,
  disabled = false,
}: DeleteRecordButtonProps) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  if (user?.role !== ROLES.OWNER) return null;

  const label = entityLabel.toLowerCase();
  const target = recordLabel ? ` “${recordLabel}”` : '';
  const message = [
    `Delete this ${label}${target}?`,
    description,
    'This action cannot be undone.',
  ]
    .filter(Boolean)
    .join(' ');

  const handleConfirm = async () => {
    setDeleting(true);
    try {
      await onDelete();
      setOpen(false);
      toast(`${entityLabel} deleted.`, 'success');
    } catch (error) {
      console.error(error);
      toast(`Could not delete the ${label}. Please try again.`, 'error');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      <Button
        type="button"
        size={size}
        variant={variant}
        disabled={disabled}
        className={cn(
          'text-danger-fg hover:bg-danger-soft dark:hover:bg-danger/15',
          className,
        )}
        onClick={(event) => {
          event.stopPropagation();
          setOpen(true);
        }}
        aria-label={`Delete ${label}${target}`}
      >
        <Trash2 className={showLabel ? 'h-3.5 w-3.5' : 'h-4 w-4'} aria-hidden="true" />
        {showLabel ? 'Delete' : null}
      </Button>

      <ConfirmModal
        open={open}
        onClose={() => setOpen(false)}
        onConfirm={handleConfirm}
        title={`Delete ${entityLabel}`}
        message={message}
        confirmText="Delete"
        variant="danger"
        isLoading={deleting}
      />
    </>
  );
}
