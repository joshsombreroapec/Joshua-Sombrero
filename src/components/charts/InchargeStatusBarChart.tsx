import React, { useState } from 'react';
import { InchargeStatusBreakdown, UnitStatusCategory } from '../../lib/types';

interface InchargeStatusBarChartProps {
  data?: InchargeStatusBreakdown;
  onBarClick?: (person: string, category: UnitStatusCategory) => void;
}

export const InchargeStatusBarChart: React.FC<InchargeStatusBarChartProps> = ({
  data,
  onBarClick,
}) => {
  // Toggle between 'standard' (dedicated totals) and 'lifecycle' (mutually exclusive 1:1 partition)
  const [viewMode, setViewMode] = useState<'standard' | 'lifecycle'>('standard');
  const [hoveredBar, setHoveredBar] = useState<{
    category: UnitStatusCategory;
    person: string;
    color: string;
    count: number;
    totalPersonUnits: number;
    categoryTotal: number;
    svgX: number;
    svgY: number;
  } | null>(null);

  const [showUnmatchedModal, setShowUnmatchedModal] = useState(false);

  if (!data || !data.people || data.people.length === 0) {
    return (
      <div className="p-8 text-center text-xs font-semibold text-[#334155] bg-white rounded-2xl border border-[#CBD5E1]">
        No in-charge unit status breakdown data available for the active filters.
      </div>
    );
  }

  const { categories, people, unmatchedCount, unmatchedDetails, totalAssignedUnits } = data;

  // Extract counts for each person based on active view mode
  const getCount = (personName: string, cat: UnitStatusCategory): number => {
    const p = people.find((item) => item.name === personName);
    if (!p) return 0;
    return viewMode === 'standard' ? p.standardCounts[cat] || 0 : p.lifecycleCounts[cat] || 0;
  };

  // Find max value across all visible bars
  let maxCount = 0;
  categories.forEach((cat) => {
    people.forEach((p) => {
      const c = getCount(p.name, cat);
      if (c > maxCount) maxCount = c;
    });
  });

  // Calculate nice integer ticks for the vertical axis starting at 0
  const calculateYScale = (maxVal: number) => {
    const target = Math.max(10, maxVal);
    const roughStep = target / 5;
    const magnitude = Math.pow(10, Math.floor(Math.log10(roughStep)));
    const residual = roughStep / magnitude;
    let step: number;
    if (residual <= 1.2) step = 1 * magnitude;
    else if (residual <= 2.5) step = 2 * magnitude;
    else if (residual <= 5) step = 5 * magnitude;
    else step = 10 * magnitude;

    step = Math.max(1, Math.round(step));
    const tickCount = Math.ceil(target / step);
    const niceMax = tickCount * step;
    const ticks: number[] = [];
    for (let i = 0; i <= tickCount; i++) {
      ticks.push(i * step);
    }
    return { max: niceMax, ticks };
  };

  const { max: yMax, ticks: yTicks } = calculateYScale(maxCount);

  // SVG Layout dimensions
  const svgWidth = 1000;
  const svgHeight = 440;
  const paddingLeft = 85;
  const paddingRight = 30;
  const paddingTop = 45;
  const paddingBottom = 75;

  const chartWidth = svgWidth - paddingLeft - paddingRight;
  const chartHeight = svgHeight - paddingTop - paddingBottom;

  const categoryWidth = chartWidth / categories.length;
  const barGroupWidth = categoryWidth * 0.72;
  const barGap = 4;
  const barWidth = (barGroupWidth - barGap * (people.length - 1)) / people.length;

  const getYCoord = (val: number) => {
    if (yMax <= 0) return paddingTop + chartHeight;
    return paddingTop + chartHeight - (val / yMax) * chartHeight;
  };

  // Pre-calculate category totals across the 3 people for tooltip share
  const categoryTotals: Record<string, number> = {};
  categories.forEach((cat) => {
    categoryTotals[cat] = people.reduce((acc, p) => acc + getCount(p.name, cat), 0);
  });

  return (
    <div className="p-6 rounded-2xl bg-white border border-[#CBD5E1] shadow-xs relative">
      {/* Header and Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-[#CBD5E1]">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h3 className="text-base sm:text-lg font-bold text-[#1E293B] tracking-tight">
              Unit Status Breakdown by In-Charge
            </h3>
            {unmatchedCount > 0 ? (
              <button
                onClick={() => setShowUnmatchedModal(true)}
                className="px-2 py-0.5 text-[11px] font-bold text-amber-900 bg-amber-100 hover:bg-amber-200 border border-amber-300 rounded-md transition-colors"
                title="Click to view unmatched records"
              >
                ⚠️ {unmatchedCount.toLocaleString()} Unmatched Statuses
              </button>
            ) : (
              <span className="px-2 py-0.5 text-[11px] font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-md">
                ✓ 100% Statuses Mapped (0 Unmatched)
              </span>
            )}
          </div>
          <p className="text-xs text-[#334155] font-semibold mt-1">
            Grouped comparison of unit volumes for RENZ, RONALD, and MARK across 5 status categories
          </p>
        </div>

        {/* View Mode Toggle Pill & Assigned Units Count */}
        <div className="flex items-center gap-3 self-start lg:self-center flex-wrap">
          <div className="inline-flex p-0.5 bg-slate-100 rounded-lg border border-[#CBD5E1]">
            <button
              onClick={() => setViewMode('standard')}
              className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${
                viewMode === 'standard'
                  ? 'bg-white text-[#1E293B] shadow-xs font-bold'
                  : 'text-[#334155] hover:text-[#1E293B]'
              }`}
              title="Shows dedicated status volumes: Taken Out, Energized (excl. 21d), Within 21d, Ongoing, and NYS"
            >
              Standard Status Counts
            </button>
            <button
              onClick={() => setViewMode('lifecycle')}
              className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${
                viewMode === 'lifecycle'
                  ? 'bg-white text-[#1E293B] shadow-xs font-bold'
                  : 'text-[#334155] hover:text-[#1E293B]'
              }`}
              title="Strict 100% mutually exclusive partition where each unit is counted exactly once"
            >
              Strict 1:1 Milestone Partition
            </button>
          </div>

          <div className="text-xs text-[#334155] font-mono font-semibold bg-slate-100 px-3 py-1 rounded-md border border-[#CBD5E1]">
            In-Charge Total: <strong className="text-[#1E293B] font-extrabold">{totalAssignedUnits.toLocaleString()}</strong> units
          </div>
        </div>
      </div>

      {/* Legend with Person Names, Colors, and Person Unit Counts */}
      <div className="flex flex-wrap items-center justify-between gap-3 mt-4 mb-2 px-1">
        <div className="flex flex-wrap items-center gap-4 sm:gap-6">
          <span className="text-xs font-bold uppercase tracking-wider text-[#334155]">Series:</span>
          {people.map((person) => {
            const isHovered = hoveredBar?.person === person.name;
            return (
              <div
                key={person.name}
                className={`flex items-center gap-2 text-xs font-semibold px-2.5 py-1 rounded-md transition-colors ${
                  isHovered ? 'bg-slate-100 ring-1 ring-slate-300' : ''
                }`}
              >
                <span
                  className="w-3.5 h-3.5 rounded-xs shrink-0 shadow-2xs"
                  style={{ backgroundColor: person.color }}
                />
                <span className="font-bold text-[#1E293B]">{person.name}</span>
                <span className="text-[#334155] font-mono text-[11px] font-semibold">
                  ({person.total.toLocaleString()} units)
                </span>
              </div>
            );
          })}
        </div>

        <div className="text-[11px] text-[#475569] font-medium hidden sm:block">
          {viewMode === 'standard'
            ? 'Dedicated milestones: Taken Out & non-overlapping Within 21d vs. Energized'
            : '100% partition: Taken Out ➔ Energized (21d) ➔ Energized ➔ Ongoing ➔ NYS'}
        </div>
      </div>

      {/* Responsive SVG Grouped Bar Chart */}
      <div className="relative w-full overflow-x-auto pt-2">
        <svg
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          className="w-full h-auto min-w-[700px] select-none"
          style={{ fontVariantNumeric: 'tabular-nums' }}
        >
          {/* Horizontal Gridlines & Y-Axis Labels */}
          {yTicks.map((tickVal) => {
            const y = getYCoord(tickVal);
            const isBaseline = tickVal === 0;
            return (
              <g key={`ytick-${tickVal}`}>
                <line
                  x1={paddingLeft}
                  y1={y}
                  x2={paddingLeft + chartWidth}
                  y2={y}
                  stroke={isBaseline ? '#CBD5E1' : '#E2E8F0'}
                  strokeWidth={isBaseline ? 1.5 : 1}
                  strokeDasharray={isBaseline ? undefined : '3 3'}
                />
                <text
                  x={paddingLeft - 12}
                  y={y + 4}
                  textAnchor="end"
                  fill="#334155"
                  fontSize="11"
                  fontWeight="600"
                  fontFamily="ui-monospace, monospace"
                >
                  {tickVal.toLocaleString()}
                </text>
              </g>
            );
          })}

          {/* Left Vertical Axis Label */}
          <text
            transform={`rotate(-90 ${paddingLeft - 58} ${paddingTop + chartHeight / 2})`}
            x={paddingLeft - 58}
            y={paddingTop + chartHeight / 2}
            textAnchor="middle"
            fill="#334155"
            fontSize="11"
            fontWeight="700"
            letterSpacing="0.05em"
          >
            NUMBER OF UNITS
          </text>

          {/* Category Sections (Horizontal Axis) */}
          {categories.map((cat, catIdx) => {
            const catGroupStartX = paddingLeft + catIdx * categoryWidth;
            const catCenterX = catGroupStartX + categoryWidth / 2;
            const barGroupStartX = catCenterX - barGroupWidth / 2;

            return (
              <g key={cat} className="category-group">
                {/* Subtle vertical separator between categories */}
                {catIdx > 0 && (
                  <line
                    x1={catGroupStartX}
                    y1={paddingTop - 10}
                    x2={catGroupStartX}
                    y2={paddingTop + chartHeight}
                    stroke="#F1F5F9"
                    strokeWidth={1}
                  />
                )}

                {/* 3 Grouped Bars for RENZ, RONALD, MARK */}
                {people.map((person, personIdx) => {
                  const count = getCount(person.name, cat);
                  const barX = barGroupStartX + personIdx * (barWidth + barGap);
                  const barY = getYCoord(count);
                  const barH = paddingTop + chartHeight - barY;
                  const isZero = count === 0;
                  const isHovered =
                    hoveredBar?.category === cat && hoveredBar?.person === person.name;

                  return (
                    <g
                      key={`${cat}-${person.name}`}
                      className="cursor-pointer group"
                      onMouseEnter={() => {
                        setHoveredBar({
                          category: cat,
                          person: person.name,
                          color: person.color,
                          count,
                          totalPersonUnits: person.total,
                          categoryTotal: categoryTotals[cat] || 0,
                          svgX: barX + barWidth / 2,
                          svgY: isZero ? paddingTop + chartHeight - 15 : barY,
                        });
                      }}
                      onMouseLeave={() => setHoveredBar(null)}
                      onClick={() => onBarClick && onBarClick(person.name, cat)}
                    >
                      {/* Interactive hover background hit-area */}
                      <rect
                        x={barX - 2}
                        y={paddingTop}
                        width={barWidth + 4}
                        height={chartHeight}
                        fill="transparent"
                      />

                      {/* Bar Rectangle */}
                      {isZero ? (
                        // Zero-value bar representation (slim baseline marker)
                        <rect
                          x={barX}
                          y={paddingTop + chartHeight - 2}
                          width={barWidth}
                          height={2}
                          fill={person.color}
                          opacity={0.4}
                          rx={1}
                        />
                      ) : (
                        <rect
                          x={barX}
                          y={barY}
                          width={barWidth}
                          height={barH}
                          fill={person.color}
                          rx={3}
                          ry={3}
                          className="transition-all duration-200"
                          opacity={hoveredBar && !isHovered ? 0.45 : 1}
                          stroke={isHovered ? '#1E293B' : 'none'}
                          strokeWidth={isHovered ? 1.5 : 0}
                        />
                      )}

                      {/* Data label directly above each bar */}
                      <text
                        x={barX + barWidth / 2}
                        y={isZero ? paddingTop + chartHeight - 8 : barY - 6}
                        textAnchor="middle"
                        fill={isHovered ? person.color : '#1E293B'}
                        fontSize="11"
                        fontWeight={isHovered ? '800' : '700'}
                        fontFamily="ui-monospace, monospace"
                        className="transition-all duration-150 pointer-events-none"
                      >
                        {count.toLocaleString()}
                      </text>
                    </g>
                  );
                })}

                {/* X-Axis Category Labels with clean multi-line wrapping */}
                <g className="category-label">
                  {cat === 'ENERGIZED - 1. WITHIN 21 DAYS' ? (
                    <text
                      x={catCenterX}
                      y={paddingTop + chartHeight + 20}
                      textAnchor="middle"
                      fill="#1E293B"
                      fontSize="11"
                      fontWeight="700"
                    >
                      <tspan x={catCenterX} dy="0">
                        ENERGIZED - 1.
                      </tspan>
                      <tspan x={catCenterX} dy="15" fill="#334155" fontWeight="600">
                        WITHIN 21 DAYS
                      </tspan>
                    </text>
                  ) : cat === 'TAKEN OUT' ? (
                    <text
                      x={catCenterX}
                      y={paddingTop + chartHeight + 24}
                      textAnchor="middle"
                      fill="#1E293B"
                      fontSize="11"
                      fontWeight="700"
                    >
                      TAKEN OUT
                    </text>
                  ) : cat === 'ENERGIZED' ? (
                    <text
                      x={catCenterX}
                      y={paddingTop + chartHeight + 20}
                      textAnchor="middle"
                      fill="#1E293B"
                      fontSize="11"
                      fontWeight="700"
                    >
                      <tspan x={catCenterX} dy="0">
                        ENERGIZED
                      </tspan>
                      <tspan x={catCenterX} dy="15" fill="#475569" fontSize="10" fontWeight="500">
                        {viewMode === 'standard' ? '(EXCL. 21 DAYS)' : '(OTHER)'}
                      </tspan>
                    </text>
                  ) : cat === 'ONGOING' ? (
                    <text
                      x={catCenterX}
                      y={paddingTop + chartHeight + 24}
                      textAnchor="middle"
                      fill="#1E293B"
                      fontSize="11"
                      fontWeight="700"
                    >
                      ONGOING
                    </text>
                  ) : cat === 'NYS' ? (
                    <text
                      x={catCenterX}
                      y={paddingTop + chartHeight + 20}
                      textAnchor="middle"
                      fill="#1E293B"
                      fontSize="11"
                      fontWeight="700"
                    >
                      <tspan x={catCenterX} dy="0">
                        NYS
                      </tspan>
                      <tspan x={catCenterX} dy="15" fill="#475569" fontSize="10" fontWeight="500">
                        (NOT YET STARTED)
                      </tspan>
                    </text>
                  ) : (
                    <text
                      x={catCenterX}
                      y={paddingTop + chartHeight + 24}
                      textAnchor="middle"
                      fill="#1E293B"
                      fontSize="11"
                      fontWeight="700"
                    >
                      {cat}
                    </text>
                  )}
                </g>
              </g>
            );
          })}
        </svg>

        {/* Interactive Floating Tooltip */}
        {hoveredBar && (
          <div
            className="absolute z-20 pointer-events-none transition-transform duration-100 ease-out"
            style={{
              left: `${(hoveredBar.svgX / svgWidth) * 100}%`,
              top: `${(hoveredBar.svgY / svgHeight) * 100}%`,
              transform: 'translate(-50%, -115%)',
            }}
          >
            <div className="bg-[#0F172A] text-white p-3 rounded-xl shadow-xl border border-slate-700 min-w-[210px] text-xs">
              <div className="flex items-center justify-between gap-2 pb-1.5 border-b border-slate-700">
                <div className="flex items-center gap-1.5">
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: hoveredBar.color }}
                  />
                  <span className="font-bold text-white tracking-wide">{hoveredBar.person}</span>
                </div>
                <span className="text-[10px] text-slate-400 font-mono">In-Charge</span>
              </div>

              <div className="mt-2 text-slate-300 font-medium">
                Category: <strong className="text-white font-bold">{hoveredBar.category}</strong>
              </div>

              <div className="mt-1 flex items-baseline justify-between gap-2">
                <span className="text-slate-400">Unit Count:</span>
                <span className="text-base font-extrabold font-mono text-emerald-400">
                  {hoveredBar.count.toLocaleString()}
                  <span className="text-xs text-slate-300 font-normal ml-1">units</span>
                </span>
              </div>

              <div className="mt-2 pt-2 border-t border-slate-800 space-y-1 text-[11px] text-slate-400">
                <div className="flex justify-between">
                  <span>Share of {hoveredBar.person}&apos;s units:</span>
                  <strong className="text-slate-200 font-mono">
                    {hoveredBar.totalPersonUnits > 0
                      ? ((hoveredBar.count / hoveredBar.totalPersonUnits) * 100).toFixed(1)
                      : '0.0'}
                    %
                  </strong>
                </div>
                <div className="flex justify-between">
                  <span>Share of all {hoveredBar.category}:</span>
                  <strong className="text-slate-200 font-mono">
                    {hoveredBar.categoryTotal > 0
                      ? ((hoveredBar.count / hoveredBar.categoryTotal) * 100).toFixed(1)
                      : '0.0'}
                    %
                  </strong>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer Summary Comparison Row */}
      <div className="mt-4 pt-3 border-t border-[#CBD5E1] grid grid-cols-2 sm:grid-cols-5 gap-2 sm:gap-3 text-center">
        {categories.map((cat) => {
          const catSum = categoryTotals[cat] || 0;
          return (
            <div key={`summary-${cat}`} className="p-2 bg-slate-50 rounded-lg border border-[#CBD5E1]">
              <div className="text-[10px] font-bold text-[#334155] uppercase tracking-wider truncate">
                {cat}
              </div>
              <div className="text-sm font-extrabold text-[#1E293B] font-mono mt-0.5">
                {catSum.toLocaleString()}
              </div>
              <div className="text-[10px] text-[#475569] font-medium">total units</div>
            </div>
          );
        })}
      </div>

      {/* Modal for Unmatched Statuses (If Any Ever Occur) */}
      {showUnmatchedModal && unmatchedDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-[#CBD5E1]">
            <div className="flex items-center justify-between pb-3 border-b border-[#CBD5E1]">
              <h4 className="text-base font-bold text-[#1E293B]">Unmatched Status Records</h4>
              <button
                onClick={() => setShowUnmatchedModal(false)}
                className="text-slate-400 hover:text-[#1E293B] text-lg font-bold"
              >
                ✕
              </button>
            </div>
            <div className="mt-4 max-h-72 overflow-y-auto space-y-2 text-xs">
              <p className="text-[#334155] font-semibold">
                The following {unmatchedCount} record(s) have non-standard status values that could
                not be mapped to the 5 categories:
              </p>
              <div className="divide-y divide-[#CBD5E1] border border-[#CBD5E1] rounded-lg">
                {unmatchedDetails.map((rec) => (
                  <div key={rec.id} className="p-2.5 flex justify-between gap-2">
                    <div>
                      <strong className="text-[#1E293B]">{rec.project}</strong>
                      <div className="text-[#475569]">In-Charge: {rec.incharge}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-mono text-red-600 font-semibold">
                        Unit Status: {rec.unitsStatus || '(empty)'}
                      </div>
                      <div className="text-slate-500 text-[11px]">
                        Folder Status: {rec.folderStatus || '(empty)'}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="mt-5 flex justify-end">
              <button
                onClick={() => setShowUnmatchedModal(false)}
                className="px-4 py-2 bg-[#2563EB] text-white rounded-lg font-semibold text-xs hover:bg-blue-700"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
