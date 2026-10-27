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
import {
  AnalyticsData,
  SummaryData,
  FilterState,
  SheetRecord,
  DrilldownData,
  DrilldownTarget,
} from '../lib/types';
import { fetchDrilldown } from '../lib/api';
import { HorizontalBarChart } from './charts/HorizontalBarChart';
import { CumulativeWeeklyKpiMatrix } from './CumulativeWeeklyKpiMatrix';
import { DashboardDrilldownModal } from './DashboardDrilldownModal';

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
  onSelectRecord,
}) => {
  const reportRef = useRef<HTMLDivElement>(null);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [pdfOrientation, setPdfOrientation] = useState<'landscape' | 'portrait'>('landscape');
  const [pdfKpiScope, setPdfKpiScope] = useState<'live' | 'all'>('live');
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [showCustomDate, setShowCustomDate] = useState(filters.datePreset === 'custom');

  // Drilldown state
  const [activeDrilldown, setActiveDrilldown] = useState<DrilldownData | null>(null);
  const [isLoadingDrilldown, setIsLoadingDrilldown] = useState(false);
  const [drilldownError, setDrilldownError] = useState<string | null>(null);

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
      <div className="p-8 sm:p-12 text-center text-[#334155] font-semibold bg-white rounded-2xl border border-[#CBD5E1] shadow-xs">
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

  // Export PDF Handler - Clean visual PDF fitting page width & height, spanning pages cleanly with zero cut-offs
  const handleExportPDF = async (orientation: 'landscape' | 'portrait' = pdfOrientation) => {
    if (!reportRef.current) return;
    setIsExportingPdf(true);
    setPdfError(null);

    const element = reportRef.current;
    const originalScrollX = window.scrollX;
    const originalScrollY = window.scrollY;

    try {
      const [{ default: jsPDF }, { default: html2canvas }] = await Promise.all([
        import('jspdf'),
        import('html2canvas-pro'),
      ]);

      window.scrollTo(0, 0);

      // Apply printing optimization class to force clean 1400px layout with no overflow clipping or sticky overlaps
      element.classList.add('pdf-export-mode');

      // Ensure browser applies layout reflow and live week matrix rendering
      await new Promise((resolve) => setTimeout(resolve, 150));

      const targetWidth = 1400;
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        logging: false,
        backgroundColor: '#FFFFFF',
        width: targetWidth,
        windowWidth: targetWidth,
        scrollX: 0,
        scrollY: 0,
      });

      // Remove print mode immediately after canvas capture so UI is unaffected
      element.classList.remove('pdf-export-mode');
      window.scrollTo(originalScrollX, originalScrollY);

      if (!canvas || canvas.width <= 0 || canvas.height <= 0) {
        throw new Error('Canvas render failed: Invalid canvas dimensions');
      }

      const pdf = new jsPDF({
        orientation,
        unit: 'mm',
        format: 'a4',
      });

      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();

      // Margins in mm (room for running header and footer)
      const marginLeft = 10;
      const marginRight = 10;
      const marginTop = 14;
      const marginBottom = 14;

      const printableWidth = pageWidth - marginLeft - marginRight;
      const printableHeight = pageHeight - marginTop - marginBottom;

      const containerRect = element.getBoundingClientRect();
      const totalCssHeight = element.offsetHeight || (canvas.height / 2);
      const scaleFactor = printableWidth / targetWidth; // mm per CSS px
      const maxPageCssHeight = printableHeight / scaleFactor;
      const canvasScale = canvas.width / targetWidth;

      // Collect safe break points from major structural cards, section containers, and table rows
      const breakCandidates: number[] = [0];
      const breakElements = element.querySelectorAll<HTMLElement>(
        '[data-pdf-section], table tbody tr, .rounded-2xl, .rounded-xl, .grid > div'
      );

      breakElements.forEach((el) => {
        const r = el.getBoundingClientRect();
        const topY = r.top - containerRect.top;
        const bottomY = r.bottom - containerRect.top;
        if (topY > 20 && topY < totalCssHeight - 20) {
          breakCandidates.push(Math.round(topY));
        }
        if (bottomY > 20 && bottomY < totalCssHeight - 20) {
          breakCandidates.push(Math.round(bottomY));
        }
      });

      const sortedBreaks = Array.from(new Set(breakCandidates)).sort((a, b) => a - b);

      // Pre-compute page slices so we know exact totalPages in advance
      const slices: { startY: number; endY: number }[] = [];
      let currentCssY = 0;

      while (currentCssY < totalCssHeight) {
        let nextCssY = currentCssY + maxPageCssHeight;

        if (nextCssY >= totalCssHeight) {
          slices.push({ startY: currentCssY, endY: totalCssHeight });
          break;
        }

        // Look for best break between 60% and 100% of maxPageCssHeight
        const preferredBreaks = sortedBreaks.filter(
          (b) => b >= currentCssY + 0.6 * maxPageCssHeight && b <= nextCssY
        );

        let chosenBreak = nextCssY;
        if (preferredBreaks.length > 0) {
          chosenBreak = preferredBreaks[preferredBreaks.length - 1];
        } else {
          const fallbackBreaks = sortedBreaks.filter(
            (b) => b >= currentCssY + 0.4 * maxPageCssHeight && b <= nextCssY
          );
          if (fallbackBreaks.length > 0) {
            chosenBreak = fallbackBreaks[fallbackBreaks.length - 1];
          }
        }

        if (chosenBreak <= currentCssY + 15) {
          chosenBreak = nextCssY;
        }

        slices.push({ startY: currentCssY, endY: chosenBreak });
        currentCssY = chosenBreak;
      }

      const totalPages = Math.max(1, slices.length);

      // Render each slice onto the PDF pages with header and footer
      slices.forEach((slice, pageIdx) => {
        const sliceCssHeight = slice.endY - slice.startY;
        if (sliceCssHeight <= 0) return;

        // Defensive coordinate bounds checking to guarantee zero IndexSizeError exceptions
        const sourceY = Math.min(canvas.height - 1, Math.max(0, Math.round(slice.startY * canvasScale)));
        const sourceHeight = Math.min(canvas.height - sourceY, Math.max(1, Math.round(sliceCssHeight * canvasScale)));

        if (sourceHeight <= 0) return;

        const pageCanvas = document.createElement('canvas');
        pageCanvas.width = canvas.width;
        pageCanvas.height = sourceHeight;
        const pageCtx = pageCanvas.getContext('2d');

        if (!pageCtx) return;

        pageCtx.drawImage(
          canvas,
          0,
          sourceY,
          canvas.width,
          sourceHeight,
          0,
          0,
          canvas.width,
          sourceHeight
        );

        const pageImgData = pageCanvas.toDataURL('image/png');
        const renderMmHeight = Math.min(printableHeight, (sourceHeight / canvasScale) * scaleFactor);

        if (pageIdx > 0) {
          pdf.addPage();
        }

        // Add page image
        pdf.addImage(
          pageImgData,
          'PNG',
          marginLeft,
          marginTop,
          printableWidth,
          renderMmHeight,
          undefined,
          'FAST'
        );

        // Professional Running Header
        pdf.setFontSize(8);
        pdf.setTextColor(100, 116, 139); // slate-500
        pdf.text('POWER-WATER GROUP (PWG) • EXECUTIVE MANAGEMENT REPORT', marginLeft, marginTop - 4);
        pdf.text(reportDate, pageWidth - marginRight, marginTop - 4, { align: 'right' });
        pdf.setDrawColor(203, 213, 225); // slate-300
        pdf.setLineWidth(0.3);
        pdf.line(marginLeft, marginTop - 2, pageWidth - marginRight, marginTop - 2);

        // Professional Running Footer
        const footerY = pageHeight - marginBottom + 5;
        pdf.line(marginLeft, footerY - 2, pageWidth - marginRight, footerY - 2);
        pdf.setFontSize(8);
        pdf.setTextColor(100, 116, 139);
        pdf.text('OFFICIAL & CONFIDENTIAL REPORT • POWER-WATER GROUP', marginLeft, footerY + 2);
        pdf.text(`Page ${pageIdx + 1} of ${totalPages}`, pageWidth - marginRight, footerY + 2, { align: 'right' });
      });

      const dateStr = new Date().toISOString().split('T')[0];
      pdf.save(`Executive_Management_Report_${dateStr}.pdf`);
    } catch (err: any) {
      console.error('Failed to export PDF:', err);
      setPdfError(err?.message || 'Failed to export PDF. Please try again.');
    } finally {
      if (reportRef.current) {
        reportRef.current.classList.remove('pdf-export-mode');
      }
      setIsExportingPdf(false);
    }
  };

  return (
    <div ref={reportRef} className="space-y-4 sm:space-y-6">
      {/* PDF Export Error Banner */}
      {pdfError && (
        <div
          data-pdf-hide="true"
          className="bg-rose-50 border border-rose-300 rounded-xl p-3 sm:p-4 text-rose-800 flex items-center justify-between gap-3 shadow-xs"
        >
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
            <div className="text-xs sm:text-sm font-semibold">
              <span className="font-bold">PDF Generation Error:</span> {pdfError}
            </div>
          </div>
          <button
            onClick={() => setPdfError(null)}
            className="text-xs font-bold text-rose-700 hover:text-rose-900 bg-rose-100 hover:bg-rose-200 px-2.5 py-1 rounded-md transition-colors cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* 1. EXECUTIVE REPORT HEADER (Top) */}
      <div
        data-pdf-section="header"
        className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-6 md:p-7 border border-[#CBD5E1] shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4"
      >
        <div>
          <div className="flex items-center gap-2 sm:gap-2.5 flex-wrap">
            <span className="p-1.5 sm:p-2 rounded-lg sm:rounded-xl bg-[#2563EB]/10 text-[#2563EB] border border-[#2563EB]/20">
              <FileText className="w-4 h-4 sm:w-5 sm:h-5" />
            </span>
            <h2 className="text-lg sm:text-xl md:text-2xl font-extrabold text-[#1E293B] tracking-tight">
              Executive Management Report
            </h2>
            <span className="px-2 py-0.5 text-[10px] sm:text-xs font-bold bg-[#1E293B] text-white rounded-md">
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

        {/* Action Buttons: Export CSV & Download PDF */}
        <div data-pdf-hide="true" className="flex items-center gap-2 sm:gap-2.5 flex-wrap">
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 bg-slate-100 hover:bg-slate-200 text-[#1E293B] border border-[#CBD5E1] rounded-xl text-xs font-bold transition-all shadow-xs hover:shadow-sm cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#2563EB]" />
            <span>Export CSV</span>
          </button>

          {/* Orientation Selector */}
          <div className="flex items-center bg-slate-100 border border-[#CBD5E1] rounded-xl p-1 text-xs font-bold">
            <button
              type="button"
              onClick={() => setPdfOrientation('landscape')}
              className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                pdfOrientation === 'landscape'
                  ? 'bg-white text-[#2563EB] shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Landscape orientation (Recommended for wide weekly matrices)"
            >
              Landscape
            </button>
            <button
              type="button"
              onClick={() => setPdfOrientation('portrait')}
              className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                pdfOrientation === 'portrait'
                  ? 'bg-white text-[#2563EB] shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Portrait orientation"
            >
              Portrait
            </button>
          </div>

          {/* PDF KPI Weeks Scope Selector */}
          <div className="flex items-center bg-slate-100 border border-[#CBD5E1] rounded-xl p-1 text-xs font-bold">
            <button
              type="button"
              onClick={() => setPdfKpiScope('live')}
              className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                pdfKpiScope === 'live'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="View Live Portion of weeks (Recommended for updated PDF report)"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
              <span>Live Weeks</span>
            </button>
            <button
              type="button"
              onClick={() => setPdfKpiScope('all')}
              className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                pdfKpiScope === 'all'
                  ? 'bg-[#1E293B] text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="View all reporting weeks"
            >
              <span>All Weeks</span>
            </button>
          </div>

          <button
            onClick={() => handleExportPDF(pdfOrientation)}
            disabled={isExportingPdf}
            className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 bg-[#2563EB] hover:bg-[#1d4ed8] text-white rounded-xl text-xs font-bold transition-all shadow-xs hover:shadow-sm cursor-pointer disabled:opacity-50"
          >
            {isExportingPdf ? (
              <RotateCw className="w-3.5 h-3.5 sm:w-4 sm:h-4 animate-spin text-white" />
            ) : (
              <FileDown className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white" />
            )}
            <span>{isExportingPdf ? 'Generating PDF...' : 'Download PDF'}</span>
          </button>
        </div>
      </div>

      {/* 2. FILTER MANAGEMENT REPORT */}
      <div
        data-pdf-section="filters"
        className="bg-[#1E293B] rounded-xl sm:rounded-2xl p-3.5 sm:p-5 border border-[#CBD5E1] shadow-xs space-y-3 sm:space-y-4"
      >
        <div className="flex items-center justify-between pb-2.5 sm:pb-3 border-b border-[#475569] flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <span className="p-1 rounded-md bg-[#2563EB] text-white">
              <Filter className="w-3.5 h-3.5" />
            </span>
            <span className="text-xs font-extrabold text-white uppercase tracking-wide">
              Filter Management Report
            </span>
            {activeFilterCount > 0 && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#2563EB] text-white">
                {activeFilterCount} Active
              </span>
            )}
          </div>

          <div className="flex items-center gap-3">
            {activeFilterCount > 0 && (
              <button
                onClick={onResetFilters}
                data-pdf-hide="true"
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-rose-200 hover:bg-rose-950/40 rounded-xl transition-colors cursor-pointer border border-rose-400/40"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset Filters</span>
              </button>
            )}
          </div>
        </div>

        {/* Filter Dropdowns Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2.5 sm:gap-3">
          {/* Area */}
          <div>
            <label className="block text-xs font-bold text-white mb-1">
              Area
            </label>
            <select
              value={filters.area}
              onChange={(e) => onFilterChange({ area: e.target.value })}
              className="w-full py-2 px-2.5 bg-[#0F172A] border border-[#CBD5E1]/40 rounded-xl text-xs font-bold text-white focus:outline-hidden focus:border-[#2563EB] focus:ring-2 focus:ring-blue-500/30 transition-all truncate"
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
            <label className="block text-xs font-bold text-white mb-1">
              Project
            </label>
            <select
              value={filters.project}
              onChange={(e) => onFilterChange({ project: e.target.value })}
              className="w-full py-2 px-2.5 bg-[#0F172A] border border-[#CBD5E1]/40 rounded-xl text-xs font-bold text-white focus:outline-hidden focus:border-[#2563EB] focus:ring-2 focus:ring-blue-500/30 transition-all truncate"
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
            <label className="block text-xs font-bold text-white mb-1">
              In Charge
            </label>
            <select
              value={filters.incharge}
              onChange={(e) => onFilterChange({ incharge: e.target.value })}
              className="w-full py-2 px-2.5 bg-[#0F172A] border border-[#CBD5E1]/40 rounded-xl text-xs font-bold text-white focus:outline-hidden focus:border-[#2563EB] focus:ring-2 focus:ring-blue-500/30 transition-all truncate"
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
            <label className="block text-xs font-bold text-white mb-1">
              Folder Status
            </label>
            <select
              value={filters.folderStatus}
              onChange={(e) => onFilterChange({ folderStatus: e.target.value })}
              className="w-full py-2 px-2.5 bg-[#0F172A] border border-[#CBD5E1]/40 rounded-xl text-xs font-bold text-white focus:outline-hidden focus:border-[#2563EB] focus:ring-2 focus:ring-blue-500/30 transition-all truncate"
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
            <label className="block text-xs font-bold text-white mb-1">
              Unit Status
            </label>
            <select
              value={filters.unitsStatus}
              onChange={(e) => onFilterChange({ unitsStatus: e.target.value })}
              className="w-full py-2 px-2.5 bg-[#0F172A] border border-[#CBD5E1]/40 rounded-xl text-xs font-bold text-white focus:outline-hidden focus:border-[#2563EB] focus:ring-2 focus:ring-blue-500/30 transition-all"
            >
              <option value="" className="bg-[#0F172A] text-white">All Statuses</option>
              {distinct.unitsStatuses.map((s) => (
                <option key={s} value={s} className="bg-[#0F172A] text-white">
                  {s}
                </option>
              ))}
            </select>
          </div>

          {/* Date Range Picker */}
          <div>
            <label className="block text-xs font-bold text-white mb-1 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-[#38bdf8]" />
              <span>Date Range</span>
            </label>
            <select
              value={filters.datePreset || 'all'}
              onChange={(e) => handleDatePresetChange(e.target.value)}
              className="w-full py-2 px-2.5 bg-[#0F172A] border border-[#CBD5E1]/40 rounded-xl text-xs font-bold text-white focus:outline-hidden focus:border-[#2563EB] focus:ring-2 focus:ring-blue-500/30 transition-all"
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
          <div className="flex items-center gap-3 pt-2.5 text-xs border-t border-[#475569] flex-wrap">
            <span className="text-xs text-white font-bold">Custom Range:</span>
            <input
              type="date"
              value={filters.startDate || ''}
              onChange={(e) => onFilterChange({ startDate: e.target.value, datePreset: 'custom' })}
              className="py-1 px-2.5 bg-[#0F172A] border border-[#CBD5E1]/40 rounded-lg text-xs font-bold text-white"
            />
            <span className="text-[#CBD5E1] font-bold">to</span>
            <input
              type="date"
              value={filters.endDate || ''}
              onChange={(e) => onFilterChange({ endDate: e.target.value, datePreset: 'custom' })}
              className="py-1 px-2.5 bg-[#0F172A] border border-[#CBD5E1]/40 rounded-lg text-xs font-bold text-white"
            />
          </div>
        )}
      </div>

      {/* 3. KPI SUMMARY CARDS WITH VISUAL DRILLDOWN */}
      <div
        data-pdf-section="kpi-cards"
        className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 sm:gap-4"
      >
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

        {/* Energized */}
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

        {/* Taken Out */}
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

        {/* Priority Move-In */}
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

      {/* 4. MAIN DASHBOARD: CUMULATIVE WEEKLY KPI MATRIX */}
      <div data-pdf-section="matrix">
        <CumulativeWeeklyKpiMatrix
          filters={filters}
          forceWeekScope={isExportingPdf ? pdfKpiScope : undefined}
          onDrilldown={(kpi) =>
            handleOpenDrilldown({
              category: 'kpiRemarks',
              value: kpi,
              label: `KPI Remark: ${kpi}`,
            })
          }
        />
      </div>

      {/* 5. 2-COLUMN SECTION: Top Projects & Breakdown Charts */}
      <div
        data-pdf-section="analytics-grid"
        className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 items-start"
      >
        {/* LEFT COLUMN: Top 6 Within 21 Days Projects & KPI Remarks Distribution */}
        <div className="space-y-4 sm:space-y-6">
          {/* Card: Top 6 ENERGIZED- 1.WITHIN 21 DAYS Project */}
          <div className="p-4 sm:p-6 rounded-xl sm:rounded-2xl bg-white border border-[#CBD5E1] shadow-xs">
            <div className="flex items-center justify-between pb-3 border-b border-[#CBD5E1] mb-3 sm:mb-4 gap-2">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-blue-50 text-[#2563EB] border border-blue-200">
                  <CheckCircle2 className="w-4 h-4" />
                </span>
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-[#1E293B] tracking-tight">
                    Top 6 ENERGIZED- 1.WITHIN 21 DAYS Projects
                  </h3>
                  <p className="text-[11px] sm:text-xs text-[#334155] font-semibold mt-0.5">
                    Highest volume projects meeting 21-day turnaround target
                  </p>
                </div>
              </div>
              <span className="text-[11px] sm:text-xs font-bold text-[#2563EB] bg-blue-50 px-2 sm:px-2.5 py-1 rounded-md border border-blue-200 shrink-0">
                {analytics.within21DaysCount.toLocaleString()} Units
              </span>
            </div>

            {topWithin21.length === 0 ? (
              <div className="py-6 text-center text-xs text-[#334155] font-semibold">
                No within 21-day energization records found for current filters.
              </div>
            ) : (
              <div className="space-y-2 sm:space-y-2.5">
                {topWithin21.map((proj) => (
                  <div
                    key={proj.name}
                    onClick={() =>
                      handleOpenDrilldown({
                        category: 'project',
                        value: proj.name,
                        label: `${proj.name} - Within 21 Days Energized`,
                        unitsStatus: 'ENERGIZED',
                        metric: 'within21days',
                      })
                    }
                    className="p-2.5 sm:p-3 bg-slate-50 hover:bg-blue-50/50 rounded-xl border border-[#CBD5E1] hover:border-blue-300 transition-all cursor-pointer flex items-center justify-between gap-2.5 sm:gap-3 group"
                  >
                    <div className="min-w-0 flex items-center gap-2.5 sm:gap-3">
                      <span className="w-5 h-5 sm:w-6 sm:h-6 rounded-lg bg-[#2563EB] text-white text-[11px] sm:text-xs font-extrabold flex items-center justify-center shrink-0 shadow-2xs">
                        #{proj.rank}
                      </span>
                      <div className="truncate">
                        <h4 className="text-xs font-bold text-[#1E293B] group-hover:text-[#2563EB] transition-colors truncate">
                          {proj.name}
                        </h4>
                        <div className="flex items-center gap-1.5 sm:gap-2 text-[10px] sm:text-[11px] text-[#475569] font-medium mt-0.5">
                          <span>{proj.totalEnergized?.toLocaleString() || 0} energized</span>
                          <span>•</span>
                          <span className="text-[#2563EB] font-bold">{proj.percentage}% SLA</span>
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0 flex items-center gap-1.5 sm:gap-2">
                      <div>
                        <div className="text-xs sm:text-sm font-extrabold font-mono text-[#2563EB]">
                          {proj.count.toLocaleString()}
                        </div>
                        <div className="text-[9px] sm:text-[10px] text-[#475569] font-semibold">within 21d</div>
                      </div>
                      <ChevronRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-400 group-hover:text-[#2563EB] transition-transform group-hover:translate-x-0.5" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Chart: KPI Remarks Distribution directly below */}
          <div className="p-4 sm:p-6 rounded-xl sm:rounded-2xl bg-white border border-[#CBD5E1] shadow-xs">
            <HorizontalBarChart
              title="KPI Remarks Distribution"
              subtitle="Categorized performance and turnaround timeframe analysis (Click to drill down)"
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
        </div>

        {/* RIGHT COLUMN: Top 6 Critical Delay Projects & PWG Updates Breakdown */}
        <div className="space-y-4 sm:space-y-6">
          {/* Card: Top 6 Critical Ongoing delay project from the takeout date */}
          <div className="p-4 sm:p-6 rounded-xl sm:rounded-2xl bg-white border border-[#CBD5E1] shadow-xs">
            <div className="flex items-center justify-between pb-3 border-b border-[#CBD5E1] mb-3 sm:mb-4 gap-2">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-rose-50 text-rose-700 border border-rose-200">
                  <AlertTriangle className="w-4 h-4 text-rose-600" />
                </span>
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-[#1E293B] tracking-tight">
                    Top 6 Critical Ongoing Delay Projects
                  </h3>
                  <p className="text-[11px] sm:text-xs text-[#334155] font-semibold mt-0.5">
                    Ongoing units with longest elapsed days since takeout date
                  </p>
                </div>
              </div>
              <span className="text-[11px] sm:text-xs font-bold text-rose-700 bg-rose-50 px-2 sm:px-2.5 py-1 rounded-md border border-rose-200 shrink-0">
                Critical Aging
              </span>
            </div>

            {topCriticalDelay.length === 0 ? (
              <div className="py-6 text-center text-xs text-[#334155] font-semibold">
                No delayed ongoing takeout units found for current filters.
              </div>
            ) : (
              <div className="space-y-2 sm:space-y-2.5">
                {topCriticalDelay.map((proj) => (
                  <div
                    key={proj.name}
                    onClick={() =>
                      handleOpenDrilldown({
                        category: 'project',
                        value: proj.name,
                        label: `${proj.name} - Critical Ongoing Delayed`,
                        unitsStatus: 'ONGOING',
                      })
                    }
                    className="p-2.5 sm:p-3 bg-slate-50 hover:bg-rose-50/50 rounded-xl border border-[#CBD5E1] hover:border-rose-300 transition-all cursor-pointer flex items-center justify-between gap-2.5 sm:gap-3 group"
                  >
                    <div className="min-w-0 flex items-center gap-2.5 sm:gap-3">
                      <span className="w-5 h-5 sm:w-6 sm:h-6 rounded-lg bg-rose-600 text-white text-[11px] sm:text-xs font-extrabold flex items-center justify-center shrink-0 shadow-2xs">
                        #{proj.rank}
                      </span>
                      <div className="truncate">
                        <h4 className="text-xs font-bold text-[#1E293B] group-hover:text-rose-700 transition-colors truncate">
                          {proj.name}
                        </h4>
                        <div className="flex items-center gap-1.5 sm:gap-2 text-[10px] sm:text-[11px] text-[#475569] font-medium mt-0.5">
                          <span>{proj.totalOngoing?.toLocaleString() || 0} ongoing</span>
                          <span>•</span>
                          <span className="text-amber-700 font-bold">Avg {proj.avgDelayDays}d</span>
                          <span>•</span>
                          <span className="text-rose-700 font-bold">Max {proj.maxDelayDays}d</span>
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0 flex items-center gap-1.5 sm:gap-2">
                      <div>
                        <div className="text-xs sm:text-sm font-extrabold font-mono text-rose-700">
                          {proj.count.toLocaleString()}
                        </div>
                        <div className="text-[9px] sm:text-[10px] text-[#475569] font-semibold">delayed</div>
                      </div>
                      <ChevronRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-400 group-hover:text-rose-600 transition-transform group-hover:translate-x-0.5" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Chart: PWG Updates Breakdown directly below */}
          <div className="p-4 sm:p-6 rounded-xl sm:rounded-2xl bg-white border border-[#CBD5E1] shadow-xs">
            <HorizontalBarChart
              title="PWG Updates Breakdown"
              subtitle="Real-time field & engineering workflow status updates (Click to drill down)"
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
      </div>

      {/* 6. EXECUTIVE SUMMARY NOTES & SIGN-OFF */}
      <div
        data-pdf-section="notes"
        className="p-4 sm:p-5 rounded-xl sm:rounded-2xl bg-white border border-[#CBD5E1] shadow-xs text-xs text-[#334155] font-semibold flex flex-col sm:flex-row sm:items-center justify-between gap-3"
      >
        <div className="space-y-1">
          <p className="text-[#1E293B] font-bold">
            Executive Summary Notes:
          </p>
          <p className="text-[#475569]">
            Data synced dynamically from Google Sheets (<code className="text-[#1E293B] font-bold">DATA</code> tab). Current portfolio reflects {analytics.totalUnits.toLocaleString()} units with an overall energization rate of {analytics.totalUnits > 0 ? ((analytics.energizedCount / analytics.totalUnits) * 100).toFixed(1) : '0'}%.
          </p>
        </div>
        <div className="text-left sm:text-right shrink-0">
          <div className="text-[11px] text-[#475569]">Power-Water Group (PWG)</div>
          <div className="text-xs font-extrabold text-[#1E293B]">Project Monitoring System</div>
        </div>
      </div>

      {/* 7. VISUAL INTERACTIVE DRILLDOWN MODAL */}
      <DashboardDrilldownModal
        drilldown={activeDrilldown}
        isLoading={isLoadingDrilldown}
        error={drilldownError}
        filters={filters}
        onClose={() => setActiveDrilldown(null)}
        onSelectRecord={(record) => {
          if (onSelectRecord) onSelectRecord(record);
        }}
        onOpenInDirectory={(drillFilterUpdates) => {
          setActiveDrilldown(null);
          onNavigateToDirectory(drillFilterUpdates);
        }}
      />
    </div>
  );
};
