import React, { useState } from 'react';
import { MonthlyTrendItem } from '../../lib/types';

interface MonthlyFlowChartProps {
  data: MonthlyTrendItem[];
  title?: string;
  onPointClick?: (item: MonthlyTrendItem, metric: 'energized' | 'takenOut' | 'within21Days') => void;
}

export const MonthlyFlowChart: React.FC<MonthlyFlowChartProps> = ({
  data,
  title = 'Monthly Energization & Takeout Pipeline Trends',
  onPointClick,
}) => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  if (!data || data.length === 0) {
    return (
      <div className="p-8 text-center text-xs font-semibold text-[#334155]">
        No monthly timeline data available for the selected filters.
      </div>
    );
  }

  const width = 800;
  const height = 250;
  const paddingLeft = 52;
  const paddingRight = 24;
  const paddingTop = 28;
  const paddingBottom = 44;

  const chartWidth = width - paddingLeft - paddingRight;
  const chartHeight = height - paddingTop - paddingBottom;

  const maxVal = Math.max(
    10,
    ...data.map((d) => Math.max(d.takenOut, d.energized, d.within21Days))
  );

  const getY = (val: number) => {
    return paddingTop + chartHeight - (val / maxVal) * chartHeight;
  };

  const getX = (idx: number) => {
    if (data.length === 1) return paddingLeft + chartWidth / 2;
    return paddingLeft + (idx / (data.length - 1)) * chartWidth;
  };

  const ptsEnergized = data.map((d, i) => ({ x: getX(i), y: getY(d.energized) }));
  const ptsTakenOut = data.map((d, i) => ({ x: getX(i), y: getY(d.takenOut) }));
  const ptsWithin21 = data.map((d, i) => ({ x: getX(i), y: getY(d.within21Days) }));

  const getCurvedPath = (pts: { x: number; y: number }[]) => {
    if (pts.length <= 1) return '';
    let path = `M ${pts[0].x} ${pts[0].y}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = i > 0 ? pts[i - 1] : pts[i];
      const p1 = pts[i];
      const p2 = pts[i + 1];
      const p3 = i < pts.length - 2 ? pts[i + 2] : p2;
      const cp1x = p1.x + (p2.x - p0.x) / 6;
      const cp1y = p1.y + (p2.y - p0.y) / 6;
      const cp2x = p2.x - (p3.x - p1.x) / 6;
      const cp2y = p2.y - (p3.y - p1.y) / 6;
      path += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
    }
    return path;
  };

  const pathEnergized = getCurvedPath(ptsEnergized);
  const pathTakenOut = getCurvedPath(ptsTakenOut);
  const pathWithin21 = getCurvedPath(ptsWithin21);

  // Calculate mid-segment directional workflow arrows
  const getSegmentArrows = (pts: { x: number; y: number }[]) => {
    const arrows: { x: number; y: number; angle: number }[] = [];
    for (let i = 0; i < pts.length - 1; i++) {
      const p1 = pts[i];
      const p2 = pts[i + 1];
      const midX = (p1.x + p2.x) / 2;
      const midY = (p1.y + p2.y) / 2;
      const angle = (Math.atan2(p2.y - p1.y, p2.x - p1.x) * 180) / Math.PI;
      arrows.push({ x: midX, y: midY, angle });
    }
    return arrows;
  };

  const arrowsEnergized = getSegmentArrows(ptsEnergized);
  const arrowsTakenOut = getSegmentArrows(ptsTakenOut);
  const arrowsWithin21 = getSegmentArrows(ptsWithin21);

  // Generate 5 horizontal guide lines with strong contrast
  const gridLines = [0, 0.25, 0.5, 0.75, 1].map((pct) => {
    const val = Math.round(maxVal * pct);
    const y = paddingTop + chartHeight - pct * chartHeight;
    return { val, y };
  });

  const activeItem = hoveredIndex !== null ? data[hoveredIndex] : null;

  return (
    <div className="relative">
      {/* Header and Legend */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div>
          <h3 className="text-base sm:text-lg font-bold text-[#1E293B] tracking-tight">
            {title}
          </h3>
          <p className="text-xs text-[#334155] font-semibold mt-0.5">
            Click any point along the timeline to break down data
          </p>
        </div>
        <div className="flex items-center gap-4 text-xs font-bold">
          {/* Taken Out: Blue */}
          <div className="flex items-center gap-2 px-2.5 py-1 rounded-md bg-blue-100 text-[#2563EB] border border-blue-300">
            <span className="w-4 h-1 bg-[#2563EB] rounded-full inline-block"></span>
            <span className="font-extrabold">Taken Out</span>
          </div>
          {/* Energized: Green */}
          <div className="flex items-center gap-2 px-2.5 py-1 rounded-md bg-emerald-100 text-emerald-800 border border-emerald-300">
            <span className="w-4 h-1 bg-[#059669] rounded-full inline-block"></span>
            <span className="font-extrabold">Energized</span>
          </div>
          {/* ENERGIZED- 1.WITHIN 21 DAYS: Sky Blue */}
          <div className="flex items-center gap-2 px-2.5 py-1 rounded-md bg-sky-100 text-sky-800 border border-sky-300">
            <span className="w-4 h-1 bg-[#0284c7] rounded-full inline-block"></span>
            <span className="font-extrabold">ENERGIZED- 1.WITHIN 21 DAYS</span>
          </div>
        </div>
      </div>

      {/* SVG Chart Area */}
      <div className="w-full overflow-hidden">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-auto overflow-visible select-none"
          preserveAspectRatio="none"
        >
          <defs>
            {/* SVG Markers for terminal flow direction */}
            <marker
              id="flow-arrow-takenout"
              viewBox="0 0 10 10"
              refX="8"
              refY="5"
              markerWidth="7"
              markerHeight="7"
              orient="auto-start-reverse"
            >
              <path d="M 0 1 L 9 5 L 0 9 z" fill="#2563EB" />
            </marker>
            <marker
              id="flow-arrow-energized"
              viewBox="0 0 10 10"
              refX="8"
              refY="5"
              markerWidth="8"
              markerHeight="8"
              orient="auto-start-reverse"
            >
              <path d="M 0 1 L 9 5 L 0 9 z" fill="#059669" />
            </marker>
            <marker
              id="flow-arrow-within21"
              viewBox="0 0 10 10"
              refX="8"
              refY="5"
              markerWidth="7"
              markerHeight="7"
              orient="auto-start-reverse"
            >
              <path d="M 0 1 L 9 5 L 0 9 z" fill="#0284c7" />
            </marker>
          </defs>

          {/* High-Contrast Horizontal Grid lines and Y-axis labels */}
          {gridLines.map((line, idx) => (
            <g key={idx}>
              <line
                x1={paddingLeft}
                y1={line.y}
                x2={width - paddingRight}
                y2={line.y}
                stroke="#CBD5E1"
                strokeWidth="1.5"
                strokeDasharray={idx === 0 ? undefined : '3 3'}
              />
              <text
                x={paddingLeft - 10}
                y={line.y + 4}
                textAnchor="end"
                className="text-[12px] font-mono font-semibold fill-[#334155]"
              >
                {line.val.toLocaleString()}
              </text>
            </g>
          ))}

          {/* 1. Connector Line: Taken Out - Blue */}
          <path
            d={pathTakenOut}
            fill="none"
            stroke="#2563EB"
            strokeWidth="3.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            markerEnd="url(#flow-arrow-takenout)"
          />

          {/* Taken Out Directional Workflow Arrows along the line */}
          {arrowsTakenOut.map((arr, i) => (
            <g
              key={`arr-to-${i}`}
              transform={`translate(${arr.x}, ${arr.y}) rotate(${arr.angle})`}
            >
              <polygon
                points="-5,-4 3,0 -5,4"
                fill="#2563EB"
                stroke="#ffffff"
                strokeWidth="1.2"
              />
            </g>
          ))}

          {/* 2. Connector Line: Within 21 Days - High Contrast Sky Blue */}
          <path
            d={pathWithin21}
            fill="none"
            stroke="#0284c7"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray="6 3"
            markerEnd="url(#flow-arrow-within21)"
          />

          {/* Within 21 Days Directional Workflow Arrows along the line */}
          {arrowsWithin21.map((arr, i) => (
            <g
              key={`arr-w21-${i}`}
              transform={`translate(${arr.x}, ${arr.y}) rotate(${arr.angle})`}
            >
              <polygon
                points="-5,-3.5 3,0 -5,3.5"
                fill="#0284c7"
                stroke="#ffffff"
                strokeWidth="1.2"
              />
            </g>
          ))}

          {/* 3. Connector Line: Energized - Green */}
          <path
            d={pathEnergized}
            fill="none"
            stroke="#059669"
            strokeWidth="4"
            strokeLinecap="round"
            strokeLinejoin="round"
            markerEnd="url(#flow-arrow-energized)"
          />

          {/* Energized Directional Workflow Arrows along the line */}
          {arrowsEnergized.map((arr, i) => (
            <g
              key={`arr-eng-${i}`}
              transform={`translate(${arr.x}, ${arr.y}) rotate(${arr.angle})`}
            >
              <polygon
                points="-6,-4.5 4,0 -6,4.5"
                fill="#059669"
                stroke="#ffffff"
                strokeWidth="1.5"
              />
            </g>
          ))}

          {/* Flowchart Nodes (Data Points) & Interactive Hover Columns */}
          {data.map((d, idx) => {
            const x = getX(idx);
            const isHovered = hoveredIndex === idx;

            return (
              <g key={idx} className="cursor-pointer">
                {/* Invisible hover trigger column */}
                <rect
                  x={x - chartWidth / data.length / 2}
                  y={paddingTop}
                  width={chartWidth / data.length}
                  height={chartHeight}
                  fill="transparent"
                  onMouseEnter={() => setHoveredIndex(idx)}
                  onMouseLeave={() => setHoveredIndex(null)}
                  onClick={() => onPointClick && onPointClick(d, 'energized')}
                />

                {/* Vertical hover indicator bar with high contrast */}
                {isHovered && (
                  <line
                    x1={x}
                    y1={paddingTop}
                    x2={x}
                    y2={paddingTop + chartHeight}
                    stroke="#2563EB"
                    strokeWidth="2"
                    strokeDasharray="3 3"
                  />
                )}

                {/* Flowchart Node 1: Taken Out (Blue) */}
                <circle
                  cx={x}
                  cy={getY(d.takenOut)}
                  r={isHovered ? 7 : 5}
                  fill="#2563EB"
                  stroke="#ffffff"
                  strokeWidth="2.5"
                  className="transition-all duration-150 drop-shadow-sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    onPointClick && onPointClick(d, 'takenOut');
                  }}
                />

                {/* Flowchart Node 2: Within 21 Days (Cyan/Sky Blue) */}
                <circle
                  cx={x}
                  cy={getY(d.within21Days)}
                  r={isHovered ? 7 : 5}
                  fill="#0284c7"
                  stroke="#ffffff"
                  strokeWidth="2.5"
                  className="transition-all duration-150 drop-shadow-sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    onPointClick && onPointClick(d, 'within21Days');
                  }}
                />

                {/* Flowchart Node 3: Energized (Green - Largest Node) */}
                <circle
                  cx={x}
                  cy={getY(d.energized)}
                  r={isHovered ? 8.5 : 6}
                  fill="#059669"
                  stroke="#ffffff"
                  strokeWidth="3"
                  className="transition-all duration-150 drop-shadow-md"
                  onClick={(e) => {
                    e.stopPropagation();
                    onPointClick && onPointClick(d, 'energized');
                  }}
                />

                {/* X-axis labels with high contrast text */}
                <text
                  x={x}
                  y={height - 12}
                  textAnchor="middle"
                  className={`text-[12px] transition-colors ${
                    isHovered
                      ? 'fill-[#2563EB] font-extrabold text-[13px]'
                      : 'fill-[#1E293B] font-bold'
                  }`}
                >
                  {d.label}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Hover Floating Tooltip with high contrast and readable text */}
      {activeItem && hoveredIndex !== null && (
        <div
          className="absolute z-20 pointer-events-none p-3.5 rounded-xl bg-[#1E293B] text-white text-xs shadow-2xl border border-[#CBD5E1] space-y-2 transition-all"
          style={{
            left: `${Math.min(80, Math.max(12, ((hoveredIndex + 0.5) / data.length) * 100))}%`,
            top: '20px',
            transform: 'translateX(-50%)',
          }}
        >
          <div className="flex items-center justify-between gap-4 border-b border-slate-700 pb-2">
            <p className="font-extrabold text-white text-sm">{activeItem.label}</p>
            <span className="text-[11px] text-blue-300 font-bold bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
              Click to drill down
            </span>
          </div>
          <div className="flex items-center justify-between gap-6">
            <span className="text-slate-300 font-semibold">Energized:</span>
            <span className="font-mono font-extrabold text-emerald-400 text-sm">
              {activeItem.energized.toLocaleString()}
            </span>
          </div>
          <div className="flex items-center justify-between gap-6">
            <span className="text-slate-300 font-semibold">Taken Out:</span>
            <span className="font-mono font-bold text-blue-300 text-sm">
              {activeItem.takenOut.toLocaleString()}
            </span>
          </div>
          <div className="flex items-center justify-between gap-6">
            <span className="text-slate-300 font-semibold">ENERGIZED- 1.WITHIN 21 DAYS:</span>
            <span className="font-mono font-bold text-sky-300 text-sm">
              {activeItem.within21Days.toLocaleString()}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

