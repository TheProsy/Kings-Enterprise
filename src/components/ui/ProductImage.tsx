import { useState } from 'react';
import { cn } from '@/lib/utilities';
import { Package } from 'lucide-react';

interface ProductImageProps {
  src?: string;
  alt: string;
  className?: string;
  fallback?: 'icon' | 'none';
  /** Tint applied to the fallback surface so categories read apart at a glance. */
  tone?: 'brand' | 'success' | 'warning' | 'danger' | 'neutral';
}

const TONES = {
  brand: 'bg-brand-soft text-brand-fg',
  success: 'bg-success-soft text-success-fg',
  warning: 'bg-warning-soft text-warning-fg',
  danger: 'bg-danger-soft text-danger-fg',
  neutral: 'bg-surface-3 text-text-muted',
};

export function ProductImage({
  src,
  alt,
  className,
  fallback = 'icon',
  tone = 'brand',
}: ProductImageProps) {
  const [hasError, setHasError] = useState(false);

  if (!src || hasError || fallback === 'none') {
    return (
      <div
        className={cn(
          'relative flex aspect-square w-full items-center justify-center overflow-hidden rounded-lg',
          TONES[tone],
          className,
        )}
        role="img"
        aria-label={alt}
      >
        <Package className="h-10 w-10 stroke-[1.25]" aria-hidden="true" />
      </div>
    );
  }

  return (
    <div
      className={cn(
        'relative aspect-square w-full overflow-hidden rounded-lg bg-surface-3',
        className,
      )}
    >
      <img
        src={src}
        alt={alt}
        className="h-full w-full object-cover transition-transform duration-300 hover:scale-105"
        loading="lazy"
        decoding="async"
        onError={() => setHasError(true)}
      />
    </div>
  );
}
