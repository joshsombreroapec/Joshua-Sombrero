import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Layers, RotateCw } from 'lucide-react';
import { CumulativeKpiMatrixData, FilterState } from '../lib/types';

interface CumulativeWeeklyKpiMatrixProps {
  filters: FilterState;
  onDrilldown?: (kpiRemark: string) => void;
}

export const CumulativeWeeklyKpiMatrix: React.FC<CumulativeWeeklyKpiMatrixProps> = ({
  filters,
  onDrilldown,
}) => {
  const [data, setData] = useState<CumulativeKpiMatrixData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Tooltip state
  const [hoveredCell, setHoveredCell] = useState<{
    kpi: string;
    weekLabel: string;
    cumulativeCount: number;
    status: 'LIVE' | 'FINAL';
    fullDate: string;
    x: number;
    y: number;
  } | null>(null);

  const tableContainerRef = useRef<HTMLDivElement>(null);

  const fetchMatrixData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (filters.area) params.set('area', filters.area);
      if (filters.project) params.set('project', filters.project);
      if (filters.incharge) params.set('incharge', filters.incharge);
      if (filters.folderStatus) params.set('folderStatus', filters.folderStatus);
      if (filters.unitsStatus) params.set('unitsStatus', filters.unitsStatus);
      if (filters.datePreset) params.set('datePreset', filters.datePreset);
      if (filters.startDate) params.set('startDate', filters.startDate);
      if (filters.endDate) params.set('endDate', filters.endDate);
      if (filters.search) params.set('search', filters.search);
      if (filters.priorityMoveIn) params.set('priorityMoveIn', filters.priorityMoveIn);
      if (filters.stage) params.set('stage', filters.stage);
      if (filters.pwgUpdates) params.set('pwgUpdates', filters.pwgUpdates);

      const res = await fetch(`/api/sheets/cumulative-kpi-matrix?${params.toString()}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}: Failed to fetch cumulative KPI matrix`);
      const json: CumulativeKpiMatrixData = await res.json();
      setData(json);
    } catch (err: any) {
      console.error('Cumulative matrix fetch failed:', err);
      setError(err.message || 'Failed to load cumulative weekly KPI matrix');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMatrixData();
  }, [
    filters.area,
    filters.project,
    filters.incharge,
    filters.folderStatus,
    filters.unitsStatus,
    filters.datePreset,
    filters.startDate,
    filters.endDate,
    filters.search,
    filters.priorityMoveIn,
    filters.stage,
    filters.pwgUpdates,
  ]);

  // Max value for cumulative heatmap shading
  const maxCumulativeCell = useMemo(() => {
    if (!data?.rows) return 1;
    let m = 1;
    data.rows.forEach((r) => {
      Object.values(r.cumulativeCounts).forEach((c) => {
        if (c > m) m = c;
      });
    });
    return m;
  }, [data]);

  // Cell heatmap color class for cumulative counts
  const getCellBgClass = (count: number, isLive: boolean) => {
    if (count === 0) {
      return isLive ? 'bg-emerald-50/20 text-slate-400' : 'text-slate-400';
    }
    const ratio = Math.min(1, count / Math.max(1, maxCumulativeCell));

    if (isLive) {
      if (ratio > 0.6) return 'bg-emerald-200/90 text-emerald-950 font-black border border-emerald-300';
      if (ratio > 0.3) return 'bg-emerald-100/90 text-emerald-900 font-bold';
      return 'bg-emerald-50 text-emerald-800 font-semibold';
    } else {
      if (ratio > 0.6) return 'bg-blue-200/90 text-blue-950 font-black border border-blue-300';
      if (ratio > 0.3) return 'bg-blue-100/90 text-blue-900 font-bold';
      return 'bg-slate-100/90 text-slate-800 font-semibold';
    }
  };

  return (
    <div className="space-y-4">
      {/* 1. SECTION CARD HEADER (Weeks, Export CSV, and Weekly Counts buttons removed; Cumulative View only) */}
      <div className="bg-white rounded-2xl p-6 border border-[#CBD5E1] shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <span className="p-2 rounded-xl bg-[#2563EB]/10 text-[#2563EB] border border-[#2563EB]/20">
              <Layers className="w-5 h-5" />
            </span>
            <h2 className="text-xl sm:text-2xl font-extrabold text-[#1E293B] tracking-tight">
              Main Dashboard: Cumulative Weekly KPI Matrix
            </h2>
            <span className="px-2.5 py-0.5 text-xs font-bold bg-[#2563EB] text-white rounded-md shadow-2xs">
              CUMULATIVE VIEW
            </span>
            <span className="px-2.5 py-0.5 text-xs font-bold bg-emerald-600 text-white rounded-md flex items-center gap-1.5 shadow-2xs">
              <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
              LIVE CURRENT WEEK
            </span>
            <span className="px-2 py-0.5 text-xs font-bold bg-slate-100 text-slate-700 border border-slate-300 rounded-md">
              Timezone: Asia/Manila (UTC+8)
            </span>
          </div>
          <p className="text-xs text-[#334155] font-semibold mt-1.5 flex items-center gap-2 flex-wrap">
            <span>Weekly Periods: Monday through Sunday</span>
            <span>•</span>
            <span className="text-[#475569]">
              Cumulative progressive running counts per KPI Remark across reporting periods. Click any KPI remark to drill down.
            </span>
          </p>
        </div>
      </div>

      {/* 2. CUMULATIVE MATRIX TABLE */}
      <div className="bg-white rounded-xl sm:rounded-2xl border border-[#CBD5E1] shadow-xs overflow-hidden">
        {isLoading && !data ? (
          <div className="p-8 sm:p-12 text-center text-[#334155] font-semibold">
            <RotateCw className="w-8 h-8 mx-auto text-[#2563EB] animate-spin mb-3" />
            <p>Loading Cumulative Weekly KPI Matrix from Google Sheets...</p>
          </div>
        ) : error ? (
          <div className="p-6 sm:p-8 text-center text-rose-600 font-semibold bg-rose-50/50">
            <p>Failed to load matrix: {error}</p>
          </div>
        ) : !data || data.weeks.length === 0 || data.rows.length === 0 ? (
          <div className="p-6 sm:p-8 text-center text-slate-500 font-semibold">
            No KPI records match the active Management Report filter criteria.
          </div>
        ) : (
          <div
            ref={tableContainerRef}
            className="overflow-x-auto max-w-full relative touch-pan-x"
          >
            {/* Mobile swipe helper indicator */}
            <div className="md:hidden px-3 py-1.5 bg-blue-50 border-b border-blue-200 text-blue-800 text-[10px] font-bold flex items-center justify-between">
              <span>← Swipe horizontally to browse reporting weeks →</span>
              <span className="font-mono">{data.weeks.length} Weeks</span>
            </div>

            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-[#1E293B] text-white border-b border-[#CBD5E1]">
                  {/* Sticky KPI Remarks Column Header */}
                  <th className="sticky left-0 z-20 bg-[#1E293B] px-3 sm:px-4 py-2.5 sm:py-3.5 font-extrabold uppercase tracking-wide min-w-[160px] sm:min-w-[260px] max-w-[200px] sm:max-w-[300px] shadow-sm">
                    KPI Remarks ({data.rows.length})
                  </th>

                  {/* Weekly Columns (Monday to Sunday) */}
                  {data.weeks.map((week) => (
                    <th
                      key={week.weekKey}
                      className={`px-2 sm:px-3 py-2 sm:py-3 text-center font-bold tracking-tight min-w-[85px] sm:min-w-[110px] border-l border-white/10 ${
                        week.isLive ? 'bg-emerald-950/90 text-emerald-200' : ''
                      }`}
                    >
                      <div className="flex flex-col items-center">
                        <span className="font-extrabold text-[11px] sm:text-xs whitespace-nowrap">{week.label}</span>
                        <div className="mt-0.5 sm:mt-1 flex items-center gap-1">
                          {week.isLive ? (
                            <span className="px-1.5 py-0.2 rounded bg-emerald-500 text-white font-mono text-[8px] sm:text-[9px] font-black uppercase tracking-wider animate-pulse">
                              LIVE
                            </span>
                          ) : (
                            <span className="px-1.5 py-0.2 rounded bg-white/10 text-slate-300 font-mono text-[8px] sm:text-[9px] font-semibold uppercase">
                              FINAL
                            </span>
                          )}
                        </div>
                      </div>
                    </th>
                  ))}

                  {/* Sticky Rightmost Column: Cumulative Total */}
                  <th className="sticky right-0 z-20 bg-[#0F172A] px-2.5 sm:px-4 py-2.5 sm:py-3.5 text-center font-extrabold uppercase tracking-wide min-w-[95px] sm:min-w-[125px] border-l border-white/20 text-amber-300 shadow-sm">
                    Cumulative Total
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-[#CBD5E1]">
                {data.rows.map((row, rIdx) => {
                  const isEven = rIdx % 2 === 0;
                  return (
                    <tr
                      key={row.kpiRemark}
                      className={`hover:bg-blue-50/40 transition-colors ${
                        isEven ? 'bg-white' : 'bg-slate-50/60'
                      }`}
                    >
                      {/* Sticky KPI Remark Name Cell - Interactive Drilldown */}
                      <td
                        onClick={() => onDrilldown?.(row.kpiRemark)}
                        className={`sticky left-0 z-10 px-3 sm:px-4 py-2 sm:py-3 font-bold text-[#1E293B] border-r border-[#CBD5E1] shadow-2xs truncate max-w-[160px] sm:max-w-[280px] ${
                          onDrilldown ? 'cursor-pointer hover:text-[#2563EB] group' : ''
                        } ${isEven ? 'bg-white' : 'bg-slate-50'}`}
                        title={`${row.kpiRemark} (Click to drill down)`}
                      >
                        <span className="truncate block group-hover:underline">{row.kpiRemark}</span>
                      </td>

                      {/* Cumulative Weekly Period Values */}
                      {data.weeks.map((week) => {
                        const cumulativeCount = row.cumulativeCounts[week.weekKey] || 0;
                        const bgStyle = getCellBgClass(cumulativeCount, week.isLive);

                        return (
                          <td
                            key={week.weekKey}
                            onClick={() => onDrilldown?.(row.kpiRemark)}
                            className={`px-2 py-2 text-center font-mono border-r border-[#CBD5E1]/60 transition-colors ${
                              onDrilldown ? 'cursor-pointer' : 'cursor-default'
                            } ${bgStyle}`}
                            onMouseEnter={(e) => {
                              const rect = e.currentTarget.getBoundingClientRect();
                              setHoveredCell({
                                kpi: row.kpiRemark,
                                weekLabel: week.label,
                                cumulativeCount,
                                status: week.status,
                                fullDate: week.fullLabel,
                                x: rect.left + rect.width / 2,
                                y: rect.top - 8,
                              });
                            }}
                            onMouseLeave={() => setHoveredCell(null)}
                          >
                            <span className="block font-bold">
                              {cumulativeCount > 0 ? cumulativeCount.toLocaleString() : '—'}
                            </span>
                          </td>
                        );
                      })}

                      {/* Sticky Rightmost: Cumulative Total Cell */}
                      <td
                        onClick={() => onDrilldown?.(row.kpiRemark)}
                        className={`sticky right-0 z-10 px-3 py-3 text-center font-mono font-black text-[#1E293B] bg-slate-100 border-l border-[#CBD5E1] shadow-2xs ${
                          onDrilldown ? 'cursor-pointer hover:bg-blue-100 hover:text-[#2563EB]' : ''
                        }`}
                      >
                        <span className="text-sm font-extrabold text-[#1E293B]">
                          {row.cumulativeTotal.toLocaleString()}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>

              {/* GRAND TOTAL FOOTER ROW */}
              <tfoot>
                <tr className="bg-[#1E293B] text-white border-t-2 border-[#1E293B]">
                  <td className="sticky left-0 z-20 bg-[#1E293B] px-4 py-3.5 font-black uppercase tracking-wider text-amber-300 shadow-sm">
                    Grand Total
                  </td>

                  {data.weeks.map((week) => {
                    const cumulativeSum = data.grandTotals.cumulativeCounts[week.weekKey] || 0;

                    return (
                      <td
                        key={week.weekKey}
                        className={`px-3 py-3.5 text-center font-mono font-black border-r border-white/10 ${
                          week.isLive ? 'bg-emerald-950 text-emerald-300' : 'text-white'
                        }`}
                      >
                        <span className="text-xs block">
                          {cumulativeSum.toLocaleString()}
                        </span>
                      </td>
                    );
                  })}

                  {/* Bottom-Right Overall Cumulative Grand Total */}
                  <td className="sticky right-0 z-20 bg-[#0F172A] px-4 py-3.5 text-center font-mono font-black text-amber-300 text-sm border-l border-white/20 shadow-sm">
                    {data.grandTotals.cumulativeGrandTotal.toLocaleString()}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {/* Floating Hover Tooltip */}
      {hoveredCell && (
        <div
          className="fixed pointer-events-none z-50 transform -translate-x-1/2 -translate-y-full bg-[#0F172A] text-white px-3 py-2 rounded-lg shadow-xl border border-slate-700 text-xs animate-in fade-in zoom-in-95 duration-100"
          style={{ left: `${hoveredCell.x}px`, top: `${hoveredCell.y}px` }}
        >
          <div className="font-bold text-amber-300 truncate max-w-[200px]">
            {hoveredCell.kpi}
          </div>
          <div className="text-[11px] text-slate-300 mt-0.5">
            {hoveredCell.fullDate} ({hoveredCell.status})
          </div>
          <div className="mt-1 pt-1 border-t border-slate-700 font-mono text-emerald-400 font-extrabold flex items-center justify-between gap-3">
            <span>Cumulative Total:</span>
            <span>{hoveredCell.cumulativeCount.toLocaleString()} units</span>
          </div>
        </div>
      )}
    </div>
  );
};
