import { useState } from 'react';
import { cn } from '@/lib/utilities';
import { formatMoney } from '@/lib/formatters';
import { StatusBadge } from '@/components/ui/Badge';
import { Package } from 'lucide-react';
import { getProductImage } from '@/constants/images';

export interface ProductCardProps {
  name: string;
  brand?: string;
  price: number;
  stock: number;
  unit: string;
  lowStock?: boolean;
  imageUrl?: string;
  category?: string;
  selected?: boolean;
  onPress?: () => void;
  className?: string;
  badge?: React.ReactNode;
}

export function ProductCard({
  name,
  brand,
  price,
  stock,
  unit,
  lowStock = false,
  imageUrl,
  category,
  selected = false,
  onPress,
  className,
  badge,
}: ProductCardProps) {
  const isOutOfStock = stock <= 0;
  const [imgError, setImgError] = useState(false);
  const resolvedImage = !imgError ? (imageUrl || getProductImage(name, category)) : undefined;

  return (
    <div
      role={onPress ? 'button' : undefined}
      tabIndex={onPress ? 0 : undefined}
      onClick={onPress}
      onKeyDown={(event) => {
        if (onPress && (event.key === 'Enter' || event.key === ' ')) {
          event.preventDefault();
          onPress();
        }
      }}
      className={cn(
        'group flex select-none flex-col overflow-hidden rounded-xl border bg-surface text-left shadow-xs transition-all',
        selected
          ? 'border-brand ring-2 ring-brand/20'
          : 'border-border hover:-translate-y-0.5 hover:border-brand-soft-border hover:shadow-md',
        onPress && 'cursor-pointer',
        className,
      )}
    >
      <div className="relative h-32 w-full overflow-hidden border-b border-border bg-surface-3">
        {resolvedImage ? (
          <img
            src={resolvedImage}
            alt={name}
            className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105"
            loading="lazy"
            decoding="async"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-text-muted">
            <Package className="h-9 w-9 stroke-[1.25]" aria-hidden="true" />
          </div>
        )}

        <div className="absolute right-2 top-2">
          {badge || (
            <StatusBadge status={isOutOfStock ? 'cancelled' : lowStock ? 'low' : 'ok'}>
              {isOutOfStock ? 'Out of stock' : `${stock} ${unit}`}
            </StatusBadge>
          )}
        </div>
      </div>

      <div className="flex flex-1 flex-col justify-between p-4">
        <div>
          {category && (
            <p className="mb-1 truncate text-2xs font-semibold uppercase tracking-wide text-text-muted">
              {category}
            </p>
          )}
          <h3 className="line-clamp-1 text-sm font-semibold leading-snug text-text-primary transition-colors group-hover:text-brand">
            {name}
          </h3>
          {brand && <p className="mt-0.5 truncate text-xs text-text-secondary">{brand}</p>}
        </div>

        <div className="mt-3 flex items-baseline justify-between border-t border-border pt-3">
          <div className="flex items-baseline gap-1">
            <span className="text-base font-bold tabular-nums tracking-tight text-text-primary">
              {formatMoney(price)}
            </span>
            <span className="text-xs text-text-muted">/{unit}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
