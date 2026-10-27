import React, { useState } from 'react';
import {
  Filter,
  RotateCcw,
  Calendar,
  Zap,
  Clock,
  FolderCheck,
  Flame,
  Layers,
  Download,
  RotateCw,
  Database,
  AlertCircle,
  TrendingUp,
} from 'lucide-react';
import { AnalyticsData, DrilldownData, DrilldownTarget, FilterState, SheetRecord } from '../lib/types';
import { fetchDrilldown, exportFilteredCSV } from '../lib/api';
import { MonthlyFlowChart } from './charts/MonthlyFlowChart';
import { HorizontalBarChart } from './charts/HorizontalBarChart';
import { VerticalBarChart } from './charts/VerticalBarChart';
import { DonutPieChart } from './charts/DonutPieChart';
import { InchargeStatusBarChart } from './charts/InchargeStatusBarChart';
import { DashboardDrilldownModal } from './DashboardDrilldownModal';

interface DashboardViewProps {
  analytics: AnalyticsData | null;
  filters: FilterState;
  isLoading: boolean;
  onFilterChange: (updates: Partial<FilterState>) => void;
  onResetFilters: () => void;
  onNavigateToDirectory: () => void;
  onSelectRecord?: (record: SheetRecord) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  analytics,
  filters,
  isLoading,
  onFilterChange,
  onResetFilters,
  onNavigateToDirectory,
  onSelectRecord,
}) => {
  const [showCustomDate, setShowCustomDate] = useState(filters.datePreset === 'custom');
  const [isExporting, setIsExporting] = useState(false);

  // Drilldown state
  const [activeDrilldown, setActiveDrilldown] = useState<DrilldownData | null>(null);
  const [isLoadingDrilldown, setIsLoadingDrilldown] = useState(false);
  const [drilldownError, setDrilldownError] = useState<string | null>(null);

  // Trigger drill-down for visual elements
  const handleOpenDrilldown = async (target: DrilldownTarget) => {
    setIsLoadingDrilldown(true);
    setDrilldownError(null);
    try {
      const data = await fetchDrilldown(target, filters);
      setActiveDrilldown(data);
    } catch (err: any) {
      console.error('Failed to compute drilldown:', err);
      setDrilldownError(err.message || 'Error computing visual drill-down');
    } finally {
      setIsLoadingDrilldown(false);
    }
  };

  const handleExportDashboardCSV = async () => {
    setIsExporting(true);
    try {
      await exportFilteredCSV(filters, undefined, 'pwg_dashboard_filtered');
    } catch (err) {
      console.error('Failed to export dashboard CSV:', err);
    } finally {
      setIsExporting(false);
    }
  };

  // Handle Date Preset Changes
  const handleDatePresetChange = (preset: string) => {
    const today = new Date('2026-10-23');
    let start: Date | null = null;
    let end: Date | null = today;

    if (preset === '120d') {
      start = new Date(today);
      start.setDate(today.getDate() - 120);
      setShowCustomDate(false);
    } else if (preset === '30d') {
      start = new Date(today);
      start.setDate(today.getDate() - 30);
      setShowCustomDate(false);
    } else if (preset === '60d') {
      start = new Date(today);
      start.setDate(today.getDate() - 60);
      setShowCustomDate(false);
    } else if (preset === '180d') {
      start = new Date(today);
      start.setDate(today.getDate() - 180);
      setShowCustomDate(false);
    } else if (preset === 'all') {
      start = null;
      end = null;
      setShowCustomDate(false);
    } else if (preset === 'custom') {
      setShowCustomDate(true);
      return;
    }

    onFilterChange({
      datePreset: preset,
      startDate: start ? start.toISOString().split('T')[0] : '',
      endDate: end ? end.toISOString().split('T')[0] : '',
    });
  };

  if (isLoading && !analytics) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-28 rounded-2xl bg-white border border-slate-200 p-5 shadow-xs"></div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="p-5 rounded-2xl bg-white border border-slate-200 h-28 shadow-xs"
            ></div>
          ))}
        </div>
        <div className="h-72 rounded-2xl bg-white border border-slate-200 shadow-xs"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="h-64 rounded-2xl bg-white border border-slate-200 shadow-xs"></div>
          <div className="h-64 rounded-2xl bg-white border border-slate-200 shadow-xs"></div>
        </div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="p-12 text-center text-[#334155] font-semibold bg-white rounded-2xl border border-[#CBD5E1] shadow-xs">
        No analytics data available.
      </div>
    );
  }

  const distinct = analytics.distinctValues || {
    areas: [],
    projects: [],
    incharge: [],
    folderStatuses: [],
    unitsStatuses: [],
    stages: [],
    pwgUpdates: [],
  };

  const activeFilterCount = [
    filters.area,
    filters.project,
    filters.incharge,
    filters.folderStatus,
    filters.unitsStatus,
    filters.priorityMoveIn,
    filters.stage,
    filters.pwgUpdates,
    filters.startDate,
  ].filter(Boolean).length;

  return (
    <div className="space-y-6 pb-8">
      {/* 1. FILTERS BAR (Slate/Grayish Blue #334155 with #0F172A inputs) */}
      <div className="p-5 rounded-2xl bg-[#334155] border border-[#CBD5E1]/30 shadow-md space-y-4 text-white">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[#475569]/80">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#0F172A] border border-[#CBD5E1]/20 flex items-center justify-center text-[#38bdf8]">
              <Filter className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white uppercase tracking-wide">
                Filter Dashboard & Directory
              </h2>
              <p className="text-xs text-[#CBD5E1] font-medium">
                Real-time dynamic synchronization with Google Sheets database
              </p>
            </div>
            {activeFilterCount > 0 && (
              <span className="px-2.5 py-0.5 text-xs font-bold rounded-full bg-[#2563EB] text-white border border-blue-400">
                {activeFilterCount} Active
              </span>
            )}
          </div>

          <div className="flex items-center gap-3">
            {/* Export CSV button - Primary Button #2563EB */}
            <button
              onClick={handleExportDashboardCSV}
              disabled={isExporting}
              title="Export all currently filtered records as CSV"
              className="flex items-center gap-2 px-3.5 py-2 bg-[#2563EB] hover:bg-[#1d4ed8] text-white rounded-xl text-xs font-bold shadow-xs hover:shadow-sm transition-all cursor-pointer disabled:opacity-50"
            >
              {isExporting ? (
                <RotateCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Download className="w-3.5 h-3.5" />
              )}
              <span>Export CSV</span>
            </button>

            {activeFilterCount > 0 && (
              <button
                onClick={onResetFilters}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-rose-200 hover:bg-rose-950/40 rounded-xl transition-colors cursor-pointer border border-rose-400/40"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset Filters</span>
              </button>
            )}
          </div>
        </div>

        {/* Filter Dropdowns Grid: background #0F172A, text #FFFFFF, border #CBD5E1/40 */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {/* Area */}
          <div>
            <label className="block text-xs font-bold text-white mb-1.5">
              Area
            </label>
            <select
              value={filters.area}
              onChange={(e) => onFilterChange({ area: e.target.value })}
              className="w-full py-2 px-3 bg-[#0F172A] border border-[#CBD5E1]/40 rounded-xl text-xs font-bold text-white focus:outline-hidden focus:border-[#2563EB] focus:ring-2 focus:ring-blue-500/30 transition-all truncate"
            >
              <option value="" className="bg-[#0F172A] text-white">All Areas</option>
              {distinct.areas.map((a) => (
                <option key={a} value={a} className="bg-[#0F172A] text-white">
                  {a}
                </option>
              ))}
            </select>
          </div>

          {/* Project */}
          <div>
            <label className="block text-xs font-bold text-white mb-1.5">
              Project
            </label>
            <select
              value={filters.project}
              onChange={(e) => onFilterChange({ project: e.target.value })}
              className="w-full py-2 px-3 bg-[#0F172A] border border-[#CBD5E1]/40 rounded-xl text-xs font-bold text-white focus:outline-hidden focus:border-[#2563EB] focus:ring-2 focus:ring-blue-500/30 transition-all truncate"
            >
              <option value="" className="bg-[#0F172A] text-white">All Projects ({distinct.projects.length})</option>
              {distinct.projects.map((p) => (
                <option key={p} value={p} className="bg-[#0F172A] text-white">
                  {p}
                </option>
              ))}
            </select>
          </div>

          {/* In charge */}
          <div>
            <label className="block text-xs font-bold text-white mb-1.5">
              In Charge
            </label>
            <select
              value={filters.incharge}
              onChange={(e) => onFilterChange({ incharge: e.target.value })}
              className="w-full py-2 px-3 bg-[#0F172A] border border-[#CBD5E1]/40 rounded-xl text-xs font-bold text-white focus:outline-hidden focus:border-[#2563EB] focus:ring-2 focus:ring-blue-500/30 transition-all truncate"
            >
              <option value="" className="bg-[#0F172A] text-white">All Personnel</option>
              {distinct.incharge.map((i) => (
                <option key={i} value={i} className="bg-[#0F172A] text-white">
                  {i}
                </option>
              ))}
            </select>
          </div>

          {/* Folder Status */}
          <div>
            <label className="block text-xs font-bold text-white mb-1.5">
              Folder Status
            </label>
            <select
              value={filters.folderStatus}
              onChange={(e) => onFilterChange({ folderStatus: e.target.value })}
              className="w-full py-2 px-3 bg-[#0F172A] border border-[#CBD5E1]/40 rounded-xl text-xs font-bold text-white focus:outline-hidden focus:border-[#2563EB] focus:ring-2 focus:ring-blue-500/30 transition-all truncate"
            >
              <option value="" className="bg-[#0F172A] text-white">All Folders</option>
              {distinct.folderStatuses.map((f) => (
                <option key={f} value={f} className="bg-[#0F172A] text-white">
                  {f}
                </option>
              ))}
            </select>
          </div>

          {/* Unit Status */}
          <div>
            <label className="block text-xs font-bold text-white mb-1.5">
              Unit Status
            </label>
            <select
              value={filters.unitsStatus}
              onChange={(e) => onFilterChange({ unitsStatus: e.target.value })}
              className="w-full py-2 px-3 bg-[#0F172A] border border-[#CBD5E1]/40 rounded-xl text-xs font-bold text-white focus:outline-hidden focus:border-[#2563EB] focus:ring-2 focus:ring-blue-500/30 transition-all"
            >
              <option value="" className="bg-[#0F172A] text-white">All Statuses</option>
              {distinct.unitsStatuses.map((s) => (
                <option key={s} value={s} className="bg-[#0F172A] text-white">
                  {s}
                </option>
              ))}
            </select>
          </div>

          {/* Date Range Picker (Default: All Time) */}
          <div>
            <label className="block text-xs font-bold text-white mb-1.5 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-[#38bdf8]" />
              <span>Date Range</span>
            </label>
            <select
              value={filters.datePreset || 'all'}
              onChange={(e) => handleDatePresetChange(e.target.value)}
              className="w-full py-2 px-3 bg-[#0F172A] border border-[#CBD5E1]/40 rounded-xl text-xs font-bold text-white focus:outline-hidden focus:border-[#2563EB] focus:ring-2 focus:ring-blue-500/30 transition-all"
            >
              <option value="all" className="bg-[#0F172A] text-white">All Time (Default)</option>
              <option value="30d" className="bg-[#0F172A] text-white">Last 30 Days</option>
              <option value="60d" className="bg-[#0F172A] text-white">Last 60 Days</option>
              <option value="120d" className="bg-[#0F172A] text-white">Last 120 Days</option>
              <option value="180d" className="bg-[#0F172A] text-white">Last 180 Days</option>
              <option value="custom" className="bg-[#0F172A] text-white">Custom Range...</option>
            </select>
          </div>
        </div>

        {/* Custom date range picker inputs if 'custom' selected */}
        {showCustomDate && (
          <div className="flex items-center gap-3 pt-3 text-xs border-t border-[#475569]">
            <span className="text-xs text-white font-bold">Custom Range:</span>
            <input
              type="date"
              value={filters.startDate || ''}
              onChange={(e) => onFilterChange({ startDate: e.target.value, datePreset: 'custom' })}
              className="py-1.5 px-3 bg-[#0F172A] border border-[#CBD5E1]/40 rounded-lg text-xs font-bold text-white"
            />
            <span className="text-[#CBD5E1] font-bold">to</span>
            <input
              type="date"
              value={filters.endDate || ''}
              onChange={(e) => onFilterChange({ endDate: e.target.value, datePreset: 'custom' })}
              className="py-1.5 px-3 bg-[#0F172A] border border-[#CBD5E1]/40 rounded-lg text-xs font-bold text-white"
            />
          </div>
        )}
      </div>

      {/* 2. LARGE KPI SUMMARY CARDS (Background white, border #CBD5E1, main text #1E293B, secondary #475569) */}
      {/* 2. LARGE KPI SUMMARY CARDS (Background white, border #CBD5E1, main text #1E293B, secondary #475569) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 sm:gap-4">
        {/* Total Database Units */}
        <div
          onClick={() =>
            handleOpenDrilldown({
              category: 'kpiCard',
              value: 'all',
              label: 'Total Database Baseline Units',
            })
          }
          className="p-3.5 sm:p-5 rounded-xl sm:rounded-2xl bg-white border border-[#CBD5E1] hover:border-[#2563EB] hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between shadow-xs"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] sm:text-xs font-extrabold text-[#1E293B] uppercase tracking-wide">
              Total Units
            </span>
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-slate-100 flex items-center justify-center text-[#1E293B]">
              <Database className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
          </div>
          <div className="mt-2.5 sm:mt-3">
            <span className="text-2xl sm:text-3xl font-extrabold font-mono text-[#1E293B] block tracking-tight">
              {analytics.totalUnits.toLocaleString()}
            </span>
            <span className="text-[11px] sm:text-xs text-[#334155] font-semibold mt-0.5 sm:mt-1 block">Active Baseline</span>
          </div>
        </div>

        {/* Energized - Green theme requirement */}
        <div
          onClick={() =>
            handleOpenDrilldown({
              category: 'kpiCard',
              value: 'energized',
              label: 'Energized Units',
            })
          }
          className="p-3.5 sm:p-5 rounded-xl sm:rounded-2xl bg-emerald-50/40 border-2 border-emerald-300 hover:border-emerald-500 hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between shadow-xs"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] sm:text-xs font-extrabold text-emerald-800 uppercase tracking-wide flex items-center gap-1 sm:gap-1.5">
              <Zap className="w-3 h-3 sm:w-3.5 sm:h-3.5 fill-emerald-600 text-emerald-600" />
              Energized
            </span>
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-700">
              <TrendingUp className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
          </div>
          <div className="mt-2.5 sm:mt-3">
            <div className="flex items-baseline justify-between gap-1 flex-wrap">
              <span className="text-2xl sm:text-3xl font-extrabold font-mono text-emerald-700 tracking-tight">
                {analytics.energizedCount.toLocaleString()}
              </span>
              <span className="px-1.5 sm:px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-300 font-mono">
                {analytics.totalUnits > 0
                  ? `${((analytics.energizedCount / analytics.totalUnits) * 100).toFixed(1)}%`
                  : '0%'}
              </span>
            </div>
            <span className="text-[11px] sm:text-xs text-[#334155] font-semibold mt-0.5 sm:mt-1 block">Completed Units</span>
          </div>
        </div>

        {/* Ongoing Works */}
        <div
          onClick={() =>
            handleOpenDrilldown({
              category: 'kpiCard',
              value: 'ongoing',
              label: 'Ongoing Works in Pipeline',
            })
          }
          className="p-3.5 sm:p-5 rounded-xl sm:rounded-2xl bg-white border border-[#CBD5E1] hover:border-[#2563EB] hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between shadow-xs"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] sm:text-xs font-extrabold text-[#1E293B] uppercase tracking-wide flex items-center gap-1 sm:gap-1.5">
              <Clock className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-blue-600" />
              Ongoing Works
            </span>
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
              <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
          </div>
          <div className="mt-2.5 sm:mt-3">
            <div className="flex items-baseline justify-between gap-1 flex-wrap">
              <span className="text-2xl sm:text-3xl font-extrabold font-mono text-[#1E293B] tracking-tight">
                {analytics.ongoingCount.toLocaleString()}
              </span>
              <span className="text-[11px] sm:text-xs font-mono font-extrabold text-[#1E293B]">
                {analytics.totalUnits > 0
                  ? `${((analytics.ongoingCount / analytics.totalUnits) * 100).toFixed(1)}%`
                  : '0%'}
              </span>
            </div>
            <span className="text-[11px] sm:text-xs text-[#334155] font-semibold mt-0.5 sm:mt-1 block">In Pipeline</span>
          </div>
        </div>

        {/* Pending / NYS */}
        <div
          onClick={() =>
            handleOpenDrilldown({
              category: 'kpiCard',
              value: 'nys',
              label: 'Pending / Not Yet Started (NYS)',
            })
          }
          className="p-3.5 sm:p-5 rounded-xl sm:rounded-2xl bg-white border border-[#CBD5E1] hover:border-[#2563EB] hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between shadow-xs"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] sm:text-xs font-extrabold text-[#1E293B] uppercase tracking-wide">
              Pending / NYS
            </span>
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-slate-100 flex items-center justify-center text-[#1E293B]">
              <AlertCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
          </div>
          <div className="mt-2.5 sm:mt-3">
            <div className="flex items-baseline justify-between gap-1 flex-wrap">
              <span className="text-2xl sm:text-3xl font-extrabold font-mono text-[#1E293B] tracking-tight">
                {analytics.nysCount.toLocaleString()}
              </span>
              <span className="text-[11px] sm:text-xs font-mono font-extrabold text-[#1E293B]">
                {analytics.totalUnits > 0
                  ? `${((analytics.nysCount / analytics.totalUnits) * 100).toFixed(1)}%`
                  : '0%'}
              </span>
            </div>
            <span className="text-[11px] sm:text-xs text-[#334155] font-semibold mt-0.5 sm:mt-1 block">Not Started</span>
          </div>
        </div>

        {/* Taken Out - Folder Status Blue */}
        <div
          onClick={() =>
            handleOpenDrilldown({
              category: 'kpiCard',
              value: 'takenOut',
              label: 'Taken Out Folders',
            })
          }
          className="p-3.5 sm:p-5 rounded-xl sm:rounded-2xl bg-blue-50/30 border border-blue-200 hover:border-blue-500 hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between shadow-xs"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] sm:text-xs font-extrabold text-blue-900 uppercase tracking-wide flex items-center gap-1 sm:gap-1.5">
              <FolderCheck className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-blue-600" />
              Taken Out
            </span>
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-blue-100 flex items-center justify-center text-blue-700">
              <FolderCheck className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
          </div>
          <div className="mt-2.5 sm:mt-3">
            <div className="flex items-baseline justify-between gap-1 flex-wrap">
              <span className="text-2xl sm:text-3xl font-extrabold font-mono text-blue-900 tracking-tight">
                {analytics.takenOutCount.toLocaleString()}
              </span>
              <span className="px-1.5 sm:px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-extrabold bg-blue-100 text-blue-800 border border-blue-300 font-mono">
                {analytics.totalUnits > 0
                  ? `${((analytics.takenOutCount / analytics.totalUnits) * 100).toFixed(1)}%`
                  : '0%'}
              </span>
            </div>
            <span className="text-[11px] sm:text-xs text-[#334155] font-semibold mt-0.5 sm:mt-1 block">Handed Over</span>
          </div>
        </div>

        {/* Priority Move-In - Priority Red */}
        <div
          onClick={() =>
            handleOpenDrilldown({
              category: 'kpiCard',
              value: 'priority',
              label: 'Priority Move-In Units',
            })
          }
          className="p-3.5 sm:p-5 rounded-xl sm:rounded-2xl bg-red-50/30 border-2 border-red-200 hover:border-red-400 hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between shadow-xs"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] sm:text-xs font-extrabold text-red-800 uppercase tracking-wide flex items-center gap-1 sm:gap-1.5">
              <Flame className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-red-600 fill-red-600" />
              Priority
            </span>
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-red-100 flex items-center justify-center text-red-700">
              <Flame className="w-3.5 h-3.5 sm:w-4 sm:h-4 fill-red-600" />
            </div>
          </div>
          <div className="mt-2.5 sm:mt-3">
            <div className="flex items-baseline justify-between gap-1 flex-wrap">
              <span className="text-2xl sm:text-3xl font-extrabold font-mono text-red-700 tracking-tight">
                {analytics.priorityCount.toLocaleString()}
              </span>
              <span className="px-1.5 sm:px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-mono font-extrabold bg-red-100 text-red-800 border border-red-300">
                {analytics.totalUnits > 0
                  ? `${((analytics.priorityCount / analytics.totalUnits) * 100).toFixed(1)}%`
                  : '0%'}
              </span>
            </div>
            <span className="text-[11px] sm:text-xs text-[#334155] font-semibold mt-0.5 sm:mt-1 block">Move-In Units</span>
          </div>
        </div>
      </div>

      {/* 3. FLOW CHART: Monthly Taken Out, Energized, and ENERGIZED- 1.WITHIN 21 DAYS */}
      <div className="p-6 rounded-2xl bg-white border border-[#CBD5E1] shadow-xs">
        <MonthlyFlowChart
          data={analytics.monthlyTrend}
          title="Monthly Flow: Taken Out vs. Energized vs. Within 21 Days"
          onPointClick={(item, metric) => {
            const metricLabel =
              metric === 'takenOut'
                ? 'Taken Out'
                : metric === 'within21Days'
                ? 'Within 21 Days'
                : 'Energized';
            handleOpenDrilldown({
              category: 'monthlyTrend',
              value: item.key,
              label: `${item.label} (${metricLabel})`,
              month: item.key,
              metric,
            });
          }}
        />
      </div>

      {/* 4 & 5. HORIZONTAL BAR CHARTS: KPI Remarks & PWG Updates */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Horizontal Bar Chart 1: KPI Remarks */}
        <div className="p-6 rounded-2xl bg-white border border-[#CBD5E1] shadow-xs">
          <HorizontalBarChart
            title="KPI Remarks Distribution"
            subtitle="Categorized performance and turnaround timeframe analysis"
            data={analytics.kpiRemarksDistribution}
            accentKey="21 DAYS"
            onItemClick={(label) => {
              handleOpenDrilldown({
                category: 'kpiRemarks',
                value: label,
                label: `KPI Remark: ${label}`,
              });
            }}
          />
        </div>

        {/* Horizontal Bar Chart 2: PWG Updates */}
        <div className="p-6 rounded-2xl bg-white border border-[#CBD5E1] shadow-xs">
          <HorizontalBarChart
            title="PWG Updates Breakdown"
            subtitle="Real-time field & engineering workflow status updates"
            data={analytics.pwgUpdatesDistribution}
            accentKey="ENERGIZED"
            onItemClick={(label) => {
              handleOpenDrilldown({
                category: 'pwgUpdates',
                value: label,
                label: `PWG Update: ${label}`,
              });
            }}
          />
        </div>
      </div>

      {/* 6. VERTICAL BAR CHART: taken out, priority, energized, ENERGIZED- 1.WITHIN 21 DAYS, ongoing, nys */}
      <div className="p-6 rounded-2xl bg-white border border-[#CBD5E1] shadow-xs">
        <VerticalBarChart
          data={analytics.verticalComparison}
          totalUnits={analytics.totalUnits}
          title="Status Comparison: Taken Out, Priority, Energized, Within 21 Days, Ongoing, NYS"
          onItemClick={(key, label) => {
            handleOpenDrilldown({
              category: 'verticalComparison',
              value: key,
              label: `Status: ${label}`,
            });
          }}
        />
      </div>

      {/* 7. PIE CHARTS (3-Column Grid): Fac Status, COO Status, SEP Status */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Pie Chart of Fac Status */}
        <div className="p-6 rounded-2xl bg-white border border-[#CBD5E1] shadow-xs">
          <DonutPieChart
            title="FAC Status Distribution"
            data={analytics.facStatusDistribution}
            colorTheme="blue"
            onSliceClick={(label) => {
              handleOpenDrilldown({
                category: 'facStatus',
                value: label,
                label: `FAC Status: ${label}`,
              });
            }}
          />
        </div>

        {/* Pie Chart of COO Status */}
        <div className="p-6 rounded-2xl bg-white border border-[#CBD5E1] shadow-xs">
          <DonutPieChart
            title="COO Status Distribution"
            data={analytics.cooStatusDistribution}
            colorTheme="navy"
            onSliceClick={(label) => {
              handleOpenDrilldown({
                category: 'cooStatus',
                value: label,
                label: `COO Status: ${label}`,
              });
            }}
          />
        </div>

        {/* Pie Chart of SEP Status */}
        <div className="p-6 rounded-2xl bg-white border border-[#CBD5E1] shadow-xs">
          <DonutPieChart
            title="SEP Status Distribution"
            data={analytics.sepStatusDistribution}
            colorTheme="slate"
            onSliceClick={(label) => {
              handleOpenDrilldown({
                category: 'sepStatus',
                value: label,
                label: `SEP Status: ${label}`,
              });
            }}
          />
        </div>
      </div>

      {/* 8. UNIT STATUS BREAKDOWN BY IN-CHARGE (Grouped Bar Chart directly BELOW pie charts) */}
      <InchargeStatusBarChart
        data={analytics.inchargeStatusBreakdown}
        onBarClick={(person, category) => {
          let metric = '';
          if (category === 'ENERGIZED') {
            metric = 'energized_other';
          } else if (category === 'ENERGIZED - 1. WITHIN 21 DAYS') {
            metric = 'within21days';
          } else if (category === 'ONGOING') {
            metric = 'ongoing';
          } else if (category === 'NYS') {
            metric = 'nys';
          } else if (category === 'TAKEN OUT') {
            metric = 'takenout';
          }

          handleOpenDrilldown({
            category: 'inchargeStatus',
            value: person,
            metric,
            label: `${person} • ${category}`,
          });
        }}
      />

      {/* Interactive Visual Drill-Down Breakdown Modal */}
      {(activeDrilldown || isLoadingDrilldown || drilldownError) && (
        <DashboardDrilldownModal
          drilldown={activeDrilldown}
          isLoading={isLoadingDrilldown}
          error={drilldownError}
          filters={filters}
          onClose={() => {
            setActiveDrilldown(null);
            setDrilldownError(null);
          }}
          onSelectRecord={(r) => {
            if (onSelectRecord) onSelectRecord(r);
          }}
          onOpenInDirectory={(drillFilterUpdates) => {
            onFilterChange(drillFilterUpdates);
            setActiveDrilldown(null);
            onNavigateToDirectory();
          }}
        />
      )}
    </div>
  );
};
