import type { ReactNode } from 'react';
import { Link } from '@tanstack/react-router';
import { ArrowRightIcon } from './icons';
import type { MetricColor } from './metric-card';

export interface QuickLink {
  to: string;
  title: string;
  description: string;
  icon: ReactNode;
  color: MetricColor;
  cta: string;
  count?: number;
}

const colorMap: Record<MetricColor, { bg: string; text: string; ring: string }> = {
  orange: { bg: 'bg-black/5', text: 'text-slate-600', ring: 'ring-black/10' },
  blue: { bg: 'bg-black/5', text: 'text-slate-600', ring: 'ring-black/10' },
  green: { bg: 'bg-black/5', text: 'text-slate-600', ring: 'ring-black/10' },
  purple: { bg: 'bg-black/5', text: 'text-slate-600', ring: 'ring-black/10' },
  red: { bg: 'bg-black/5', text: 'text-slate-600', ring: 'ring-black/10' },
  teal: { bg: 'bg-black/5', text: 'text-slate-600', ring: 'ring-black/10' },
};

export function QuickAccessCard({ link, index, mounted }: { link: QuickLink; index: number; mounted: boolean }): ReactNode {
  const c = colorMap[link.color];
  return (
    <Link
      to={link.to as any}
      className="group relative overflow-hidden rounded-xl border border-slate-200/80 bg-white p-5 transition-all duration-300 hover:shadow-lg hover:shadow-slate-200/50 hover:-translate-y-0.5"
      style={{
        opacity: mounted ? 1 : 0,
        transform: mounted ? 'translateY(0)' : 'translateY(20px)',
        transition: `all 0.5s ease-out ${0.25 + index * 0.08}s`,
      }}
    >
      <div className="flex items-start justify-between">
        <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${c.bg} ${c.text} ring-1 ${c.ring}`}>
          {link.icon}
        </div>
        {link.count !== undefined && (
          <span className={`inline-flex items-center justify-center rounded-full ${c.bg} px-2.5 py-0.5 text-xs font-semibold ${c.text}`}>
            {link.count}
          </span>
        )}
      </div>
      <h3 className="mt-3 text-sm font-semibold text-slate-900">{link.title}</h3>
      <p className="mt-1 text-xs text-slate-500">{link.description}</p>
      <p className={`mt-3 flex items-center gap-1 text-xs font-medium ${c.text} transition-all group-hover:gap-1.5`}>
        {link.cta}
        <ArrowRightIcon />
      </p>
      {/* Shine */}
      <div className="pointer-events-none absolute -inset-x-4 -inset-y-4 -translate-x-full rounded-xl bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-0 transition-all duration-700 group-hover:translate-x-full group-hover:opacity-100" />
    </Link>
  );
}
