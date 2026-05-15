import { Boxes } from 'lucide-react';
import { cn } from '@/lib/utils';

interface NimsLogoProps {
  size?: 'sm' | 'md' | 'lg';
  variant?: 'light' | 'dark';
  showText?: boolean;
  className?: string;
}

const sizeMap = {
  sm: { box: 'h-6 w-6', icon: 'h-3.5 w-3.5', text: 'text-sm' },
  md: { box: 'h-7 w-7', icon: 'h-4 w-4', text: 'text-base' },
  lg: { box: 'h-10 w-10', icon: 'h-5 w-5', text: 'text-xl' },
};

export function NimsLogo({ size = 'md', variant = 'dark', showText = true, className }: NimsLogoProps) {
  const s = sizeMap[size];
  const isDark = variant === 'dark';

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <div className={cn(
        'flex items-center justify-center rounded-[8px]',
        s.box,
        isDark ? 'bg-lavender' : 'bg-foreground',
      )}>
        <Boxes className={cn(s.icon, 'text-white')} strokeWidth={2.5} />
      </div>
      {showText && (
        <span className={cn(
          'font-bold tracking-[-0.02em]',
          s.text,
          isDark ? 'text-white' : 'text-foreground',
        )}>
          NIMS
        </span>
      )}
    </div>
  );
}
