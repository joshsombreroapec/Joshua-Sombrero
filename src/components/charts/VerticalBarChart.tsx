import React, { useState } from 'react';

interface VerticalComparisonItem {
  key: string;
  label: string;
  count: number;
}

interface VerticalBarChartProps {
  data: VerticalComparisonItem[];
  totalUnits: number;
  title?: string;
  onItemClick?: (key: string, label: string) => void;
}

export const VerticalBarChart: React.FC<VerticalBarChartProps> = ({
  data,
  totalUnits,
  title = 'Pipeline Milestone Status Comparison',
  onItemClick,
}) => {
  const [hoveredKey, setHoveredKey] = useState<string | null>(null);

  if (!data || data.length === 0) {
    return <div className="p-8 text-center text-xs text-[#334155] font-semibold">No comparison data available.</div>;
  }

  const maxVal = Math.max(10, ...data.map((d) => d.count));
  const height = 210;

  const hoveredItem = data.find((d) => d.key === hoveredKey);

  // Background guide values
  const gridSteps = [1, 0.75, 0.5, 0.25, 0];

  return (
    <div className="relative">
      <div className="flex items-center justify-between pb-3 border-b border-[#CBD5E1] mb-4">
        <div>
          <h3 className="text-base sm:text-lg font-bold text-[#1E293B] tracking-tight">
            {title}
          </h3>
          <p className="text-xs text-[#334155] font-semibold mt-0.5">
            Breakdown across key milestone stages
          </p>
        </div>
        <div className="text-xs text-[#334155] font-mono font-semibold bg-slate-100 px-2.5 py-1 rounded-md border border-[#CBD5E1]">
          Total Baseline: <strong className="text-[#1E293B] font-extrabold">{totalUnits.toLocaleString()}</strong> units
        </div>
      </div>

      {/* Vertical Bars Container with background gridlines */}
      <div className="relative pt-4 pb-2" style={{ height: `${height}px` }}>
        {/* Horizontal grid lines */}
        <div className="absolute inset-0 flex flex-col justify-between pointer-events-none pb-12 pt-6">
          {gridSteps.map((step, idx) => (
            <div key={idx} className="w-full border-b border-[#CBD5E1]/80 flex items-center justify-between">
              <span className="text-[11px] font-mono text-[#334155] font-semibold pl-1 -translate-y-2.5">
                {Math.round(maxVal * step).toLocaleString()}
              </span>
            </div>
          ))}
        </div>

        <div className="relative z-10 grid grid-cols-6 gap-2 sm:gap-3 items-end h-full pb-10 pl-10">
          {data.map((item) => {
            const isHovered = hoveredKey === item.key;
            const heightPct = Math.max(8, Math.round((item.count / maxVal) * 100));
            const pctOfTotal = totalUnits > 0 ? ((item.count / totalUnits) * 100).toFixed(1) : '0';

            // Status colors: energized = green, priority = red, folder/taken out = blue
            let barColor = 'bg-[#2563EB]';
            if (item.key === 'energized' || item.key === 'within21Days') {
              barColor = isHovered ? 'bg-emerald-500' : 'bg-emerald-600';
            } else if (item.key === 'priority') {
              barColor = isHovered ? 'bg-red-500' : 'bg-red-600';
            } else if (item.key === 'takenOut') {
              barColor = isHovered ? 'bg-blue-500' : 'bg-[#2563EB]';
            } else if (item.key === 'ongoing') {
              barColor = isHovered ? 'bg-sky-400' : 'bg-sky-500';
            } else if (item.key === 'nys') {
              barColor = isHovered ? 'bg-slate-400' : 'bg-[#64748B]';
            }

            return (
              <div
                key={item.key}
                onMouseEnter={() => setHoveredKey(item.key)}
                onMouseLeave={() => setHoveredKey(null)}
                onClick={() => onItemClick && onItemClick(item.key, item.label)}
                className="flex flex-col items-center h-full justify-end group cursor-pointer"
              >
                {/* Bold count label above bar */}
                <span
                  className={`text-xs sm:text-sm font-mono font-extrabold mb-2 transition-all ${
                    isHovered
                      ? 'text-[#2563EB] scale-110'
                      : 'text-[#1E293B]'
                  }`}
                >
                  {item.count > 9999 ? `${(item.count / 1000).toFixed(1)}k` : item.count.toLocaleString()}
                </span>

                {/* The Vertical Bar with distinct border */}
                <div className="w-full max-w-[54px] bg-slate-200 rounded-t-xl p-0.5 flex flex-col justify-end h-full">
                  <div
                    className={`w-full rounded-t-lg transition-all duration-300 ${barColor} ${
                      isHovered ? 'brightness-110 shadow-lg ring-2 ring-blue-300' : 'opacity-100'
                    }`}
                    style={{ height: `${heightPct}%` }}
                  />
                </div>

                {/* Category label below bar */}
                <div className="mt-2.5 text-center w-full">
                  <p
                    className={`text-[11px] sm:text-xs font-bold truncate leading-tight transition-colors ${
                      isHovered
                        ? 'text-[#2563EB] font-extrabold'
                        : 'text-[#1E293B]'
                    }`}
                    title={item.label}
                  >
                    {item.label}
                  </p>
                  <span className="text-[11px] font-mono text-[#334155] font-semibold block mt-0.5">
                    {pctOfTotal}%
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Hover Floating Tooltip */}
      {hoveredItem && (
        <div className="mt-3 p-3 bg-[#1E293B] text-white text-xs rounded-xl shadow-xl border border-[#CBD5E1] flex items-center justify-between">
          <span className="font-extrabold text-white text-sm">{hoveredItem.label}</span>
          <span className="font-mono text-xs text-slate-200">
            Count: <strong className="text-emerald-400 text-sm font-extrabold">{hoveredItem.count.toLocaleString()}</strong> units (
            {totalUnits > 0 ? ((hoveredItem.count / totalUnits) * 100).toFixed(1) : 0}% of baseline) • Click to drill down
          </span>
        </div>
      )}
    </div>
  );
};
