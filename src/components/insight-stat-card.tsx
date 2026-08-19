import { Link } from '@tanstack/react-router';
import type { ElementType, ReactNode } from 'react';
import { cn } from '@/lib/utils';

export const INSIGHT_CARD_TONES = {
  lime: {
    badge: 'bg-[#c9ef4a] text-[#15240a]',
    watermark: 'text-[#c9ef4a]/35 dark:text-[#c9ef4a]/20',
  },
  sky: {
    badge: 'bg-[#7dd6f5] text-[#0b2a38]',
    watermark: 'text-[#7dd6f5]/40 dark:text-[#7dd6f5]/20',
  },
  violet: {
    badge: 'bg-[#c4b4ff] text-[#22164a]',
    watermark: 'text-[#c4b4ff]/45 dark:text-[#c4b4ff]/20',
  },
  amber: {
    badge: 'bg-amber-300 text-amber-950',
    watermark: 'text-amber-300/45 dark:text-amber-400/20',
  },
  emerald: {
    badge: 'bg-emerald-300 text-emerald-950',
    watermark: 'text-emerald-300/40 dark:text-emerald-400/20',
  },
  rose: {
    badge: 'bg-rose-300 text-rose-950',
    watermark: 'text-rose-300/40 dark:text-rose-400/20',
  },
} as const;

export type InsightCardTone = keyof typeof INSIGHT_CARD_TONES;

export function InsightStatCard({
  icon: Icon,
  label,
  value,
  hint,
  tone,
  href,
  children,
}: {
  icon: ElementType;
  label: string;
  value: number;
  hint?: string;
  tone: InsightCardTone;
  href?: string;
  children?: ReactNode;
}) {
  const colors = INSIGHT_CARD_TONES[tone];

  const header = (
    <div className="relative z-10 flex items-center gap-2.5">
      <span className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-full', colors.badge)}>
        <Icon className="h-4 w-4" strokeWidth={1.75} />
      </span>
      <p className="min-w-0 truncate text-sm font-medium text-foreground">{label}</p>
    </div>
  );

  return (
    <div className="relative flex h-full flex-col overflow-hidden rounded-[28px] border border-border bg-card p-5">
      {href ? (
        <Link
          to={href}
          className="relative z-10 rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {header}
        </Link>
      ) : (
        header
      )}
      <p className="relative z-10 mt-5 font-serif text-5xl leading-none tracking-tight text-foreground">{value}</p>
      {hint ? <p className="relative z-10 mt-2 text-sm text-muted-foreground">{hint}</p> : null}
      {children ? <div className="relative z-10 mt-4">{children}</div> : null}
      <Icon
        className={cn(
          'pointer-events-none absolute -bottom-4 -right-3 h-32 w-32 -rotate-12',
          colors.watermark,
        )}
        strokeWidth={1.1}
        aria-hidden
      />
    </div>
  );
}
