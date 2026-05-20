import logoNims from '@/assets/logo-nims.png';
import { cn } from '@/lib/utils';

interface NimsLogoProps {
  size?: 'sm' | 'md' | 'lg';
  /** Kept for API compatibility; the image asset is used as-is. */
  variant?: 'light' | 'dark';
  /** Kept for API compatibility; branding text is part of the image. */
  showText?: boolean;
  className?: string;
}

const sizeMap = {
  sm: 'h-8',
  md: 'h-11',
  lg: 'h-16',
};

export function NimsLogo({ size = 'md', className }: NimsLogoProps) {
  return (
    <img
      src={logoNims}
      alt="NexCheck Inventory Management System (NIMS)"
      className={cn('w-auto max-w-full object-contain object-left', sizeMap[size], className)}
    />
  );
}
