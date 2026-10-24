import React, { useState, useRef } from 'react';
import {
  FileText,
  Download,
  Filter,
  RotateCcw,
  RotateCw,
  Calendar,
  Database,
  TrendingUp,
  Zap,
  Clock,
  AlertCircle,
  FolderCheck,
  Flame,
  FileDown,
  CheckCircle2,
  AlertTriangle,
  ChevronRight,
} from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas-pro';
import { AnalyticsData, SummaryData, FilterState, SheetRecord } from '../lib/types';
import { HorizontalBarChart } from './charts/HorizontalBarChart';
import { CumulativeWeeklyKpiMatrix } from './CumulativeWeeklyKpiMatrix';

interface ManagementReportViewProps {
  summary: SummaryData | null;
  analytics: AnalyticsData | null;
  filters: FilterState;
  onFilterChange: (updates: Partial<FilterState>) => void;
  onResetFilters: () => void;
  onNavigateToDirectory: (filterUpdates?: Partial<FilterState>) => void;
  onSelectRecord?: (record: SheetRecord) => void;
}

export const ManagementReportView: React.FC<ManagementReportViewProps> = ({
  summary,
  analytics,
  filters,
  onFilterChange,
  onResetFilters,
  onNavigateToDirectory,
}) => {
  const reportRef = useRef<HTMLDivElement>(null);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [showCustomDate, setShowCustomDate] = useState(filters.datePreset === 'custom');

  const [reportDate] = useState(() => {
    return new Date().toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  });

  if (!analytics || !summary) {
    return (
      <div className="p-12 text-center text-[#334155] font-semibold bg-white rounded-2xl border border-[#CBD5E1] shadow-xs">
        <RotateCw className="w-8 h-8 mx-auto text-[#2563EB] animate-spin mb-3" />
        <p>Loading management report metrics from Google Sheets...</p>
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
    filters.stage,
    filters.priorityMoveIn,
    filters.datePreset && filters.datePreset !== 'all' ? filters.datePreset : '',
    filters.startDate,
  ].filter(Boolean).length;

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

  const topWithin21 = analytics.topWithin21Projects || [];
  const topCriticalDelay = analytics.topCriticalOngoingDelayProjects || [];

  // Export CSV Handler
  const handleExportCSV = () => {
    const csvRows = [
      ['PWG Individual Energization - Executive Management Report'],
      [`Report Date: ${reportDate}`],
      ['Active Filters', `Area: ${filters.area || 'All'}, Project: ${filters.project || 'All'}, In-Charge: ${filters.incharge || 'All'}, Date Range: ${filters.datePreset || 'all'}`],
      [''],
      ['PORTFOLIO KPI SUMMARY'],
      ['Metric', 'Unit Count', 'Percentage'],
      ['Total Units (Active Baseline)', analytics.totalUnits, '100%'],
      ['Total Energized (Completed)', analytics.energizedCount, `${((analytics.energizedCount / (analytics.totalUnits || 1)) * 100).toFixed(1)}%`],
      ['Ongoing Works (Active Pipeline)', analytics.ongoingCount, `${((analytics.ongoingCount / (analytics.totalUnits || 1)) * 100).toFixed(1)}%`],
      ['Pending / NYS (Not Yet Started)', analytics.nysCount, `${((analytics.nysCount / (analytics.totalUnits || 1)) * 100).toFixed(1)}%`],
      ['Taken Out (Folders Handed Over)', analytics.takenOutCount, `${((analytics.takenOutCount / (analytics.totalUnits || 1)) * 100).toFixed(1)}%`],
      ['Priority Move-In Units', analytics.priorityCount, `${((analytics.priorityCount / (analytics.totalUnits || 1)) * 100).toFixed(1)}%`],
      ['Within 21 Days (KPI Turnaround)', analytics.within21DaysCount, `${((analytics.within21DaysCount / (analytics.energizedCount || 1)) * 100).toFixed(1)}% of Energized`],
      [''],
      ['TOP 6 ENERGIZED- 1.WITHIN 21 DAYS PROJECTS'],
      ['Rank', 'Project Name', 'Within 21 Days Units', 'Total Energized', 'SLA Compliance %'],
      ...topWithin21.map((p) => [
        p.rank,
        `"${p.name}"`,
        p.count,
        p.totalEnergized,
        `${p.percentage}%`,
      ]),
      [''],
      ['TOP 6 CRITICAL ONGOING DELAY PROJECTS FROM TAKEOUT DATE'],
      ['Rank', 'Project Name', 'Delayed Ongoing Units', 'Total Ongoing', 'Avg Delay (Days)', 'Max Delay (Days)'],
      ...topCriticalDelay.map((p) => [
        p.rank,
        `"${p.name}"`,
        p.count,
        p.totalOngoing,
        p.avgDelayDays,
        p.maxDelayDays,
      ]),
      [''],
      ['KPI REMARKS DISTRIBUTION'],
      ['Remark Category', 'Units Count', 'Percentage'],
      ...analytics.kpiRemarksDistribution.map((item) => [
        `"${item.label}"`,
        item.count,
        `${item.percentage}%`,
      ]),
      [''],
      ['PWG UPDATES BREAKDOWN'],
      ['Update Category', 'Units Count', 'Percentage'],
      ...analytics.pwgUpdatesDistribution.map((item) => [
        `"${item.label}"`,
        item.count,
        `${item.percentage}%`,
      ]),
    ];

    const csvContent = 'data:text/csv;charset=utf-8,' + csvRows.map((e) => e.join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `management_report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Export PDF Handler - Directly downloads the Executive Management Report visual as a PDF file
  const handleExportPDF = async () => {
    if (!reportRef.current) return;
    setIsExportingPdf(true);

    try {
      const element = reportRef.current;
      const originalScrollY = window.scrollY;
      window.scrollTo(0, 0);

      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        logging: false,
        backgroundColor: '#E2E8F0',
        windowWidth: document.documentElement.offsetWidth || 1200,
      });

      window.scrollTo(0, originalScrollY);

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const imgHeight = (canvas.height * pdfWidth) / canvas.width;

      let position = 0;
      let heightLeft = imgHeight;

      // Add First Page
      pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, imgHeight, undefined, 'FAST');
      heightLeft -= pageHeight;

      // Extra Pages if overflowing A4 height
      while (heightLeft > 0) {
        position -= pageHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, imgHeight, undefined, 'FAST');
        heightLeft -= pageHeight;
      }

      const dateStr = new Date().toISOString().split('T')[0];
      pdf.save(`Executive_Management_Report_${dateStr}.pdf`);
    } catch (err) {
      console.error('Failed to export PDF:', err);
    } finally {
      setIsExportingPdf(false);
    }
  };

  return (
    <div ref={reportRef} className="space-y-6">
      {/* 1. EXECUTIVE REPORT HEADER (Top) */}
      <div className="bg-white rounded-2xl p-6 sm:p-7 border border-[#CBD5E1] shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-[#2563EB]/10 text-[#2563EB] border border-[#2563EB]/20">
              <FileText className="w-5 h-5" />
            </span>
            <h2 className="text-xl sm:text-2xl font-extrabold text-[#1E293B] tracking-tight">
              Executive Management Report
            </h2>
            <span className="px-2.5 py-0.5 text-xs font-bold bg-[#1E293B] text-white rounded-md">
              OFFICIAL
            </span>
          </div>
          <p className="text-xs text-[#334155] font-semibold mt-1.5 flex items-center gap-2 flex-wrap">
            <span>Portfolio Status & Operational Velocity Review</span>
            <span>•</span>
            <span className="text-[#475569]">Generated: {reportDate}</span>
            <span>•</span>
            <span className="text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
              Live Google Sheets Data
            </span>
          </p>
        </div>

        {/* Action Buttons: Export CSV & Export PDF (Sync Data and Print/PDF removed) */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-2 px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-[#1E293B] border border-[#CBD5E1] rounded-xl text-xs font-bold transition-all shadow-2xs hover:shadow-xs cursor-pointer"
          >
            <Download className="w-4 h-4 text-[#2563EB]" />
            <span>Export CSV</span>
          </button>

          <button
            onClick={handleExportPDF}
            disabled={isExportingPdf}
            className="flex items-center gap-2 px-4 py-2.5 bg-[#2563EB] hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs hover:shadow-md cursor-pointer disabled:opacity-50"
          >
            {isExportingPdf ? (
              <RotateCw className="w-4 h-4 animate-spin" />
            ) : (
              <FileDown className="w-4 h-4" />
            )}
            <span>{isExportingPdf ? 'Generating PDF...' : 'Export PDF'}</span>
          </button>
        </div>
      </div>

      {/* 2. FILTER PANEL (Copied from Dashboard) */}
      <div className="p-5 rounded-2xl bg-[#334155] border border-[#CBD5E1]/30 shadow-md space-y-4 text-white">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[#475569]/80">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#0F172A] border border-[#CBD5E1]/20 flex items-center justify-center text-[#38bdf8]">
              <Filter className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white uppercase tracking-wide">
                Filter Management Report
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

      {/* 3. KPI SUMMARY CARDS (Copied visual from Dashboard: Total database unit, energized, ongoing works, pending/nys, add taken out, priority) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        {/* Total Database Units */}
        <div
          onClick={() => onNavigateToDirectory()}
          className="p-5 rounded-2xl bg-white border border-[#CBD5E1] hover:border-[#2563EB] hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between shadow-xs"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold text-[#1E293B] uppercase tracking-wide">
              Total Units
            </span>
            <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-[#1E293B]">
              <Database className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-3xl font-extrabold font-mono text-[#1E293B] block tracking-tight">
              {analytics.totalUnits.toLocaleString()}
            </span>
            <span className="text-xs text-[#334155] font-semibold mt-1 block">Active Baseline</span>
          </div>
        </div>

        {/* Energized - Green theme requirement */}
        <div
          onClick={() => onNavigateToDirectory({ unitsStatus: 'ENERGIZED' })}
          className="p-5 rounded-2xl bg-emerald-50/40 border-2 border-emerald-300 hover:border-emerald-500 hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between shadow-xs"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold text-emerald-800 uppercase tracking-wide flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 fill-emerald-600 text-emerald-600" />
              Energized
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-700">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="flex items-baseline justify-between">
              <span className="text-3xl font-extrabold font-mono text-emerald-700 tracking-tight">
                {analytics.energizedCount.toLocaleString()}
              </span>
              <span className="px-2 py-0.5 rounded-full text-xs font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-300 font-mono">
                {analytics.totalUnits > 0
                  ? `${((analytics.energizedCount / analytics.totalUnits) * 100).toFixed(1)}%`
                  : '0%'}
              </span>
            </div>
            <span className="text-xs text-[#334155] font-semibold mt-1 block">Completed Units</span>
          </div>
        </div>

        {/* Ongoing Works */}
        <div
          onClick={() => onNavigateToDirectory({ unitsStatus: 'ONGOING' })}
          className="p-5 rounded-2xl bg-white border border-[#CBD5E1] hover:border-[#2563EB] hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between shadow-xs"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold text-[#1E293B] uppercase tracking-wide flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-blue-600" />
              Ongoing Works
            </span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="flex items-baseline justify-between">
              <span className="text-3xl font-extrabold font-mono text-[#1E293B] tracking-tight">
                {analytics.ongoingCount.toLocaleString()}
              </span>
              <span className="text-xs font-mono font-extrabold text-[#1E293B]">
                {analytics.totalUnits > 0
                  ? `${((analytics.ongoingCount / analytics.totalUnits) * 100).toFixed(1)}%`
                  : '0%'}
              </span>
            </div>
            <span className="text-xs text-[#334155] font-semibold mt-1 block">In Active Pipeline</span>
          </div>
        </div>

        {/* Pending / NYS */}
        <div
          onClick={() => onNavigateToDirectory({ unitsStatus: 'NYS' })}
          className="p-5 rounded-2xl bg-white border border-[#CBD5E1] hover:border-[#2563EB] hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between shadow-xs"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold text-[#1E293B] uppercase tracking-wide">
              Pending / NYS
            </span>
            <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-[#1E293B]">
              <AlertCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="flex items-baseline justify-between">
              <span className="text-3xl font-extrabold font-mono text-[#1E293B] tracking-tight">
                {analytics.nysCount.toLocaleString()}
              </span>
              <span className="text-xs font-mono font-extrabold text-[#1E293B]">
                {analytics.totalUnits > 0
                  ? `${((analytics.nysCount / analytics.totalUnits) * 100).toFixed(1)}%`
                  : '0%'}
              </span>
            </div>
            <span className="text-xs text-[#334155] font-semibold mt-1 block">Not Yet Started</span>
          </div>
        </div>

        {/* Taken Out - Folder Status Blue */}
        <div
          onClick={() => onNavigateToDirectory({ folderStatus: 'TAKEN OUT' })}
          className="p-5 rounded-2xl bg-blue-50/30 border border-blue-200 hover:border-blue-500 hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between shadow-xs"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold text-blue-900 uppercase tracking-wide flex items-center gap-1.5">
              <FolderCheck className="w-3.5 h-3.5 text-blue-600" />
              Taken Out
            </span>
            <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center text-blue-700">
              <FolderCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="flex items-baseline justify-between">
              <span className="text-3xl font-extrabold font-mono text-blue-900 tracking-tight">
                {analytics.takenOutCount.toLocaleString()}
              </span>
              <span className="px-2 py-0.5 rounded-full text-xs font-extrabold bg-blue-100 text-blue-800 border border-blue-300 font-mono">
                {analytics.totalUnits > 0
                  ? `${((analytics.takenOutCount / analytics.totalUnits) * 100).toFixed(1)}%`
                  : '0%'}
              </span>
            </div>
            <span className="text-xs text-[#334155] font-semibold mt-1 block">Folders Handed Over</span>
          </div>
        </div>

        {/* Priority Move-In - Priority Red */}
        <div
          onClick={() => onNavigateToDirectory({ priorityMoveIn: 'PRIORITY' })}
          className="p-5 rounded-2xl bg-red-50/30 border-2 border-red-200 hover:border-red-400 hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between shadow-xs"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold text-red-800 uppercase tracking-wide flex items-center gap-1.5">
              <Flame className="w-3.5 h-3.5 text-red-600 fill-red-600" />
              Priority
            </span>
            <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center text-red-700">
              <Flame className="w-4 h-4 fill-red-600" />
            </div>
          </div>
          <div className="mt-3">
            <div className="flex items-baseline justify-between">
              <span className="text-3xl font-extrabold font-mono text-red-700 tracking-tight">
                {analytics.priorityCount.toLocaleString()}
              </span>
              <span className="px-2 py-0.5 rounded-full text-xs font-mono font-extrabold bg-red-100 text-red-800 border border-red-300">
                {analytics.totalUnits > 0
                  ? `${((analytics.priorityCount / analytics.totalUnits) * 100).toFixed(1)}%`
                  : '0%'}
              </span>
            </div>
            <span className="text-xs text-[#334155] font-semibold mt-1 block">Move-In Priorities</span>
          </div>
        </div>
      </div>

      {/* 4. MAIN DASHBOARD: CUMULATIVE WEEKLY KPI MATRIX (Persistent Historical Snapshots + Live Current Week) */}
      <CumulativeWeeklyKpiMatrix filters={filters} />

      {/* 5. 2-COLUMN SECTION:
          LEFT: Top 6 ENERGIZED- 1.WITHIN 21 DAYS Project + KPI Remarks Distribution
          RIGHT: Top 6 Critical Ongoing delay project from takeout date + PWG Updates Breakdown
      */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* LEFT COLUMN: Top 6 Within 21 Days Projects & KPI Remarks Distribution */}
        <div className="space-y-6">
          {/* Card: Top 6 ENERGIZED- 1.WITHIN 21 DAYS Project */}
          <div className="p-6 rounded-2xl bg-white border border-[#CBD5E1] shadow-xs">
            <div className="flex items-center justify-between pb-3 border-b border-[#CBD5E1] mb-4">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-blue-50 text-[#2563EB] border border-blue-200">
                  <CheckCircle2 className="w-4 h-4" />
                </span>
                <div>
                  <h3 className="text-base font-bold text-[#1E293B] tracking-tight">
                    Top 6 ENERGIZED- 1.WITHIN 21 DAYS Projects
                  </h3>
                  <p className="text-xs text-[#334155] font-semibold mt-0.5">
                    Highest volume projects meeting the 21-day energization turnaround target
                  </p>
                </div>
              </div>
              <span className="text-xs font-bold text-[#2563EB] bg-blue-50 px-2.5 py-1 rounded-md border border-blue-200 shrink-0">
                {analytics.within21DaysCount.toLocaleString()} Total Units
              </span>
            </div>

            {topWithin21.length === 0 ? (
              <div className="py-6 text-center text-xs text-[#334155] font-semibold">
                No within 21-day energization records found for current filters.
              </div>
            ) : (
              <div className="space-y-2.5">
                {topWithin21.map((proj) => (
                  <div
                    key={proj.name}
                    onClick={() => onNavigateToDirectory({ project: proj.name, unitsStatus: 'ENERGIZED' })}
                    className="p-3 bg-slate-50 hover:bg-blue-50/50 rounded-xl border border-[#CBD5E1] hover:border-blue-300 transition-all cursor-pointer flex items-center justify-between gap-3 group"
                  >
                    <div className="min-w-0 flex items-center gap-3">
                      <span className="w-6 h-6 rounded-lg bg-[#2563EB] text-white text-xs font-extrabold flex items-center justify-center shrink-0 shadow-2xs">
                        #{proj.rank}
                      </span>
                      <div className="truncate">
                        <h4 className="text-xs font-bold text-[#1E293B] group-hover:text-[#2563EB] transition-colors truncate">
                          {proj.name}
                        </h4>
                        <div className="flex items-center gap-2 text-[11px] text-[#475569] font-medium mt-0.5">
                          <span>{proj.totalEnergized?.toLocaleString() || 0} total energized</span>
                          <span>•</span>
                          <span className="text-[#2563EB] font-bold">{proj.percentage}% SLA rate</span>
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0 flex items-center gap-2">
                      <div>
                        <div className="text-sm font-extrabold font-mono text-[#2563EB]">
                          {proj.count.toLocaleString()}
                        </div>
                        <div className="text-[10px] text-[#475569] font-semibold">within 21 days</div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-[#2563EB] transition-transform group-hover:translate-x-0.5" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Chart: KPI Remarks Distribution directly below */}
          <div className="p-6 rounded-2xl bg-white border border-[#CBD5E1] shadow-xs">
            <HorizontalBarChart
              title="KPI Remarks Distribution"
              subtitle="Categorized performance and turnaround timeframe analysis"
              data={analytics.kpiRemarksDistribution}
              accentKey="21 DAYS"
              onItemClick={(label) => {
                onNavigateToDirectory({ search: label });
              }}
            />
          </div>
        </div>

        {/* RIGHT COLUMN: Top 6 Critical Delay Projects & PWG Updates Breakdown */}
        <div className="space-y-6">
          {/* Card: Top 6 Critical Ongoing delay project from the takeout date */}
          <div className="p-6 rounded-2xl bg-white border border-[#CBD5E1] shadow-xs">
            <div className="flex items-center justify-between pb-3 border-b border-[#CBD5E1] mb-4">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-rose-50 text-rose-700 border border-rose-200">
                  <AlertTriangle className="w-4 h-4 text-rose-600" />
                </span>
                <div>
                  <h3 className="text-base font-bold text-[#1E293B] tracking-tight">
                    Top 6 Critical Ongoing Delay Projects
                  </h3>
                  <p className="text-xs text-[#334155] font-semibold mt-0.5">
                    Ongoing units with longest elapsed days since folder takeout date
                  </p>
                </div>
              </div>
              <span className="text-xs font-bold text-rose-700 bg-rose-50 px-2.5 py-1 rounded-md border border-rose-200 shrink-0">
                Critical Aging
              </span>
            </div>

            {topCriticalDelay.length === 0 ? (
              <div className="py-6 text-center text-xs text-[#334155] font-semibold">
                No delayed ongoing takeout units found for current filters.
              </div>
            ) : (
              <div className="space-y-2.5">
                {topCriticalDelay.map((proj) => (
                  <div
                    key={proj.name}
                    onClick={() =>
                      onNavigateToDirectory({
                        project: proj.name,
                        unitsStatus: 'ONGOING',
                        folderStatus: 'TAKEN OUT',
                      })
                    }
                    className="p-3 bg-slate-50 hover:bg-rose-50/50 rounded-xl border border-[#CBD5E1] hover:border-rose-300 transition-all cursor-pointer flex items-center justify-between gap-3 group"
                  >
                    <div className="min-w-0 flex items-center gap-3">
                      <span className="w-6 h-6 rounded-lg bg-rose-600 text-white text-xs font-extrabold flex items-center justify-center shrink-0 shadow-2xs">
                        #{proj.rank}
                      </span>
                      <div className="truncate">
                        <h4 className="text-xs font-bold text-[#1E293B] group-hover:text-rose-700 transition-colors truncate">
                          {proj.name}
                        </h4>
                        <div className="flex items-center gap-2 text-[11px] text-[#475569] font-medium mt-0.5">
                          <span>{proj.totalOngoing?.toLocaleString() || 0} total ongoing</span>
                          <span>•</span>
                          <span className="text-amber-700 font-bold">Avg {proj.avgDelayDays}d delay</span>
                          <span>•</span>
                          <span className="text-rose-700 font-bold">Max {proj.maxDelayDays}d</span>
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0 flex items-center gap-2">
                      <div>
                        <div className="text-sm font-extrabold font-mono text-rose-700">
                          {proj.count.toLocaleString()}
                        </div>
                        <div className="text-[10px] text-[#475569] font-semibold">delayed units</div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-rose-600 transition-transform group-hover:translate-x-0.5" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Chart: PWG Updates Breakdown directly below */}
          <div className="p-6 rounded-2xl bg-white border border-[#CBD5E1] shadow-xs">
            <HorizontalBarChart
              title="PWG Updates Breakdown"
              subtitle="Real-time field & engineering workflow status updates"
              data={analytics.pwgUpdatesDistribution}
              accentKey="ENERGIZED"
              onItemClick={(label) => {
                onNavigateToDirectory({ pwgUpdates: label });
              }}
            />
          </div>
        </div>
      </div>

      {/* 5. EXECUTIVE SUMMARY NOTES & SIGN-OFF */}
      <div className="p-5 rounded-2xl bg-white border border-[#CBD5E1] shadow-xs text-xs text-[#334155] font-semibold flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="space-y-1">
          <p className="text-[#1E293B] font-bold">
            Executive Summary Notes:
          </p>
          <p className="text-[#475569]">
            Data synced dynamically from Google Sheets (<code className="text-[#1E293B] font-bold">DATA</code> tab). Current portfolio reflects {analytics.totalUnits.toLocaleString()} units with an overall energization rate of {analytics.totalUnits > 0 ? ((analytics.energizedCount / analytics.totalUnits) * 100).toFixed(1) : '0'}%.
          </p>
        </div>
        <div className="text-right shrink-0">
          <div className="text-[11px] text-[#475569]">Power-Water Group (PWG)</div>
          <div className="text-xs font-extrabold text-[#1E293B]">Project Monitoring System</div>
        </div>
      </div>
    </div>
  );
};
