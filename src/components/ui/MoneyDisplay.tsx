import { cn } from '@/lib/utilities';
import { formatMoney } from '@/lib/formatters';

interface MoneyDisplayProps {
  amount: number;
  size?: 'sm' | 'base' | 'lg';
  className?: string;
}

export function MoneyDisplay({ amount, size = 'base', className }: MoneyDisplayProps) {
  const sizes = {
    sm: 'text-sm',
    base: 'text-base',
    lg: 'text-lg',
  };

  return (
    <span className={cn('font-semibold tabular-nums text-text-primary', sizes[size], className)}>
      {formatMoney(amount)}
    </span>
  );
}
