import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

type StatTone = 'brand' | 'plum' | 'mint' | 'slate';

const toneClassName: Record<StatTone, string> = {
  brand: 'frox-stat-card--brand',
  plum: 'frox-stat-card--plum',
  mint: 'frox-stat-card--mint',
  slate: 'frox-stat-card--slate',
};

interface FroxStatCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  tone?: StatTone;
  active?: boolean;
  onClick?: () => void;
}

export function FroxStatCard({
  label,
  value,
  icon: Icon,
  tone = 'brand',
  active = false,
  onClick,
}: FroxStatCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'frox-stat-card w-full p-5 text-left',
        toneClassName[tone],
        active && 'frox-stat-card--active',
        !onClick && 'cursor-default'
      )}
    >
      <div className="relative z-[1] flex items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--frox-gray-500)]">
            {label}
          </p>
          {active && (
            <p className="mt-2 inline-flex rounded-full bg-[rgba(115,100,219,0.12)] px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--frox-brand-strong)]">
              Активный фильтр
            </p>
          )}
          <p
            data-frox-heading="true"
            className={`${active ? 'mt-2' : 'mt-3'} text-[2rem] font-black leading-none text-[var(--frox-gray-1100)] tabular-nums`}
          >
            {value}
          </p>
        </div>
        <div className="frox-stat-card__icon flex h-11 w-11 items-center justify-center rounded-2xl">
          <Icon className="h-5 w-5" />
        </div>
      </div>
      <div className="frox-stat-card__orb" />
    </button>
  );
}
