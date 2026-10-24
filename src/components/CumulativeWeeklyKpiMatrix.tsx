import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Layers,
  ChevronLeft,
  ChevronRight,
  Info,
  Download,
  RotateCw,
} from 'lucide-react';
import { CumulativeKpiMatrixData, FilterState } from '../lib/types';

interface CumulativeWeeklyKpiMatrixProps {
  filters: FilterState;
}

export const CumulativeWeeklyKpiMatrix: React.FC<CumulativeWeeklyKpiMatrixProps> = ({
  filters,
}) => {
  const [data, setData] = useState<CumulativeKpiMatrixData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Display mode: 'weekly' (Cell shows weekly count, right column shows Cumulative Total)
  // or 'cumulative' (Cell shows cumulative progressive running total up to that week)
  const [displayMode, setDisplayMode] = useState<'weekly' | 'cumulative'>('weekly');

  // Tooltip state
  const [hoveredCell, setHoveredCell] = useState<{
    kpi: string;
    weekLabel: string;
    weeklyCount: number;
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

  // Max values for heatmap shading
  const maxWeeklyCell = useMemo(() => {
    if (!data?.rows) return 1;
    let m = 1;
    data.rows.forEach((r) => {
      Object.values(r.weeklyCounts).forEach((c) => {
        if (c > m) m = c;
      });
    });
    return m;
  }, [data]);

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

  // Cell heatmap color class
  const getCellBgClass = (count: number, isLive: boolean, mode: 'weekly' | 'cumulative') => {
    if (count === 0) {
      return isLive ? 'bg-emerald-50/20 text-slate-400' : 'text-slate-400';
    }
    const maxVal = mode === 'weekly' ? maxWeeklyCell : maxCumulativeCell;
    const ratio = Math.min(1, count / Math.max(1, maxVal));

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

  const handleScroll = (direction: 'left' | 'right') => {
    if (tableContainerRef.current) {
      const amount = direction === 'left' ? -350 : 350;
      tableContainerRef.current.scrollBy({ left: amount, behavior: 'smooth' });
    }
  };

  // Export Matrix to CSV
  const handleExportCSV = () => {
    if (!data) return;

    const weeks = data.weeks;
    const headers = [
      'KPI Remarks',
      ...weeks.map((w) => `"${w.label} (${w.status})"`),
      'Cumulative Total',
    ];

    const rows: string[][] = [];
    data.rows.forEach((row) => {
      const counts = weeks.map((w) =>
        String(displayMode === 'weekly' ? row.weeklyCounts[w.weekKey] || 0 : row.cumulativeCounts[w.weekKey] || 0)
      );
      rows.push([`"${row.kpiRemark.replace(/"/g, '""')}"`, ...counts, String(row.cumulativeTotal)]);
    });

    // Grand Total Row
    const grandTotals = weeks.map((w) =>
      String(
        displayMode === 'weekly'
          ? data.grandTotals.weeklyCounts[w.weekKey] || 0
          : data.grandTotals.cumulativeCounts[w.weekKey] || 0
      )
    );
    rows.push(['"Grand Total"', ...grandTotals, String(data.grandTotals.cumulativeGrandTotal)]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [
        ['PWG Management Report - Cumulative Weekly KPI Matrix'],
        [`Reporting Timezone: Asia/Manila (UTC+8) | Monday–Sunday Week Cycles`],
        [`View Mode: ${displayMode === 'weekly' ? 'Weekly Interval Counts' : 'Cumulative Progressive Total'}`],
        [`Exported: ${new Date().toLocaleString('en-US', { timeZone: 'Asia/Manila' })} (Asia/Manila)`],
        [''],
        headers,
        ...rows,
      ]
        .map((e) => e.join(','))
        .join('\r\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `Cumulative_Weekly_KPI_Matrix_${new Date().toISOString().split('T')[0]}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-4">
      {/* 1. SECTION CARD HEADER */}
      <div className="bg-white rounded-2xl p-6 border border-[#CBD5E1] shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <span className="p-2 rounded-xl bg-[#2563EB]/10 text-[#2563EB] border border-[#2563EB]/20">
              <Layers className="w-5 h-5" />
            </span>
            <h2 className="text-xl sm:text-2xl font-extrabold text-[#1E293B] tracking-tight">
              Main Dashboard: Cumulative Weekly KPI Matrix
            </h2>
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
              Responds to active Management Report filters. Closed weeks are frozen as <strong className="text-slate-800">FINAL</strong>.
            </span>
          </p>
        </div>

        {/* Action Controls & Navigation */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Scroll Weeks Controls */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-[#CBD5E1]">
            <span className="text-[11px] font-bold text-slate-600 px-1.5">Weeks:</span>
            <button
              onClick={() => handleScroll('left')}
              className="p-1.5 rounded-lg bg-white hover:bg-slate-200 transition-colors cursor-pointer text-[#1E293B] shadow-2xs"
              title="Scroll Left"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => handleScroll('right')}
              className="p-1.5 rounded-lg bg-white hover:bg-slate-200 transition-colors cursor-pointer text-[#1E293B] shadow-2xs"
              title="Scroll Right"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Mode toggle */}
          <div className="bg-slate-100 p-1 rounded-xl border border-[#CBD5E1] flex items-center gap-1 text-xs font-bold">
            <button
              onClick={() => setDisplayMode('weekly')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                displayMode === 'weekly'
                  ? 'bg-white text-[#1E293B] shadow-2xs font-extrabold'
                  : 'text-slate-600 hover:text-[#1E293B]'
              }`}
            >
              Weekly Counts
            </button>
            <button
              onClick={() => setDisplayMode('cumulative')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                displayMode === 'cumulative'
                  ? 'bg-white text-[#2563EB] shadow-2xs font-extrabold'
                  : 'text-slate-600 hover:text-[#1E293B]'
              }`}
            >
              Cumulative View
            </button>
          </div>

          <button
            onClick={handleExportCSV}
            disabled={!data}
            className="flex items-center gap-2 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-[#1E293B] border border-[#CBD5E1] rounded-xl text-xs font-bold transition-all shadow-2xs hover:shadow-xs cursor-pointer disabled:opacity-50"
          >
            <Download className="w-4 h-4 text-[#2563EB]" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* 2. CUMULATIVE MATRIX TABLE */}
      <div className="bg-white rounded-2xl border border-[#CBD5E1] shadow-xs overflow-hidden">
        {isLoading && !data ? (
          <div className="p-12 text-center text-[#334155] font-semibold">
            <RotateCw className="w-8 h-8 mx-auto text-[#2563EB] animate-spin mb-3" />
            <p>Loading Cumulative Weekly KPI Matrix from Google Sheets...</p>
          </div>
        ) : error ? (
          <div className="p-8 text-center text-rose-600 font-semibold bg-rose-50/50">
            <p>Failed to load matrix: {error}</p>
          </div>
        ) : !data || data.weeks.length === 0 || data.rows.length === 0 ? (
          <div className="p-8 text-center text-slate-500 font-semibold">
            No KPI records match the active Management Report filter criteria.
          </div>
        ) : (
          <div
            ref={tableContainerRef}
            className="overflow-x-auto max-w-full relative"
          >
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-[#1E293B] text-white border-b border-[#CBD5E1]">
                  {/* Sticky KPI Remarks Column Header */}
                  <th className="sticky left-0 z-20 bg-[#1E293B] px-4 py-3.5 font-extrabold uppercase tracking-wide min-w-[260px] shadow-sm">
                    KPI Remarks ({data.rows.length})
                  </th>

                  {/* Weekly Columns (Monday to Sunday) */}
                  {data.weeks.map((week) => (
                    <th
                      key={week.weekKey}
                      className={`px-3 py-3 text-center font-bold tracking-tight min-w-[110px] border-l border-white/10 ${
                        week.isLive ? 'bg-emerald-950/90 text-emerald-200' : ''
                      }`}
                    >
                      <div className="flex flex-col items-center">
                        <span className="font-extrabold text-xs">{week.label}</span>
                        <div className="mt-1 flex items-center gap-1">
                          {week.isLive ? (
                            <span className="px-1.5 py-0.2 rounded bg-emerald-500 text-white font-mono text-[9px] font-black uppercase tracking-wider animate-pulse">
                              LIVE
                            </span>
                          ) : (
                            <span className="px-1.5 py-0.2 rounded bg-white/10 text-slate-300 font-mono text-[9px] font-semibold uppercase">
                              FINAL
                            </span>
                          )}
                        </div>
                      </div>
                    </th>
                  ))}

                  {/* Sticky Rightmost Column: Cumulative Total */}
                  <th className="sticky right-0 z-20 bg-[#0F172A] px-4 py-3.5 text-center font-extrabold uppercase tracking-wide min-w-[125px] border-l border-white/20 text-amber-300 shadow-sm">
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
                      {/* Sticky KPI Remark Name Cell */}
                      <td
                        className={`sticky left-0 z-10 px-4 py-3 font-bold text-[#1E293B] border-r border-[#CBD5E1] shadow-2xs truncate max-w-[280px] ${
                          isEven ? 'bg-white' : 'bg-slate-50'
                        }`}
                        title={row.kpiRemark}
                      >
                        <span className="truncate block">{row.kpiRemark}</span>
                      </td>

                      {/* Weekly Period Values */}
                      {data.weeks.map((week) => {
                        const weeklyCount = row.weeklyCounts[week.weekKey] || 0;
                        const cumulativeCount = row.cumulativeCounts[week.weekKey] || 0;
                        const displayedValue =
                          displayMode === 'weekly' ? weeklyCount : cumulativeCount;

                        const bgStyle = getCellBgClass(
                          displayedValue,
                          week.isLive,
                          displayMode
                        );

                        return (
                          <td
                            key={week.weekKey}
                            className={`px-2 py-2 text-center font-mono border-r border-[#CBD5E1]/60 transition-colors cursor-default ${bgStyle}`}
                            onMouseEnter={(e) => {
                              const rect = e.currentTarget.getBoundingClientRect();
                              setHoveredCell({
                                kpi: row.kpiRemark,
                                weekLabel: week.label,
                                weeklyCount,
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
                              {displayedValue > 0 ? displayedValue.toLocaleString() : '—'}
                            </span>
                            {/* In weekly mode, display subtle running cumulative subtotal if positive */}
                            {displayMode === 'weekly' && cumulativeCount > 0 && (
                              <span className="text-[9px] text-[#475569] font-mono block opacity-75">
                                ∑ {cumulativeCount.toLocaleString()}
                              </span>
                            )}
                          </td>
                        );
                      })}

                      {/* Sticky Rightmost: Cumulative Total Cell */}
                      <td className="sticky right-0 z-10 px-3 py-3 text-center font-mono font-black text-[#1E293B] bg-slate-100 border-l border-[#CBD5E1] shadow-2xs">
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
                    const weeklySum = data.grandTotals.weeklyCounts[week.weekKey] || 0;
                    const cumulativeSum = data.grandTotals.cumulativeCounts[week.weekKey] || 0;
                    const displayedGrandTotal =
                      displayMode === 'weekly' ? weeklySum : cumulativeSum;

                    return (
                      <td
                        key={week.weekKey}
                        className={`px-3 py-3.5 text-center font-mono font-black border-r border-white/10 ${
                          week.isLive ? 'bg-emerald-950 text-emerald-300' : 'text-white'
                        }`}
                      >
                        <span className="text-xs block">
                          {displayedGrandTotal.toLocaleString()}
                        </span>
                        {displayMode === 'weekly' && cumulativeSum > 0 && (
                          <span className="text-[9px] text-amber-200/80 font-mono block font-normal">
                            ∑ {cumulativeSum.toLocaleString()}
                          </span>
                        )}
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

      {/* Floating Hover Tooltip for Matrix Cells */}
      {hoveredCell && (
        <div
          style={{
            left: `${hoveredCell.x}px`,
            top: `${hoveredCell.y}px`,
            transform: 'translate(-50%, -100%)',
          }}
          className="fixed z-50 bg-[#0F172A] text-white px-3.5 py-2.5 rounded-xl shadow-2xl text-xs border border-slate-700 pointer-events-none whitespace-nowrap min-w-[200px]"
        >
          <div className="font-bold text-white mb-1 border-b border-slate-800 pb-1">
            {hoveredCell.kpi}
          </div>
          <div className="text-slate-300 flex items-center justify-between gap-3 text-[11px]">
            <span>Week Period:</span>
            <strong className="text-slate-100 font-mono">{hoveredCell.fullDate}</strong>
          </div>
          <div className="flex items-center justify-between gap-3 mt-1.5 pt-1 border-t border-slate-800 text-[11px]">
            <span className="text-slate-400">Weekly Count:</span>
            <span className="font-mono font-bold text-white">
              {hoveredCell.weeklyCount.toLocaleString()}
            </span>
          </div>
          <div className="flex items-center justify-between gap-3 text-[11px]">
            <span className="text-slate-400">Cumulative to Date:</span>
            <span className="font-mono font-black text-amber-300">
              {hoveredCell.cumulativeCount.toLocaleString()}
            </span>
          </div>
          <div className="text-[10px] text-right mt-1 pt-1 border-t border-slate-800/60 font-mono">
            {hoveredCell.status === 'LIVE' ? (
              <span className="text-emerald-400 font-bold">● LIVE (Google Sheets sync)</span>
            ) : (
              <span className="text-slate-400">🔒 FINAL (Frozen snapshot)</span>
            )}
          </div>
        </div>
      )}

      {/* 3. EXPLANATORY FOOTNOTE */}
      <div className="bg-slate-50 rounded-2xl p-4 border border-[#CBD5E1] text-xs text-[#334155] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Info className="w-4 h-4 text-[#2563EB] shrink-0" />
          <span>
            <strong>Cumulative Snapshot Rule:</strong> Closed weeks remain frozen in persistent storage (<code>weekly_snapshots.json</code>). When a new week begins, it builds cumulatively upon the previous week's frozen totals and incorporates live updates from Google Sheets.
          </span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-mono text-[10px] font-bold">
            {data?.weeks.filter((w) => w.status === 'FINAL').length || 0} WEEKS FROZEN AS FINAL
          </span>
        </div>
      </div>
    </div>
  );
};
