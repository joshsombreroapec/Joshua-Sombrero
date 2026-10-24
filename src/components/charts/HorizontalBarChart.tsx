import React, { useState } from 'react';
import { ChartCategoryItem } from '../../lib/types';
import { ArrowUpRight } from 'lucide-react';

interface HorizontalBarChartProps {
  title: string;
  subtitle?: string;
  data: ChartCategoryItem[];
  accentKey?: string;
  onItemClick?: (label: string) => void;
}

export const HorizontalBarChart: React.FC<HorizontalBarChartProps> = ({
  title,
  subtitle,
  data,
  accentKey,
  onItemClick,
}) => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  if (!data || data.length === 0) {
    return (
      <div className="p-8 text-center text-xs text-[#334155] font-semibold">
        No breakdown data available for current selection.
      </div>
    );
  }

  const maxVal = Math.max(1, ...data.map((d) => d.count));

  return (
    <div className="relative">
      <div className="flex items-center justify-between pb-3 border-b border-[#CBD5E1] mb-3.5">
        <div>
          <h3 className="text-base sm:text-lg font-bold text-[#1E293B] tracking-tight">
            {title}
          </h3>
          {subtitle && (
            <p className="text-xs text-[#334155] font-semibold mt-0.5">
              {subtitle}
            </p>
          )}
        </div>
        <span className="text-xs text-[#334155] font-semibold bg-slate-100 px-2 py-0.5 rounded border border-[#CBD5E1]">
          Units (% of Total)
        </span>
      </div>

      <div className="space-y-2.5">
        {data.map((item, idx) => {
          const isHovered = hoveredIndex === idx;
          const isPrimary =
            accentKey && item.label.toUpperCase().includes(accentKey.toUpperCase());
          const widthPct = Math.max(2, Math.min(100, (item.count / maxVal) * 100));

          return (
            <div
              key={item.label || idx}
              onMouseEnter={() => setHoveredIndex(idx)}
              onMouseLeave={() => setHoveredIndex(null)}
              onClick={() => onItemClick && onItemClick(item.label)}
              className={`p-2.5 rounded-xl transition-all cursor-pointer group ${
                isHovered
                  ? 'bg-slate-100 ring-2 ring-[#2563EB]'
                  : 'hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span
                  className={`truncate pr-3 transition-colors ${
                    isPrimary || isHovered
                      ? 'text-[#2563EB] font-extrabold text-[13px]'
                      : 'text-[#1E293B] font-bold text-xs'
                  }`}
                  title={item.label}
                >
                  {item.label}
                </span>
                <span className="shrink-0 font-mono text-xs flex items-center gap-2">
                  <strong className="font-extrabold text-[#1E293B] text-xs sm:text-sm">
                    {item.count.toLocaleString()}
                  </strong>
                  <span className="text-[#334155] font-semibold text-[11px]">
                    ({item.percentage}%)
                  </span>
                  <ArrowUpRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-[#2563EB] transition-colors" />
                </span>
              </div>

              {/* Progress track with green progress bars requirement */}
              <div className="w-full bg-slate-200 h-3 rounded-full overflow-hidden p-0.5">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${
                    isPrimary || isHovered
                      ? 'bg-emerald-500'
                      : 'bg-emerald-600'
                  }`}
                  style={{ width: `${widthPct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Hover Floating Tooltip */}
      {hoveredIndex !== null && data[hoveredIndex] && (
        <div className="mt-3 p-3 bg-[#1E293B] text-white text-xs rounded-xl shadow-xl border border-[#CBD5E1] flex items-center justify-between">
          <span className="truncate pr-3 text-white font-extrabold text-xs">
            {data[hoveredIndex].label}
          </span>
          <span className="font-mono shrink-0 text-slate-200 text-xs">
            Exact: <strong className="text-emerald-400 font-extrabold">{data[hoveredIndex].count.toLocaleString()}</strong> units ({data[hoveredIndex].percentage}%) • Click to drill down
          </span>
        </div>
      )}
    </div>
  );
};
