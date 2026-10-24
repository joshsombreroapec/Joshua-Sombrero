import React, { useState } from 'react';
import { ChartCategoryItem } from '../../lib/types';

interface DonutPieChartProps {
  title: string;
  data: ChartCategoryItem[];
  colorTheme?: 'blue' | 'navy' | 'slate';
  onSliceClick?: (label: string) => void;
}

export const DonutPieChart: React.FC<DonutPieChartProps> = ({
  title,
  data,
  onSliceClick,
}) => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  if (!data || data.length === 0) {
    return (
      <div className="p-8 text-center text-xs text-[#334155] font-semibold">
        No distribution data for {title}.
      </div>
    );
  }

  const total = data.reduce((acc, curr) => acc + curr.count, 0) || 1;

  // Blue-themed graduated palette: Navy, Royal Blue, Medium Blue, Sky Blue, Ice Blue
  const palette = [
    '#0f2b5c', // Deep Navy
    '#2563eb', // Royal Blue
    '#3b82f6', // Vivid Blue
    '#60a5fa', // Light Blue
    '#93c5fd', // Ice Blue
    '#38bdf8', // Sky Blue
  ];

  // SVG dimensions
  const size = 160;
  const strokeWidth = 24;
  const radius = (size - strokeWidth) / 2;
  const center = size / 2;
  const circumference = 2 * Math.PI * radius;

  // Calculate arc offsets
  let accumulatedAngle = 0;
  const slices = data.map((item, idx) => {
    const fraction = item.count / total;
    const strokeDasharray = `${fraction * circumference} ${circumference}`;
    const strokeDashoffset = -accumulatedAngle * circumference;
    accumulatedAngle += fraction;

    return {
      ...item,
      color: palette[idx % palette.length],
      strokeDasharray,
      strokeDashoffset,
    };
  });

  const activeSlice = hoveredIndex !== null ? slices[hoveredIndex] : null;

  return (
    <div className="flex flex-col h-full justify-between">
      <div className="pb-3 border-b border-[#CBD5E1] mb-2 flex items-center justify-between">
        <div>
          <h4 className="text-sm sm:text-base font-bold text-[#1E293B] tracking-tight">
            {title}
          </h4>
          <span className="text-xs text-[#334155] font-mono font-semibold">
            Total: {total.toLocaleString()} units
          </span>
        </div>
        <span className="text-xs text-[#2563EB] font-extrabold bg-blue-100 px-2 py-0.5 rounded border border-blue-200">
          Click slice to drill
        </span>
      </div>

      {/* SVG Donut Circle */}
      <div className="relative flex items-center justify-center my-3">
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="rotate-[-90deg]">
          {/* Background circle track with strong contrast */}
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="transparent"
            stroke="currentColor"
            strokeWidth={strokeWidth}
            className="text-slate-200 dark:text-slate-700"
          />

          {/* Slices */}
          {slices.map((slice, idx) => {
            const isHovered = hoveredIndex === idx;
            return (
              <circle
                key={slice.label || idx}
                cx={center}
                cy={center}
                r={radius}
                fill="transparent"
                stroke={slice.color}
                strokeWidth={isHovered ? strokeWidth + 4 : strokeWidth}
                strokeDasharray={slice.strokeDasharray}
                strokeDashoffset={slice.strokeDashoffset}
                onMouseEnter={() => setHoveredIndex(idx)}
                onMouseLeave={() => setHoveredIndex(null)}
                onClick={() => onSliceClick && onSliceClick(slice.label)}
                className="transition-all duration-200 cursor-pointer"
              />
            );
          })}
        </svg>

        {/* Center label */}
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none px-2">
          {activeSlice ? (
            <>
              <span className="text-base font-extrabold text-[#1d4ed8] font-mono leading-none">
                {activeSlice.percentage}%
              </span>
              <span className="text-[11px] text-slate-900 dark:text-slate-100 truncate max-w-[85px] mt-1 font-extrabold">
                {activeSlice.label}
              </span>
            </>
          ) : (
            <>
              <span className="text-base font-extrabold text-[#1E293B] font-mono leading-none">
                100%
              </span>
              <span className="text-[11px] text-[#334155] mt-1 font-semibold">Distribution</span>
            </>
          )}
        </div>
      </div>

      {/* Interactive Legend List */}
      <div className="space-y-1.5 mt-1 max-h-40 overflow-y-auto pr-1">
        {slices.map((slice, idx) => {
          const isHovered = hoveredIndex === idx;
          return (
            <div
              key={slice.label || idx}
              onMouseEnter={() => setHoveredIndex(idx)}
              onMouseLeave={() => setHoveredIndex(null)}
              onClick={() => onSliceClick && onSliceClick(slice.label)}
              className={`flex items-center justify-between p-2 rounded-lg text-xs transition-colors cursor-pointer ${
                isHovered
                  ? 'bg-blue-100/70 dark:bg-slate-800 text-[#1d4ed8] font-extrabold'
                  : 'text-slate-900 dark:text-slate-100 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center gap-2 truncate pr-2">
                <span
                  className="w-3.5 h-3.5 rounded-sm shrink-0 border border-black/10"
                  style={{ backgroundColor: slice.color }}
                />
                <span className="truncate font-bold text-slate-900 dark:text-slate-100 text-xs">
                  {slice.label}
                </span>
              </div>
              <span className="font-mono text-xs shrink-0 text-slate-950 dark:text-white font-extrabold">
                {slice.count.toLocaleString()} ({slice.percentage}%)
              </span>
            </div>
          );
        })}
      </div>

      {/* Tooltip on hover */}
      {activeSlice && (
        <div className="mt-2.5 p-2.5 bg-[#072757] text-white text-xs rounded-xl text-center font-mono border-2 border-blue-400 shadow-md">
          <span className="font-bold text-white">{activeSlice.label}:</span> <strong className="text-sky-300 font-extrabold">{activeSlice.count.toLocaleString()}</strong> ({activeSlice.percentage}%) • Click to drill
        </div>
      )}
    </div>
  );
};
