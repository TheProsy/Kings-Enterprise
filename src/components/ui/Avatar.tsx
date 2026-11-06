import { cn } from '@/lib/utilities';

interface AvatarProps extends React.HTMLAttributes<HTMLDivElement> {
  src?: string;
  alt?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function Avatar({
  src,
  alt,
  size = 'md',
  className,
}: AvatarProps) {
  const sizes = {
    sm: 'h-8 w-8 text-2xs',
    md: 'h-10 w-10 text-xs',
    lg: 'h-12 w-12 text-sm',
  };

  const initials = alt
    ? alt
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0])
        .join('')
        .toUpperCase()
    : '?';

  return (
    <div
      className={cn(
        'flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-brand text-xs font-bold text-white',
        sizes[size],
        className,
      )}
    >
      {src ? (
        <img src={src} alt={alt ?? ''} className="h-full w-full object-cover" loading="lazy" />
      ) : (
        initials
      )}
    </div>
  );
}
