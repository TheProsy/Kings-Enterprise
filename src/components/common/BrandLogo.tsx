import { cn } from '@/lib/utilities';
import { BRAND_ASSETS } from '@/constants/images';

export interface BrandLogoProps {
  variant?: 'full' | 'white' | 'icon';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  showTagline?: boolean;
}

export function BrandLogo({
  variant = 'full',
  size = 'md',
  className,
}: BrandLogoProps) {
  if (variant === 'icon') {
    const sizeClasses = {
      sm: 'h-8 w-8',
      md: 'h-10 w-10',
      lg: 'h-12 w-12',
    }[size];

    return (
      <img
        src={BRAND_ASSETS.logoIcon}
        alt="Kings Building Materials Logo"
        className={cn('shrink-0 select-none object-contain', sizeClasses, className)}
        width={48}
        height={48}
        loading="eager"
      />
    );
  }

  const file = variant === 'white' ? BRAND_ASSETS.logoWhite : BRAND_ASSETS.logo;

  const heightClasses = {
    sm: 'h-8',
    md: 'h-10',
    lg: 'h-12',
  }[size];

  return (
    <img
      src={file}
      alt="Kings Building Materials"
      className={cn('w-auto select-none object-contain', heightClasses, className)}
      width={960}
      height={298}
      loading="eager"
    />
  );
}
