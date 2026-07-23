import type { ReactNode } from 'react';
import { Link } from '@tanstack/react-router';

export type MetricColor = 'orange' | 'blue' | 'green' | 'purple' | 'red' | 'teal';

export interface MetricCardProps {
  label: string;
  value: number | string | undefined;
  icon: ReactNode;
  color: MetricColor;
  to?: string;
  index: number;
  mounted: boolean;
}

const colorMap: Record<MetricColor, { bg: string; text: string; ring: string }> = {
  orange: { bg: 'bg-black/5', text: 'text-slate-600', ring: 'ring-black/10' },
  blue: { bg: 'bg-black/5', text: 'text-slate-600', ring: 'ring-black/10' },
  green: { bg: 'bg-black/5', text: 'text-slate-600', ring: 'ring-black/10' },
  purple: { bg: 'bg-black/5', text: 'text-slate-600', ring: 'ring-black/10' },
  red: { bg: 'bg-black/5', text: 'text-slate-600', ring: 'ring-black/10' },
  teal: { bg: 'bg-black/5', text: 'text-slate-600', ring: 'ring-black/10' },
};

export function MetricCard({ label, value, icon, color, to, index, mounted }: MetricCardProps): ReactNode {
  const c = colorMap[color];
  const content = (
    <div
      className="group relative overflow-hidden rounded-xl border border-slate-200/80 bg-white p-5 transition-all duration-300 hover:shadow-lg hover:shadow-slate-200/50 hover:-translate-y-0.5"
      style={{
        opacity: mounted ? 1 : 0,
        transform: mounted ? 'translateY(0)' : 'translateY(16px)',
        transition: `all 0.4s ease-out ${0.1 + index * 0.07}s`,
      }}
    >
      <div className="flex items-start justify-between">
        <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${c.bg} ${c.text} ${c.ring} ring-1`}>
          {icon}
        </div>
        <span className={`text-2xl font-bold ${c.text}`}>
          {value ?? <span className="inline-block h-6 w-10 animate-pulse rounded bg-slate-200" />}
        </span>
      </div>
      <p className="mt-3 text-sm font-medium text-slate-600">{label}</p>
      {/* Shine effect on hover */}
      <div className="pointer-events-none absolute -inset-x-4 -inset-y-4 -translate-x-full rounded-xl bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-0 transition-all duration-700 group-hover:translate-x-full group-hover:opacity-100" />
    </div>
  );

  if (to) {
    return <Link to={to as any}>{content}</Link>;
  }
  return content;
}
