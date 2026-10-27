import React, { useState } from 'react';
import {
  X,
  Download,
  Users,
  Building,
  CheckCircle2,
  FileSpreadsheet,
  Layers,
  ArrowUpRight,
  RotateCw,
  Search,
  Eye,
  Filter,
} from 'lucide-react';
import { DrilldownData, FilterState, SheetRecord } from '../lib/types';
import { exportFilteredCSV } from '../lib/api';

interface DashboardDrilldownModalProps {
  drilldown: DrilldownData | null;
  isLoading: boolean;
  error: string | null;
  filters: FilterState;
  onClose: () => void;
  onSelectRecord: (record: SheetRecord) => void;
  onOpenInDirectory: (drillFilterUpdates: Partial<FilterState>) => void;
}

type DrillTab = 'overview' | 'incharge' | 'project' | 'kpiRemarks' | 'pwgUpdates' | 'units';

export const DashboardDrilldownModal: React.FC<DashboardDrilldownModalProps> = ({
  drilldown,
  isLoading,
  error,
  filters,
  onClose,
  onSelectRecord,
  onOpenInDirectory,
}) => {
  const [activeTab, setActiveTab] = useState<DrillTab>('overview');
  const [isExporting, setIsExporting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  if (!drilldown && !isLoading && !error) return null;

  const handleExportCSV = async () => {
    if (!drilldown) return;
    setIsExporting(true);
    try {
      const sanitizedName = (drilldown.title || 'drilldown').toLowerCase().replace(/[^a-z0-9]/g, '_');
      await exportFilteredCSV(
        filters,
        drilldown.drillFilterParams,
        `drilldown_${sanitizedName}`
      );
    } catch (err) {
      console.error('Failed to export drilldown CSV:', err);
    } finally {
      setIsExporting(false);
    }
  };

  const handleApplyToDirectory = () => {
    if (!drilldown) return;
    const target = drilldown.target;
    const updates: Partial<FilterState> = {};

    if (target.category === 'kpiRemarks') {
      updates.search = target.value;
    } else if (target.category === 'project') {
      updates.project = target.value;
    } else if (target.category === 'pwgUpdates') {
      updates.pwgUpdates = target.value;
    } else if (target.category === 'kpiCard' || target.category === 'verticalComparison') {
      if (target.value === 'energized') updates.unitsStatus = 'ENERGIZED';
      else if (target.value === 'ongoing') updates.unitsStatus = 'ONGOING';
      else if (target.value === 'nys') updates.unitsStatus = 'NYS';
      else if (target.value === 'takenOut') updates.folderStatus = 'TAKEN OUT';
      else if (target.value === 'priority') updates.priorityMoveIn = 'PRIORITY';
      else if (target.value === 'within21Days') {
        updates.unitsStatus = 'ENERGIZED';
        updates.search = 'WITHIN 21 DAYS';
      }
    } else if (target.category === 'monthlyTrend') {
      if (target.metric === 'takenOut') updates.folderStatus = 'TAKEN OUT';
      else if (target.metric === 'within21Days') {
        updates.unitsStatus = 'ENERGIZED';
        updates.search = 'WITHIN 21 DAYS';
      } else {
        updates.unitsStatus = 'ENERGIZED';
      }
    } else if (target.category === 'facStatus') {
      updates.search = target.value;
    } else if (target.category === 'cooStatus') {
      updates.search = target.value;
    } else if (target.category === 'sepStatus') {
      updates.search = target.value;
    } else if (target.category === 'inchargeStatus') {
      updates.incharge = target.value;
      if (target.metric === 'energized' || target.metric === 'energized_other') updates.unitsStatus = 'ENERGIZED';
      else if (target.metric === 'ongoing') updates.unitsStatus = 'ONGOING';
      else if (target.metric === 'nys') updates.unitsStatus = 'NYS';
      else if (target.metric === 'takenout') updates.folderStatus = 'TAKEN OUT';
      else if (target.metric === 'within21days') {
        updates.unitsStatus = 'ENERGIZED';
        updates.search = 'WITHIN 21 DAYS';
      }
    }

    onOpenInDirectory(updates);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-1.5 sm:p-3 md:p-6 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-5xl bg-white rounded-xl sm:rounded-2xl shadow-2xl border border-[#CBD5E1] flex flex-col max-h-[96vh] sm:max-h-[92vh] overflow-hidden">
        {/* Header - Slate #1E293B with text #FFFFFF */}
        <div className="bg-[#1E293B] text-white px-3.5 py-3 sm:px-6 sm:py-4 flex items-center justify-between border-b border-[#CBD5E1]/30 shrink-0 gap-2">
          <div className="flex items-center gap-2.5 sm:gap-3.5 min-w-0">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-[#0F172A] border border-[#CBD5E1]/30 flex items-center justify-center shrink-0">
              <Layers className="w-4 h-4 sm:w-5 sm:h-5 text-[#38bdf8]" />
            </div>
            <div className="truncate min-w-0">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-slate-300 bg-white/10 px-1.5 sm:px-2 py-0.5 rounded-full">
                  Visual Drill-Down
                </span>
                <span className="text-xs text-slate-300 hidden sm:inline">•</span>
                <span className="text-xs text-slate-300 truncate hidden md:inline">
                  Interactive Breakdown Analysis
                </span>
              </div>
              <h2 className="text-sm sm:text-base md:text-lg font-bold text-white truncate mt-0.5">
                {drilldown?.title || 'Loading breakdown...'}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
            {drilldown && (
              <button
                onClick={handleExportCSV}
                disabled={isExporting}
                title="Export this drilled-down subset directly as CSV"
                className="flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-lg sm:rounded-xl bg-[#2563EB] hover:bg-[#1d4ed8] text-white text-[11px] sm:text-xs font-bold shadow-xs transition-all cursor-pointer disabled:opacity-50"
              >
                {isExporting ? (
                  <RotateCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Download className="w-3.5 h-3.5" />
                )}
                <span className="hidden xs:inline sm:inline">Export CSV</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="p-1 sm:p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Breakdown Subtitle & Metrics Bar */}
        {drilldown && (
          <div className="bg-[#F8FAFC] px-3 sm:px-5 py-2 sm:py-2.5 border-b border-[#CBD5E1] flex flex-wrap items-center justify-between gap-2 text-[11px] sm:text-xs shrink-0">
            <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
              <div className="flex items-center gap-1.5">
                <span className="text-[#1E293B] font-bold">Total in Visual:</span>
                <span className="font-mono font-extrabold text-[#2563EB] bg-blue-100 px-2 py-0.5 rounded text-[11px] sm:text-xs border border-blue-300">
                  {drilldown.totalUnits.toLocaleString()} units
                </span>
              </div>
              <span className="text-[#CBD5E1] font-bold hidden sm:inline">•</span>
              <span className="text-[#334155] font-semibold truncate hidden lg:inline max-w-sm">
                {drilldown.subtitle}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleApplyToDirectory}
                className="inline-flex items-center gap-1 text-[11px] sm:text-xs font-bold text-[#2563EB] hover:underline cursor-pointer"
              >
                <span>View all in Directory</span>
                <ArrowUpRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Tab Navigation with Slate & #2563EB active theme */}
        <div className="px-2.5 sm:px-5 pt-2 sm:pt-3 border-b border-[#CBD5E1] flex gap-1 sm:gap-2 overflow-x-auto text-[11px] sm:text-xs shrink-0 scrollbar-none bg-white">
          <button
            onClick={() => setActiveTab('overview')}
            className={`pb-2.5 px-3 font-extrabold border-b-2 transition-colors cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'overview'
                ? 'border-[#2563EB] text-[#2563EB]'
                : 'border-transparent text-[#334155] font-semibold hover:text-[#1E293B]'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Overview (All 4 Dimensions)</span>
          </button>

          <button
            onClick={() => setActiveTab('incharge')}
            className={`pb-2.5 px-3 font-extrabold border-b-2 transition-colors cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'incharge'
                ? 'border-[#2563EB] text-[#2563EB]'
                : 'border-transparent text-[#334155] font-semibold hover:text-[#1E293B]'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>In Charge ({drilldown?.inchargeBreakdown.length || 0})</span>
          </button>

          <button
            onClick={() => setActiveTab('project')}
            className={`pb-2.5 px-3 font-extrabold border-b-2 transition-colors cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'project'
                ? 'border-[#2563EB] text-[#2563EB]'
                : 'border-transparent text-[#334155] font-semibold hover:text-[#1E293B]'
            }`}
          >
            <Building className="w-3.5 h-3.5" />
            <span>Project ({drilldown?.projectBreakdown.length || 0})</span>
          </button>

          <button
            onClick={() => setActiveTab('kpiRemarks')}
            className={`pb-2.5 px-3 font-extrabold border-b-2 transition-colors cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'kpiRemarks'
                ? 'border-[#2563EB] text-[#2563EB]'
                : 'border-transparent text-[#334155] font-semibold hover:text-[#1E293B]'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>KPI Remarks ({drilldown?.kpiRemarksBreakdown.length || 0})</span>
          </button>

          <button
            onClick={() => setActiveTab('pwgUpdates')}
            className={`pb-2.5 px-3 font-extrabold border-b-2 transition-colors cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'pwgUpdates'
                ? 'border-[#2563EB] text-[#2563EB]'
                : 'border-transparent text-[#334155] font-semibold hover:text-[#1E293B]'
            }`}
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>PWG Updates ({drilldown?.pwgUpdatesBreakdown.length || 0})</span>
          </button>

          <button
            onClick={() => setActiveTab('units')}
            className={`pb-2.5 px-3 font-extrabold border-b-2 transition-colors cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'units'
                ? 'border-[#2563EB] text-[#2563EB]'
                : 'border-transparent text-[#334155] font-semibold hover:text-[#1E293B]'
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Sample Units Preview</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {isLoading ? (
            <div className="p-12 text-center space-y-3">
              <RotateCw className="w-8 h-8 text-[#056CF2] animate-spin mx-auto" />
              <p className="text-sm font-semibold text-[#1E293B]">
                Computing visual drill-down breakdown...
              </p>
              <p className="text-xs text-[#334155] font-semibold">Aggregating In charge, Project, KPI Remarks & PWG Updates</p>
            </div>
          ) : error ? (
            <div className="p-8 text-center text-rose-500 text-sm">
              <p className="font-semibold">Failed to load drill-down</p>
              <p className="text-xs mt-1 text-slate-500">{error}</p>
            </div>
          ) : !drilldown ? null : (
            <>
              {/* TAB 1: OVERVIEW - 4 Dimensions Grid */}
              {activeTab === 'overview' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {/* 1. In Charge Breakdown Card */}
                  <div className="p-4 rounded-xl bg-white border border-[#CBD5E1] shadow-xs">
                    <div className="flex items-center justify-between mb-3 pb-2 border-b border-[#CBD5E1]">
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-[#2563EB]" />
                        <h4 className="text-xs font-extrabold text-[#1E293B] uppercase tracking-wider">
                          In Charge Breakdown
                        </h4>
                      </div>
                      <button
                        onClick={() => setActiveTab('incharge')}
                        className="text-xs font-bold text-[#2563EB] hover:underline cursor-pointer"
                      >
                        View All
                      </button>
                    </div>
                    <div className="space-y-2.5">
                      {drilldown.inchargeBreakdown.slice(0, 5).map((item) => (
                        <div key={item.label} className="text-xs">
                          <div className="flex justify-between items-center mb-1">
                            <span className="font-bold text-[#1E293B] truncate pr-2">
                              {item.label}
                            </span>
                            <span className="font-mono text-xs shrink-0 text-[#334155] font-semibold">
                              <strong className="text-[#1E293B] font-extrabold">{item.count.toLocaleString()}</strong> ({item.percentage}%)
                            </span>
                          </div>
                          {/* Progress bar green */}
                          <div className="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden p-0.5">
                            <div
                              className="bg-emerald-600 h-full rounded-full"
                              style={{ width: `${Math.min(100, item.percentage)}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* 2. Project Breakdown Card */}
                  <div className="p-4 rounded-xl bg-white border border-[#CBD5E1] shadow-xs">
                    <div className="flex items-center justify-between mb-3 pb-2 border-b border-[#CBD5E1]">
                      <div className="flex items-center gap-2">
                        <Building className="w-4 h-4 text-[#2563EB]" />
                        <h4 className="text-xs font-extrabold text-[#1E293B] uppercase tracking-wider">
                          Project Breakdown
                        </h4>
                      </div>
                      <button
                        onClick={() => setActiveTab('project')}
                        className="text-xs font-bold text-[#2563EB] hover:underline cursor-pointer"
                      >
                        View All
                      </button>
                    </div>
                    <div className="space-y-2.5">
                      {drilldown.projectBreakdown.slice(0, 5).map((item) => (
                        <div key={item.label} className="text-xs">
                          <div className="flex justify-between items-center mb-1">
                            <span className="font-bold text-[#1E293B] truncate pr-2">
                              {item.label}
                            </span>
                            <span className="font-mono text-xs shrink-0 text-[#334155] font-semibold">
                              <strong className="text-[#1E293B] font-extrabold">{item.count.toLocaleString()}</strong> ({item.percentage}%)
                            </span>
                          </div>
                          {/* Progress bar green */}
                          <div className="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden p-0.5">
                            <div
                              className="bg-emerald-600 h-full rounded-full"
                              style={{ width: `${Math.min(100, item.percentage)}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* 3. KPI Remarks Breakdown Card */}
                  <div className="p-4 rounded-xl bg-white border border-[#CBD5E1] shadow-xs">
                    <div className="flex items-center justify-between mb-3 pb-2 border-b border-[#CBD5E1]">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-[#2563EB]" />
                        <h4 className="text-xs font-extrabold text-[#1E293B] uppercase tracking-wider">
                          KPI Remarks Breakdown
                        </h4>
                      </div>
                      <button
                        onClick={() => setActiveTab('kpiRemarks')}
                        className="text-xs font-bold text-[#2563EB] hover:underline cursor-pointer"
                      >
                        View All
                      </button>
                    </div>
                    <div className="space-y-2.5">
                      {drilldown.kpiRemarksBreakdown.slice(0, 5).map((item) => (
                        <div key={item.label} className="text-xs">
                          <div className="flex justify-between items-center mb-1">
                            <span className="font-bold text-[#1E293B] truncate pr-2">
                              {item.label}
                            </span>
                            <span className="font-mono text-xs shrink-0 text-[#334155] font-semibold">
                              <strong className="text-[#1E293B] font-extrabold">{item.count.toLocaleString()}</strong> ({item.percentage}%)
                            </span>
                          </div>
                          {/* Progress bar green */}
                          <div className="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden p-0.5">
                            <div
                              className="bg-emerald-600 h-full rounded-full"
                              style={{ width: `${Math.min(100, item.percentage)}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* 4. PWG Updates Breakdown Card */}
                  <div className="p-4 rounded-xl bg-white border border-[#CBD5E1] shadow-xs">
                    <div className="flex items-center justify-between mb-3 pb-2 border-b border-[#CBD5E1]">
                      <div className="flex items-center gap-2">
                        <FileSpreadsheet className="w-4 h-4 text-[#2563EB]" />
                        <h4 className="text-xs font-extrabold text-[#1E293B] uppercase tracking-wider">
                          PWG Updates Breakdown
                        </h4>
                      </div>
                      <button
                        onClick={() => setActiveTab('pwgUpdates')}
                        className="text-xs font-bold text-[#2563EB] hover:underline cursor-pointer"
                      >
                        View All
                      </button>
                    </div>
                    <div className="space-y-2.5">
                      {drilldown.pwgUpdatesBreakdown.slice(0, 5).map((item) => (
                        <div key={item.label} className="text-xs">
                          <div className="flex justify-between items-center mb-1">
                            <span className="font-bold text-[#1E293B] truncate pr-2">
                              {item.label}
                            </span>
                            <span className="font-mono text-xs shrink-0 text-[#334155] font-semibold">
                              <strong className="text-[#1E293B] font-extrabold">{item.count.toLocaleString()}</strong> ({item.percentage}%)
                            </span>
                          </div>
                          {/* Progress bar green */}
                          <div className="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden p-0.5">
                            <div
                              className="bg-emerald-600 h-full rounded-full"
                              style={{ width: `${Math.min(100, item.percentage)}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: IN CHARGE DETAILED BREAKDOWN */}
              {activeTab === 'incharge' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-[#1E293B]">
                      Personnel In Charge Distribution
                    </h3>
                    <span className="text-xs text-[#334155] font-mono font-semibold">
                      {drilldown.inchargeBreakdown.length} personnel active in this visual
                    </span>
                  </div>
                  <div className="divide-y divide-[#CBD5E1] bg-white rounded-xl p-3 border border-[#CBD5E1]">
                    {drilldown.inchargeBreakdown.map((item, idx) => (
                      <div key={item.label} className="py-2.5 flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2.5 min-w-0 pr-4">
                          <span className="w-5 h-5 rounded-full bg-blue-100 text-[#2563EB] font-mono text-[10px] font-bold flex items-center justify-center shrink-0">
                            {idx + 1}
                          </span>
                          <span className="font-semibold text-[#1E293B] truncate">
                            {item.label}
                          </span>
                        </div>
                        <div className="flex items-center gap-4 shrink-0 font-mono">
                          <span className="text-[#334155] font-semibold text-[11px]">{item.percentage}%</span>
                          <span className="font-bold text-[#1E293B]">
                            {item.count.toLocaleString()} units
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* TAB 3: PROJECT DETAILED BREAKDOWN */}
              {activeTab === 'project' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-[#1E293B]">
                      Project Developments Distribution
                    </h3>
                    <span className="text-xs text-[#334155] font-mono font-semibold">
                      {drilldown.projectBreakdown.length} projects in this visual
                    </span>
                  </div>
                  <div className="divide-y divide-[#CBD5E1] bg-white rounded-xl p-3 border border-[#CBD5E1]">
                    {drilldown.projectBreakdown.map((item, idx) => (
                      <div key={item.label} className="py-2.5 flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2.5 min-w-0 pr-4">
                          <span className="w-5 h-5 rounded-full bg-blue-100 text-[#2563EB] font-mono text-[10px] font-bold flex items-center justify-center shrink-0">
                            {idx + 1}
                          </span>
                          <span className="font-semibold text-[#1E293B] truncate">
                            {item.label}
                          </span>
                        </div>
                        <div className="flex items-center gap-4 shrink-0 font-mono">
                          <span className="text-[#334155] font-semibold text-[11px]">{item.percentage}%</span>
                          <span className="font-bold text-[#1E293B]">
                            {item.count.toLocaleString()} units
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* TAB 4: KPI REMARKS BREAKDOWN */}
              {activeTab === 'kpiRemarks' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-[#1E293B]">
                      KPI Performance & Turnaround Remarks
                    </h3>
                    <span className="text-xs text-[#334155] font-mono font-semibold">
                      {drilldown.kpiRemarksBreakdown.length} performance categories
                    </span>
                  </div>
                  <div className="divide-y divide-[#CBD5E1] bg-white rounded-xl p-3 border border-[#CBD5E1]">
                    {drilldown.kpiRemarksBreakdown.map((item, idx) => (
                      <div key={item.label} className="py-2.5 flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2.5 min-w-0 pr-4">
                          <span className="w-5 h-5 rounded-full bg-sky-100 text-sky-800 font-mono text-[10px] font-bold flex items-center justify-center shrink-0">
                            {idx + 1}
                          </span>
                          <span className="font-semibold text-[#1E293B] truncate">
                            {item.label}
                          </span>
                        </div>
                        <div className="flex items-center gap-4 shrink-0 font-mono">
                          <span className="text-[#334155] font-semibold text-[11px]">{item.percentage}%</span>
                          <span className="font-bold text-[#1E293B]">
                            {item.count.toLocaleString()} units
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* TAB 5: PWG UPDATES BREAKDOWN */}
              {activeTab === 'pwgUpdates' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-[#1E293B]">
                      PWG Operational Status Updates
                    </h3>
                    <span className="text-xs text-[#334155] font-mono font-semibold">
                      {drilldown.pwgUpdatesBreakdown.length} update categories
                    </span>
                  </div>
                  <div className="divide-y divide-[#CBD5E1] bg-white rounded-xl p-3 border border-[#CBD5E1]">
                    {drilldown.pwgUpdatesBreakdown.map((item, idx) => (
                      <div key={item.label} className="py-2.5 flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2.5 min-w-0 pr-4">
                          <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-800 font-mono text-[10px] font-bold flex items-center justify-center shrink-0">
                            {idx + 1}
                          </span>
                          <span className="font-semibold text-[#1E293B] truncate">
                            {item.label}
                          </span>
                        </div>
                        <div className="flex items-center gap-4 shrink-0 font-mono">
                          <span className="text-[#334155] font-semibold text-[11px]">{item.percentage}%</span>
                          <span className="font-bold text-[#1E293B]">
                            {item.count.toLocaleString()} units
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* TAB 6: SAMPLE UNITS PREVIEW */}
              {activeTab === 'units' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-[#334155] font-semibold">
                      Showing preview of top units matching this visual drill-down:
                    </p>
                    <button
                      onClick={handleExportCSV}
                      disabled={isExporting}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#2563EB] hover:bg-[#1d4ed8] text-white rounded-lg text-xs font-bold transition-colors cursor-pointer shadow-xs"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Export All {drilldown.totalUnits.toLocaleString()}</span>
                    </button>
                  </div>
                  <div className="overflow-x-auto rounded-xl border border-[#CBD5E1] bg-white">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-[#1E293B] text-white font-extrabold border-b-2 border-[#CBD5E1] uppercase text-[11px]">
                        <tr>
                          <th className="py-2.5 px-3 text-white">Unit</th>
                          <th className="py-2.5 px-3 text-white">Project</th>
                          <th className="py-2.5 px-3 text-white">Status</th>
                          <th className="py-2.5 px-3 text-white">In Charge</th>
                          <th className="py-2.5 px-3 text-white">PWG Updates</th>
                          <th className="py-2.5 px-3 text-white">KPI Remarks</th>
                          <th className="py-2.5 px-3 text-right text-white">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#CBD5E1] text-[#1E293B]">
                        {drilldown.sampleRecords.map((r) => {
                          const isEnergized = r.unitsStatus.toUpperCase().includes('ENERGIZED');
                          const isOngoing = r.unitsStatus.toUpperCase().includes('ONGOING');
                          return (
                            <tr key={r.id} className="hover:bg-slate-50 transition-colors">
                              <td className="py-2.5 px-3 font-mono font-extrabold text-[#1E293B]">
                                Blk {r.block} Lot {r.lot}
                              </td>
                              <td className="py-2.5 px-3 max-w-[150px] truncate font-bold text-[#1E293B]" title={r.project}>
                                {r.project}
                              </td>
                              <td className="py-2.5 px-3 whitespace-nowrap">
                                <span className={`px-2 py-0.5 rounded text-[11px] font-bold border ${
                                  isEnergized
                                    ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                                    : isOngoing
                                    ? 'bg-blue-100 text-blue-800 border-blue-300'
                                    : 'bg-slate-100 text-[#1E293B] border-[#CBD5E1]'
                                }`}>
                                  {r.unitsStatus}
                                </span>
                              </td>
                              <td className="py-2.5 px-3 whitespace-nowrap font-semibold text-[#1E293B]">{r.incharge || '-'}</td>
                              <td className="py-2.5 px-3 max-w-[150px] truncate font-semibold text-[#334155]" title={r.pwgUpdates}>
                                {r.pwgUpdates || '-'}
                              </td>
                              <td className="py-2.5 px-3 max-w-[150px] truncate font-semibold text-[#334155]" title={r.kpiRemarks}>
                                {r.kpiRemarks || '-'}
                              </td>
                              <td className="py-2.5 px-3 text-right">
                                <button
                                  onClick={() => onSelectRecord(r)}
                                  className="px-2.5 py-1 bg-slate-100 hover:bg-[#2563EB] hover:text-white text-xs font-bold rounded-md transition-colors cursor-pointer border border-[#CBD5E1] text-[#1E293B]"
                                >
                                  View
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer Bar */}
        <div className="bg-[#F8FAFC] px-3.5 sm:px-5 py-2.5 sm:py-3 border-t border-[#CBD5E1] flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 text-[11px] sm:text-xs shrink-0">
          <div className="text-[#334155] font-semibold text-center sm:text-left">
            Clicking <strong className="text-[#1E293B]">Export CSV</strong> exports only matching visual units.
          </div>
          <div className="flex items-center gap-2 justify-end">
            <button
              onClick={handleApplyToDirectory}
              className="flex-1 sm:flex-none px-3 py-1.5 rounded-lg border border-[#2563EB] text-[#2563EB] hover:bg-blue-50 font-bold transition-colors cursor-pointer text-center"
            >
              Open in Directory
            </button>
            <button
              onClick={onClose}
              className="flex-1 sm:flex-none px-3.5 py-1.5 rounded-lg bg-slate-200 text-[#1E293B] hover:bg-slate-300 font-bold transition-colors cursor-pointer text-center"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
